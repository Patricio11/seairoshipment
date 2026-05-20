# Phase F - Polish

**Status**: DONE
**Date completed**: 2026-05-15
**Builds on**: [Phase E - Admin user-management](phase-e-admin-management.md)
**Tracker**: [TWO_FACTOR_AUTH.md](../../TWO_FACTOR_AUTH.md)

Phases A–E delivered the full 2FA lifecycle (enrol → challenge → enforce → break-glass). Phase F is the polish pass: audit log, confirmation emails, and a copy review across every surface that mentions 2FA.

## What ships

1. **`auth_events` audit table** - append-only, single source of truth for who-did-what-when on 2FA.
2. **`POST /api/auth/events` endpoint** - session-gated client ingest that records the audit row + fans out the appropriate email.
3. **Four email templates** in [lib/email.ts](../../lib/email.ts):
   - `sendTwoFactorEnabledEmail` - user confirmation when 2FA goes on.
   - `sendTwoFactorDisabledEmail(reason)` - user confirmation when 2FA goes off. `reason` switches copy between "self-disabled" and "admin reset".
   - `sendAdminTwoFactorEnabledEmail` - informational alert to a security inbox when an admin enrols.
4. **Admin break-glass endpoint** now writes a `TWO_FACTOR_ADMIN_RESET` audit row (with `actorId` = the admin who did it) and emails the affected user.
5. **Client surfaces wired**: enable wizard, disable dialog, regenerate-codes dialog, and sign-in challenge form all fire-and-forget `logAuthEvent(...)` after a successful Better Auth round-trip.
6. **Copy unification pass** - minor consistency tweak in the settings card (Microsoft Authenticator added alongside 1Password / Google / Authy) so the recommended-apps list matches across status card + wizard.
7. **CLIENT_DASHBOARD.md** - new "Phase 4 - Settings → Security" section explaining what users can now do.

## The audit table

[lib/db/schema/auth-events.ts](../../lib/db/schema/auth-events.ts):

| Column | Notes |
|---|---|
| `id` | PK, `AE-{nanoid(12)}` |
| `userId` | FK → user.id (cascade). The user the event is *about*. |
| `event` | `auth_event_type` enum - closed set of 7 values |
| `actorId` | FK → user.id (set null). Non-null only for `TWO_FACTOR_ADMIN_RESET`, where the acting admin is captured for accountability. |
| `ip` | x-forwarded-for first hop / x-real-ip fallback |
| `userAgent` | truncated to 500 chars |
| `createdAt` | defaultNow |

Two indexes: `auth_events_user_idx` (for "show me my events") and `auth_events_created_idx` (for "show me recent events across the platform").

Event types:

