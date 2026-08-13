/**
 * Client-side helper for posting security events to /api/auth/events.
 * Fire-and-forget - the caller doesn't await this in any place where the
 * audit failing should block the user-facing action.
 */
export async function logAuthEvent(
    event:
        | "TWO_FACTOR_ENABLED"
        | "TWO_FACTOR_DISABLED"
        | "TWO_FACTOR_VERIFY_SUCCESS"
        | "TWO_FACTOR_VERIFY_FAILED"
        | "TWO_FACTOR_BACKUP_CODES_REGENERATED"
        | "TWO_FACTOR_BACKUP_CODE_USED"
        | "PASSWORD_CHANGED",
    extra?: { userId?: string },
): Promise<void> {
    try {
        await fetch("/api/auth/events", {
            method: "POST",
            headers: { "content-type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ event, ...(extra || {}) }),
            keepalive: true,
        });
    } catch {
        // Audit logging is best-effort. The action it accompanies has
        // already succeeded server-side - losing the audit row is acceptable.
    }
}
