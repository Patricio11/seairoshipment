import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { user, account } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

/**
 * Admin creates a staff account (road_manager / road_ops) with a temporary
 * password. Built directly on the user + credential-account rows (via Better
 * Auth's own password hasher) instead of the public signup flow, so:
 *   - no verification email fires (the account is born verified)
 *   - the role is set server-side (role is input:false on the public API)
 *   - vetting is skipped (vettingStatus APPROVED - staff never onboard)
 * The staff member signs in with the temp password and can change it from
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
        const role = body.role as string;

        if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
        }
        if (password.length < 8) {
            return NextResponse.json({ error: "Temporary password must be at least 8 characters" }, { status: 400 });
        }
        if (role !== "road_manager" && role !== "road_ops") {
            return NextResponse.json({ error: "Role must be road_manager or road_ops" }, { status: 400 });
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
            role: role as "road_manager" | "road_ops",
            isVetted: true,
            accountNumber: `SRS-${nanoid(8).toUpperCase()}`,
            vettingStatus: "APPROVED",
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
        console.error("Create staff user error:", err);
        const message = err instanceof Error ? err.message : "Failed to create staff user";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
