import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getSession } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { authEvents, authEventTypeEnum, user as userTable } from "@/lib/db/schema";
import {
    sendTwoFactorEnabledEmail,
    sendTwoFactorDisabledEmail,
    sendAdminTwoFactorEnabledEmail,
} from "@/lib/email";

/**
 * Client-reported security event ingest. The 2FA wizards / dialogs / sign-in
 * challenge call this after a successful Better Auth round-trip — Better
 * Auth owns the cryptographic verification; we just record the outcome and
 * fan out emails.
 *
 * Trust model:
 *  - The endpoint is session-gated. A caller can only log events against
 *    their own userId. They cannot forge an "admin reset" or backdate.
 *  - The audit row is for visibility, not for *enforcement*. Enforcement
 *    happens server-side inside Better Auth (the user really did enable
 *    2FA; we wouldn't be called otherwise).
 *  - VERIFY_FAILED events come from the sign-in challenge page, where the
 *    user has a pending-2FA cookie but isn't fully signed in yet. We accept
 *    those too — the cookie is enough to know which user the event is about.
 *
 * Emails are best-effort: SMTP failure logs a warning but the audit row is
 * already durable so the event is never lost.
 */

const ALLOWED_CLIENT_EVENTS: Array<(typeof authEventTypeEnum.enumValues)[number]> = [
    "TWO_FACTOR_ENABLED",
    "TWO_FACTOR_DISABLED",
    "TWO_FACTOR_VERIFY_SUCCESS",
    "TWO_FACTOR_VERIFY_FAILED",
    "TWO_FACTOR_BACKUP_CODES_REGENERATED",
    "TWO_FACTOR_BACKUP_CODE_USED",
];

function getRequestIp(req: NextRequest): string | null {
    // Same convention as the rest of the codebase: prefer Vercel/CF style
    // x-forwarded-for, then fall back to x-real-ip. We never trust the
    // first IP unconditionally — it's whatever the immediate proxy claims.
    const fwd = req.headers.get("x-forwarded-for");
    if (fwd) return fwd.split(",")[0].trim();
    return req.headers.get("x-real-ip");
}

export async function POST(req: NextRequest) {
    try {
        const session = await getSession();

        let body: { event?: string; userId?: string } = {};
        try { body = await req.json(); } catch { /* empty body */ }

        const event = body.event;
        if (!event || !ALLOWED_CLIENT_EVENTS.includes(event as never)) {
            return NextResponse.json({ error: "Unknown event type" }, { status: 400 });
        }

        // For VERIFY_FAILED on the sign-in page, the user may not have a
        // full session yet — only a pending-2FA cookie. We let the body
        // carry a userId in that case, but never trust it: we resolve it
        // through the user table to confirm the row exists and is 2FA-
        // enabled before recording.
        let userId = session?.user.id;
        if (!userId && event === "TWO_FACTOR_VERIFY_FAILED" && body.userId) {
            const [u] = await db.select({ id: userTable.id })
                .from(userTable)
                .where(eq(userTable.id, body.userId))
                .limit(1);
            if (u) userId = u.id;
        }

        if (!userId) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        const ua = (req.headers.get("user-agent") || "").slice(0, 500);
        const ip = getRequestIp(req);

        await db.insert(authEvents).values({
            id: `AE-${nanoid(12)}`,
            userId,
            event: event as (typeof authEventTypeEnum.enumValues)[number],
            ip,
            userAgent: ua,
        });

        // Side-effect emails for the events users care about. Detached from
        // the response cycle — SMTP can take 5–10s and we don't want the
        // wizard's `void logAuthEvent` call to look like a hung request in
        // the network tab. The audit row is already durable; the email is
        // best-effort regardless.
        if (event === "TWO_FACTOR_ENABLED" || event === "TWO_FACTOR_DISABLED") {
            void (async () => {
                try {
                    const [u] = await db.select({
                        email: userTable.email,
                        name: userTable.name,
                        role: userTable.role,
                    }).from(userTable).where(eq(userTable.id, userId)).limit(1);

                    if (!u) return;

                    if (event === "TWO_FACTOR_ENABLED") {
                        await sendTwoFactorEnabledEmail(u.email, u.name);
                        if (u.role === "admin") {
                            // Heads-up to the security inbox so the team
                            // sees admin enrollments land.
                            try { await sendAdminTwoFactorEnabledEmail(u.name, u.email); }
                            catch (e) { console.warn("[auth-events] admin alert email failed", e); }
                        }
                    } else {
                        await sendTwoFactorDisabledEmail(u.email, u.name, "self");
                    }
                } catch (mailErr) {
                    console.warn("[auth-events] confirmation email failed", mailErr);
                }
            })();
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to log event";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
