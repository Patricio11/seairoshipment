import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { user, account } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

const CREATABLE_ROLES = ["client", "road_manager", "road_ops"] as const;
type CreatableRole = (typeof CREATABLE_ROLES)[number];
const PAYMENT_TERMS = ["SPLIT_60_40", "NET_30_STATEMENT", "NET_7_DELIVERY"] as const;

/**
 * Admin creates a ready-to-use account with a temporary password - either a
 * customer (with company + payment terms) or road staff (road_manager /
 * road_ops). Built directly on the user + credential-account rows (via Better
 * Auth's own password hasher) instead of the public signup flow, so:
 *   - no verification email fires (the account is born verified)
 *   - the role is set server-side (role is input:false on the public API)
 *   - vetting/onboarding is skipped (vettingStatus APPROVED)
 * The person signs in with the temp password and changes it from
 * Settings → Security.
 */
export async function POST(request: NextRequest) {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const body = await request.json();
        const name = String(body.name || "").trim();
        const email = String(body.email || "").trim().toLowerCase();
        const password = String(body.password || "");
        const role = body.role as CreatableRole;
        const companyName = String(body.companyName || "").trim();
        const paymentTerms = body.paymentTerms as (typeof PAYMENT_TERMS)[number] | undefined;

        if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
        }
        if (password.length < 8) {
            return NextResponse.json({ error: "Temporary password must be at least 8 characters" }, { status: 400 });
        }
        if (!CREATABLE_ROLES.includes(role)) {
            return NextResponse.json({ error: "Role must be client, road_manager or road_ops" }, { status: 400 });
        }
        if (role === "client" && paymentTerms && !PAYMENT_TERMS.includes(paymentTerms)) {
            return NextResponse.json({ error: "Invalid payment terms" }, { status: 400 });
        }

        const [existing] = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1);
        if (existing) {
            return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
        }

        // Better Auth's scrypt hasher - same format its sign-in flow verifies
        const ctx = await auth.$context;
        const hashedPassword = await ctx.password.hash(password);

        const userId = nanoid(32);
        const now = new Date();

        await db.insert(user).values({
            id: userId,
            name,
            email,
            emailVerified: true,
            createdAt: now,
            updatedAt: now,
            role,
            isVetted: true,
            accountNumber: `SRS-${nanoid(8).toUpperCase()}`,
            companyName: role === "client" && companyName ? companyName : null,
            vettingStatus: "APPROVED",
            ...(role === "client" && paymentTerms ? { paymentTerms } : {}),
        });

        await db.insert(account).values({
            id: nanoid(32),
            accountId: userId,
            providerId: "credential",
            userId,
            password: hashedPassword,
            createdAt: now,
            updatedAt: now,
        });

        return NextResponse.json({ id: userId, email, role });
    } catch (err) {
        console.error("Create user error:", err);
        const message = err instanceof Error ? err.message : "Failed to create user";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
