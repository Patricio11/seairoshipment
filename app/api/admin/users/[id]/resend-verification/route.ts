import { NextRequest, NextResponse } from "next/server";
import { auth, requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const baseURL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * Admin-triggered resend of the verification email. Useful when a client
 * complains they never got the original (or it landed in spam they later
 * cleared). The email is taken from the target user row, not the body,
 * so admin can't accidentally fire it at the wrong address.
 */
export async function PATCH(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const { id } = await params;

        const [target] = await db.select().from(user).where(eq(user.id, id)).limit(1);
        if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
        if (target.role !== "client") return NextResponse.json({ error: "Only client accounts use email verification" }, { status: 400 });
        if (target.emailVerified) return NextResponse.json({ error: "User has already verified their email" }, { status: 400 });

        await auth.api.sendVerificationEmail({
            body: {
                email: target.email,
                callbackURL: `${baseURL}/auth/verified`,
            },
        });

        return NextResponse.json({ success: true, email: target.email });
    } catch (err) {
        console.error("[admin:resend-verification]", err);
        const message = err instanceof Error ? err.message : "Failed to resend verification email";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
