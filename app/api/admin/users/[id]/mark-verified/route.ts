import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { user, clientNotifications } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

/**
 * Admin break-glass: marks a user's email as verified without them clicking
 * the verification link.
 *
 * Use case — the verification email isn't working for a known-good signup:
 * Outlook Safe Links consumed the token, the link expired, the user lost
 * the email, etc. Support verifies their identity out-of-band (the user
 * was the one who submitted the signup form, or you've spoken to them on
 * the phone), then an admin clicks "Mark as verified" on the user's review
 * row.
 *
 * Constraints:
 *  - Caller must be admin.
 *  - Target must currently be in EMAIL_PENDING. Already-verified users get
 *    a no-op rejection (cleaner error than silent success).
 *  - Target must be a client. Admins go through the same flow as everyone
 *    else and shouldn't be promoted by another admin — they can re-verify
 *    via the regular email link if they get stuck.
 *
 * Side effects:
 *  - Sets emailVerified = true.
 *  - Advances vettingStatus EMAIL_PENDING → ONBOARDING_PENDING, mirroring
 *    what a normal email-verify would have done.
 *  - Fires an in-app notification so the user sees the state change
 *    without us needing to email them again.
 *
 * Auto-sign-in is deliberately NOT triggered — only the user clicking
 * their own verification link sets up an auto-session. An admin manually
 * verifying shouldn't be able to silently land in someone else's session.
 * The user signs in normally from here.
 */
export async function PATCH(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const auth = await requireAdmin();
        if (auth.error) return auth.error;

        const { id } = await params;

        const [target] = await db.select().from(user).where(eq(user.id, id)).limit(1);
        if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
        if (target.role !== "client") {
            return NextResponse.json(
                { error: "Only client accounts can be manually verified" },
                { status: 400 },
            );
        }
        if (target.emailVerified) {
            return NextResponse.json(
                { error: "User is already verified" },
                { status: 400 },
            );
        }

        const nextVettingStatus = target.vettingStatus === "EMAIL_PENDING"
            ? "ONBOARDING_PENDING" as const
            : target.vettingStatus;

        await db.update(user)
            .set({
                emailVerified: true,
                vettingStatus: nextVettingStatus,
                updatedAt: new Date(),
            })
            .where(eq(user.id, id));

        await db.insert(clientNotifications).values({
            id: `CNT-${nanoid(10)}`,
            userId: id,
            type: "GENERAL",
            title: "Email verified by support",
            message: "Our team has marked your email as verified. Sign in to continue with onboarding.",
            isRead: false,
        });

        return NextResponse.json({ success: true });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to mark verified";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
