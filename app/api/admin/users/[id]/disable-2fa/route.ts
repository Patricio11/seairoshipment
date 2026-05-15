import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { user, twoFactor, clientNotifications } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

/**
 * Admin break-glass: disables 2FA on a target user account.
 *
 * Use case — the user lost their authenticator AND their backup codes and
 * can't sign in. Support verifies their identity out-of-band (phone, video
 * call, government ID, whatever the runbook says), then an admin clicks
 * "Disable 2FA" on the user's vetting row.
 *
 * Constraints:
 *  - Caller must be an admin (requireAdmin).
 *  - Target must be a client. An admin can't disable another admin's 2FA
 *    from this UI — admins manage their own 2FA from /dashboard/settings.
 *    This stops a compromised admin account from being used to weaken every
 *    other admin in one move.
 *  - Self-disable through this endpoint is rejected for the same reason.
 *    Use Settings instead.
 *
 * What it does:
 *  - Sets `user.twoFactorEnabled = false`.
 *  - Deletes the `twoFactor` row (secret + backup codes).
 *  - Fires an in-app notification to the user so they know support touched
 *    their security setting.
 *
 * Audit log row gets added in Phase F together with the rest of the
 * auth-event instrumentation.
 */
export async function POST(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const { session, error } = await requireAdmin();
        if (error) return error;

        const { id } = await params;

        if (id === session.user.id) {
            return NextResponse.json(
                { error: "Use Settings → Security to disable your own 2FA" },
                { status: 400 },
            );
        }

        const [target] = await db.select().from(user).where(eq(user.id, id)).limit(1);
        if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
        if (target.role !== "client") {
            return NextResponse.json(
                { error: "Only client 2FA can be reset from this UI" },
                { status: 400 },
            );
        }
        if (!target.twoFactorEnabled) {
            return NextResponse.json(
                { error: "User does not have 2FA enabled" },
                { status: 400 },
            );
        }

        await db.update(user)
            .set({ twoFactorEnabled: false, updatedAt: new Date() })
            .where(eq(user.id, id));

        // Best-effort cleanup of the secret/backup-codes row. Cascade FK
        // means it'll go with the user if they're ever deleted anyway, but
        // we wipe it explicitly so a future re-enrollment starts with a
        // fresh secret.
        await db.delete(twoFactor).where(eq(twoFactor.userId, id));

        await db.insert(clientNotifications).values({
            id: `CNT-${nanoid(10)}`,
            userId: id,
            type: "GENERAL",
            title: "Two-factor authentication reset",
            message: "Support has reset your two-factor authentication at your request. Sign in with your password, then re-enable 2FA from Settings → Security.",
            isRead: false,
        });

        return NextResponse.json({ success: true });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to disable 2FA";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