| Value | Trigger |
|---|---|
| `TWO_FACTOR_ENABLED` | wizard step 4 success (`verifyTotp` returns ok) |
| `TWO_FACTOR_DISABLED` | settings → Disable confirms |
| `TWO_FACTOR_VERIFY_SUCCESS` | sign-in challenge form passes (TOTP or backup code) |
| `TWO_FACTOR_VERIFY_FAILED` | sign-in challenge returns an error |
| `TWO_FACTOR_BACKUP_CODES_REGENERATED` | settings → Regenerate confirms |
| `TWO_FACTOR_BACKUP_CODE_USED` | sign-in challenge success, mode = backup code (fires alongside VERIFY_SUCCESS - flagged separately because it's a meaningful "user lost their authenticator" signal) |
| `TWO_FACTOR_ADMIN_RESET` | admin break-glass via `POST /api/admin/users/[id]/disable-2fa`. `actorId` filled. |

The enum is **closed**: adding a new event type needs a schema migration. That's deliberate - it stops the audit table from drifting into "log anything we feel like" mush and keeps the security review surface meaningful.

## The ingest endpoint

[app/api/auth/events/route.ts](../../app/api/auth/events/route.ts):

```
POST /api/auth/events
body: { event: TWO_FACTOR_... }
```

Session-gated. The userId is *always* derived from the session - a caller can never log events against another user. The one exception is `TWO_FACTOR_VERIFY_FAILED`, which can land before a full session exists (the user has a pending-2FA cookie but isn't fully signed in). In that case the endpoint accepts a body-supplied `userId` but resolves it through the DB before recording, so a forged id without a real row is rejected.

Trust model:

- The endpoint records what happened. Better Auth enforced the action server-side; we're audit-only.
- Events are session-bound - no cross-user forgery.
- Emails are best-effort. SMTP failure logs a warning; the audit row is already durable.

### Email fan-out

The endpoint cuts out a separate "post enrol → call email API" round-trip by firing the confirmation email in the same handler:

- `TWO_FACTOR_ENABLED` → `sendTwoFactorEnabledEmail` to the user. If the user is an admin, *also* fires `sendAdminTwoFactorEnabledEmail` to `ADMIN_ALERT_EMAIL` (if configured) so the security team sees admin enrolments land.
- `TWO_FACTOR_DISABLED` → `sendTwoFactorDisabledEmail(reason: "self")` to the user.
- `TWO_FACTOR_VERIFY_SUCCESS` / `_FAILED` / `_BACKUP_CODES_REGENERATED` / `_BACKUP_CODE_USED` → audit-only, no email. (Regen could ship an email later; not worth the noise on every Settings click.)

### The client helper

[lib/auth/events.ts](../../lib/auth/events.ts) exports a single `logAuthEvent(event, extra?)` function. Fire-and-forget, `keepalive: true`. Used like:

```ts
const res = await authClient.twoFactor.verifyTotp({ code })
if (res.error) { ... return }
void logAuthEvent("TWO_FACTOR_ENABLED")  // ← housekeeping after the real action
toast.success("Two-factor authentication enabled")
```

`void` is deliberate - the audit POST is decoupled from the user's flow. If the request fails (offline, blocked), the action they just performed still succeeded.

## Files changed

| File | Change |
|---|---|
| [lib/db/schema/auth-events.ts](../../lib/db/schema/auth-events.ts) | New - table + enum |
| [lib/db/schema/index.ts](../../lib/db/schema/index.ts) | Re-export `./auth-events` |
| [lib/email.ts](../../lib/email.ts) | 3 new exported templates |
| [lib/auth/events.ts](../../lib/auth/events.ts) | New - client helper |
| [app/api/auth/events/route.ts](../../app/api/auth/events/route.ts) | New - ingest endpoint |
| [app/api/admin/users/[id]/disable-2fa/route.ts](../../app/api/admin/users/%5Bid%5D/disable-2fa/route.ts) | Adds the `TWO_FACTOR_ADMIN_RESET` audit row + sends the affected user a "support reset your 2FA" email |
| [components/settings/two-factor-enable-wizard.tsx](../../components/settings/two-factor-enable-wizard.tsx) | `void logAuthEvent("TWO_FACTOR_ENABLED")` after successful `verifyTotp` |
| [components/settings/two-factor-disable-dialog.tsx](../../components/settings/two-factor-disable-dialog.tsx) | `void logAuthEvent("TWO_FACTOR_DISABLED")` after successful `disable` |
| [components/settings/two-factor-backup-codes-dialog.tsx](../../components/settings/two-factor-backup-codes-dialog.tsx) | `void logAuthEvent("TWO_FACTOR_BACKUP_CODES_REGENERATED")` after successful `generateBackupCodes` |
| [components/auth/two-factor-form.tsx](../../components/auth/two-factor-form.tsx) | `VERIFY_SUCCESS` / `VERIFY_FAILED` / `BACKUP_CODE_USED` fired off the challenge form |
| [components/settings/two-factor-status-card.tsx](../../components/settings/two-factor-status-card.tsx) | Recommended-apps list now matches the wizard (added Microsoft Authenticator) |
| [CLIENT_DASHBOARD.md](../../CLIENT_DASHBOARD.md) | New "Phase 4 - Settings → Security" section |

## Required setup

After deploying, run `npm run db:push` once:
- New `auth_events` table + `auth_event_type` enum

Optional env:
- `ADMIN_ALERT_EMAIL` - when set, the security inbox receives a heads-up whenever an admin enrols in 2FA. Unset → that email is skipped silently. All other 2FA emails go to the user themselves and don't depend on this var.

## Future surface - "your security activity"

The audit table is in place but nothing in the UI surfaces it yet. Two natural next-step surfaces:

- **Settings → Security activity panel** - newest-first list of the current user's own auth events ("Enabled 2FA · 2 days ago · Cape Town"). Lets a paranoid user spot a suspicious sign-in.
- **Admin → user-review modal** - same list but for the user being reviewed. Especially useful next to the break-glass button: "this user had 12 failed verifies in the last hour, then asked for a reset" tells a different story than "they enrolled last year and lost their phone".

Both are paint-on-top - the data is already being captured. Left out of this phase to ship the wiring first; surfaces can land in a follow-up when there's a demand signal.

## Decisions

- **Audit table is append-only.** No update/delete paths anywhere in the code. If a row is wrong, that's a story worth preserving - write a new row, don't rewrite history.
- **Closed event enum.** Forces a schema migration to add new event types, which is the right amount of friction for a security audit surface.
- **Client-attested events.** The wizard says "I enabled 2FA" and the server records it. Sounds spoofable but isn't - Better Auth enforced the action server-side; if the user wasn't allowed to enable, `verifyTotp` would have failed and the log call never fires. The endpoint binds events to the *session's* userId, so the worst a malicious client could do is log a *true* event with slightly wrong metadata (their own IP).
- **Failed verifies use the pending-2FA cookie's user.** Better Auth holds the userId in a server-side cookie between password-success and 2FA-pass. We accept a body-supplied userId only for the `VERIFY_FAILED` case and resolve it through the DB before recording - so even a forged id without a real row is rejected.
- **No email on regen.** Backup-code regeneration happens behind the password gate from inside an active session - much less interesting than enable/disable. If we email on every regen we train users to ignore 2FA emails.
- **ADMIN_ALERT_EMAIL is optional.** Missing config logs and continues - never blocks a user's enrolment. Same posture as the rest of the codebase's third-party touches.

## Smoke test (manual)

1. Enable 2FA on a fresh user from Settings. Expect: an `auth_events` row with `event = TWO_FACTOR_ENABLED`, the user's IP + user-agent. The user's inbox receives the "Two-factor authentication is now active" email. If the user is an admin and `ADMIN_ALERT_EMAIL` is set, that inbox also gets the heads-up.
2. Click Regenerate backup codes. Password. Expect: `TWO_FACTOR_BACKUP_CODES_REGENERATED` row. No email.
3. Sign out. Sign in. Type a wrong 6-digit code. Expect: `TWO_FACTOR_VERIFY_FAILED` row.
4. Type the real code. Expect: `TWO_FACTOR_VERIFY_SUCCESS` row.
5. Sign out. Sign in. Switch to "Use a backup code instead". Use one. Expect: BOTH `TWO_FACTOR_VERIFY_SUCCESS` and `TWO_FACTOR_BACKUP_CODE_USED` rows.
6. Disable 2FA from Settings. Expect: `TWO_FACTOR_DISABLED` row, "Two-factor authentication turned off" email lands.
7. As admin, break-glass disable another user's 2FA from `/admin/users` → Review → Disable 2FA. Expect: `TWO_FACTOR_ADMIN_RESET` row with `actorId = admin.id`. Affected user receives the "2FA reset by support" email variant.

## What's next

Phase F closes the planned scope in [TWO_FACTOR_AUTH.md](../../TWO_FACTOR_AUTH.md). The remaining items in that tracker's "Out of scope for v1" list (trust-device, WebAuthn/passkeys, SMS, email OTP) are explicit non-goals - none are blocked, but none are next either.

The single thing worth queuing is the **"your security activity" surface** described above: the data exists, only the panel is missing.
