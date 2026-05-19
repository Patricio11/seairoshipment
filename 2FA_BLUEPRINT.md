# Two-Factor Authentication — Implementation Blueprint

A portable, stack-aware design + implementation guide for adding TOTP-based 2FA to a web app. Distilled from the Seairo Cargo rollout (6 phases, ~1.5k lines, end-to-end audit log + emails + admin enforcement).

**Designed for**: Next.js App Router · Better Auth · Drizzle ORM · Postgres · Tailwind. Adaptable to other stacks — the decisions and traps generalise; the file paths don't.

---

## What you get

- TOTP enrolment via authenticator app (Google Authenticator, 1Password, Authy, Microsoft Authenticator).
- 10 single-use backup codes for recovery.
- Sign-in challenge page that gates the session after a correct password.
- Optional **forced enrolment** for admin-role accounts.
- Break-glass admin endpoint for lost-phone-and-codes support cases.
- Append-only `auth_events` audit log.
- Confirmation emails on enable / disable / admin-reset (+ optional security-inbox alert on admin enrolment).

What you don't get (intentional non-goals — call these out to stakeholders early):
- WebAuthn / passkeys.
- SMS OTP (NIST-deprecated, SIM-swap risk).
- Email OTP as a primary factor.
- "Trust this device for 30 days."
- Re-prompt 2FA per sensitive action.

These can be follow-ups. Shipping without them is the right v1 call — backup codes cover recovery, and password+TOTP is the meaningful security upgrade.

---

## Locked decisions (cheat sheet)

Argue these once, write them down, don't relitigate.

| Question | Pick | Why |
|---|---|---|
| Second factor | **TOTP** | Authenticator-app standard; no SMS/SIM-swap surface |
| Recovery | **Backup codes only** | 10 single-use, shown once at setup; lost → admin break-glass |
| Admin enforcement | **Forced** | First login after this ships forces enrolment |
| Trust device | **Deferred** | Re-prompt every login in v1 |
| Plugin | **Better Auth `twoFactor`** | Owns crypto, schema, sign-in interception |
| Settings location | `/dashboard/settings` (Security tab) | Reuse existing settings shell |
| Challenge page | `/auth/2fa` | Server shell, client form, role-agnostic |
| Forced-enrol page | `/auth/setup-2fa` | Role-agnostic to avoid redirect loops |
| Audit log | Append-only, closed enum | Forces schema changes for new event types |
| Email on regenerate | **No** | Don't train users to ignore 2FA emails |

---

## Architecture at a glance

```
LOGIN FLOW
[1] /auth/sign-in (or auth panel)   email + password
     ↓ correct?
       no 2FA enabled  ────────→ /dashboard (or /admin)
       2FA enabled
         ↓
[2] /auth/2fa                       6-digit TOTP OR backup code
     ↓ verified?
       /dashboard (or /admin)

ADMIN FORCED FLOW (one-time)
GET /admin/*  → layout checks twoFactorEnabled in DB
                ↓ false
                /auth/setup-2fa  ← forced wizard, X/Esc/outside-click blocked
                ↓ enrolled
                /admin

SETTINGS
/dashboard/settings (Security tab)
  ├─ status: Off | Enabled
  ├─ Enable wizard (password → QR + setup key → verify → save codes)
  ├─ Disable (password gate)
  └─ Regenerate backup codes (password gate)

AUDIT + EMAIL FAN-OUT
Client wizard / dialog  ─[void logAuthEvent(...)]─→  POST /api/auth/events
                                                         ↓ insert auth_events row
                                                         ↓ fire confirmation email
                                                         ↓ (if admin) heads-up to security inbox

Admin break-glass  ──→  POST /api/admin/users/[id]/disable-2fa
                          ↓ flip user flag + wipe twoFactor row
                          ↓ in-app notification to affected user
                          ↓ TWO_FACTOR_ADMIN_RESET audit row (actorId = admin)
                          ↓ "support reset your 2FA" email
```

---

## Phased rollout

| Phase | Goal | Time |
|---|---|---|
| **A** | Foundation — wire plugin, schema, client SDK | ~1h |
| **B** | Settings → Security UI (4 components + 4-step wizard) | ~4h |
| **C** | Login challenge page + sign-in interception | ~2h |
| **D** | Admin forced enrolment | ~2h |
| **E** | Admin user-management (chip + break-glass) | ~2h |
| **F** | Audit log + emails + copy review | ~3h |

A → B → C is the critical path for a working v1. D blocks rollout for admins. E + F polish.

---

## Phase A — Foundation

### Server (`lib/auth/server.ts`)

```ts
import { betterAuth } from "better-auth";
import { twoFactor } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg",
        schema: {
            user: schema.user,
            session: schema.session,
            account: schema.account,
            verification: schema.verification,
            twoFactor: schema.twoFactor,   // ← add this
        },
    }),
    plugins: [
        twoFactor({
            issuer: "Your App Name",        // shown inside the user's authenticator app
            totpOptions: { digits: 6, period: 30 },
        }),
    ],
});
```

### Client (`lib/auth/client.ts`)

```ts
import { createAuthClient } from "better-auth/react";
import { twoFactorClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    plugins: [twoFactorClient()],
});
```

### Schema additions

```ts
// lib/db/schema/users.ts — extend the existing user table
export const user = pgTable("user", {
    // ... existing columns
    twoFactorEnabled: boolean("twoFactorEnabled").default(false),
});

// Better Auth twoFactor plugin storage: one row per enrolled user.
// Plugin owns reads/writes; secret + backupCodes never echo over the wire.
export const twoFactor = pgTable("twoFactor", {
    id: text("id").primaryKey(),
    userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
    secret: text("secret").notNull(),
    backupCodes: text("backupCodes").notNull(),
});
```

Run your migration tool (`drizzle-kit push`, `prisma migrate`, etc.).

### Endpoints now live (no UI yet)

| Endpoint | Purpose |
|---|---|
| `POST /api/auth/two-factor/enable` | Returns `{ totpURI, backupCodes }`. Doesn't flip `twoFactorEnabled` until step-3 verify. |
| `POST /api/auth/two-factor/verify-totp` | First success flips the flag. |
| `POST /api/auth/two-factor/verify-backup-code` | Same flow, consumes one code. |
| `POST /api/auth/two-factor/disable` | Wipes the secret + backup codes. |
| `POST /api/auth/two-factor/generate-backup-codes` | Fresh 10-code set; invalidates the old set. |
| `POST /api/auth/two-factor/get-totp-uri` | Re-fetch the `otpauth://` URI for an enrolled user. |

**Sanity test**: from DevTools, `fetch("/api/auth/two-factor/enable", { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: "wrong" }) })` returns 401. Proves the endpoint is mounted and password-gated.

---

## Phase B — Settings UI

Four components — keep them separate, they cover distinct user moments.

### 1. Status card

```
Off state:
  ┌─────────────────────────────────────────┐
  │  [RECOMMENDED]                          │
  │  Secure your account                    │
  │  Add a code from an authenticator app   │
  │  ...                                    │
  │  [ Enable 2FA ]                         │
  └─────────────────────────────────────────┘

On state:
  ┌─────────────────────────────────────────┐
  │  [ACTIVE & SECURE]                      │
  │  Two-factor authentication is on        │
  │  ...                                    │
  │  [ Regenerate codes ] [ Disable ]       │
  └─────────────────────────────────────────┘
```

Reads `twoFactorEnabled` from `useSession()`. After enable/disable, `refetch()` updates the card.

### 2. Enable wizard — 4 steps in one Dialog

| Step | What | Server call |
|---|---|---|
| 1. Password | Re-confirm password | none yet |
| 2. Scan | QR code + setup key (chunked) | `authClient.twoFactor.enable({ password })` |
| 3. Verify | 6-digit input | `authClient.twoFactor.verifyTotp({ code })` |
| 4. Codes | 10 codes + Download .txt + Copy all + "I've saved these" checkbox | none |

**QR rendering**: use [`qrcode.react`](https://www.npmjs.com/package/qrcode.react) (~115KB unpacked, SVG, no canvas). Pass `totpURI` as the `value`.

**Setup-key fallback**: extract the `secret=` param from the `otpauth://` URI, chunk into 4-char groups for readability, copy-able. Some users can't scan (kiosk machines, screen readers).

**State wipe on close**: 200ms delay so close-animation completes, then reset all state. Prevents a stale TOTP URI leaking into a re-open.

### 3. Disable dialog

Password gate. Calls `authClient.twoFactor.disable({ password })`. Red warning panel — turning off 2FA is a security downgrade.

The plugin's `disable` endpoint only takes a password. That's enough — the password gate defeats walk-up attackers; a stolen authenticator alone can't disable.

### 4. Regenerate-codes dialog

Two phases: password gate → new codes. `authClient.twoFactor.generateBackupCodes({ password })`. Old codes invalidate immediately. Same UX as wizard step 4.

### Backup codes file format

```
Your App Name — Two-Factor Backup Codes
Generated: 2026-05-15T10:32:11.000Z

Each code can be used once. Treat them like passwords.

01.  K7H2-9PXM
02.  3FQR-T8YN
...
```

---

## Phase C — Login challenge

### Sign-in interception

```ts
// In your sign-in handler
await authClient.signIn.email({ email, password }, {
    onSuccess: async (ctx) => {
        const data = ctx.data as { twoFactorRedirect?: boolean; user?: { role?: string } };
        if (data?.twoFactorRedirect) {
            // Password OK, but session is held in a pending-2FA cookie.
            // No toast, no role-redirect — user hasn't fully signed in yet.
            router.push("/auth/2fa");
            return;
        }
        // Normal path — full session was issued
        toast.success("Welcome back!");
        router.push(data?.user?.role === "admin" ? "/admin" : "/dashboard");
    },
    onError: (ctx) => toast.error(ctx.error.message),
});
```

### `/auth/2fa` page

Server-rendered shell. **No auth gating on the page itself** — Better Auth holds the pending session in a cookie, the verify endpoint returns a clear error if it's missing. Adding a second gate creates two sources of truth.

### `<TwoFactorForm>` — two modes

- **TOTP** (default): `inputMode="numeric"`, 6-digit max, `autoComplete="one-time-code"` so password managers offer the latest code. Calls `verifyTotp`.
- **Backup code**: free-text 20-char max. Calls `verifyBackupCode`. Toggle link below the form ("Use a backup code instead").

On success: `router.push(next)` then `router.refresh()` so Server Components re-read the now-real session.

### Open-redirect guard

```ts
function safeNext(next: string | null): string {
    if (!next) return "/dashboard";
    if (!next.startsWith("/")) return "/dashboard";       // absolute URLs
    if (next.startsWith("//")) return "/dashboard";       // protocol-relative
    return next;
}
```

Defeats `?next=https://evil.example.com` and `?next=//evil.example.com`. Path-only same-origin still works.

### Rate limiting

Better Auth's `twoFactor` plugin rate-limits `verify-totp` and `verify-backup-code` automatically (3 attempts / 10s window by default). No extra code on your side.

---

## Phase D — Admin forced enrolment

### The redirect-loop trap

**Naive design**: "redirect unenrolled admins to `/dashboard/settings?force=1`". Don't do this if your dashboard layout requires a non-admin role:

```
GET /admin              → admin layout: twoFactorEnabled=false → redirect /dashboard/settings?force=1
GET /dashboard/settings → dashboard layout: requireRole("client") → redirect /admin
GET /admin              → ...infinite loop
```

**Fix**: a dedicated **role-agnostic** page at `/auth/setup-2fa`. Outside both `/admin/*` and `/dashboard/*` so neither layout's role gate fires.

### Admin layout gate

```ts
// app/admin/layout.tsx
const session = await requireRole(["admin"]);

const [row] = await db
    .select({ twoFactorEnabled: userTable.twoFactorEnabled })
    .from(userTable)
    .where(eq(userTable.id, session.user.id))
    .limit(1);

if (!row?.twoFactorEnabled) {
    redirect("/auth/setup-2fa");
}
```

**Read the DB, not `session.user.twoFactorEnabled`.** Session cookies cache (5 min in typical configs). An admin enrolling in one tab shouldn't be stuck on setup in another tab for the cache window. The cost is one indexed PK lookup per `/admin/*` request — negligible.

### `/auth/setup-2fa` page

```ts
const session = await getSession();
if (!session) redirect("/");

const [row] = await db.select({ twoFactorEnabled: userTable.twoFactorEnabled })
    .from(userTable).where(eq(userTable.id, session.user.id)).limit(1);

if (row?.twoFactorEnabled) {
    // Already enrolled — nothing to do here
    redirect(session.user.role === "admin" ? "/admin" : "/dashboard");
}

return <ForcedTwoFactorSetup role={...} />;
```

### `<ForcedTwoFactorSetup>`

Full-page chrome (gradient background + title + explainer) wrapping the same enable wizard from Phase B, opened with two props:

```ts
<TwoFactorEnableWizard
    open
    onOpenChange={(next) => { if (!next) return /* refuse close */; }}
    forceEnroll
    forceEnrollRedirectTo={role === "admin" ? "/admin" : "/dashboard"}
    onEnabled={() => router.refresh()}
/>
```

The wizard's `forceEnroll` mode:
- Hides the X button
- Suppresses `onInteractOutside` and `onEscapeKeyDown` (Radix Dialog) until step 4
- Shows the "Required for admins" amber banner with a **"Sign out instead"** escape hatch
- After step 4, pushes to `forceEnrollRedirectTo` + `router.refresh()` so the gate sees the new state

---

## Phase E — Admin user-management

### Visibility — chip on the user list

Add `twoFactorEnabled` to your admin user-listing API. Render an inline pill next to each user's email:

```
Off:  [ ◐ 2FA OFF ]   (slate)
On:   [ ✓ 2FA ]       (emerald)
```

Keep it tiny (`text-[9px]`) — it lives in dense table density.

### Break-glass — `POST /api/admin/users/[id]/disable-2fa`

Three guards before the mutation:

```ts
if (id === session.user.id)
    return 400 "Use Settings to disable your own 2FA"
if (target.role !== "client")
    return 400 "Only client 2FA can be reset from this UI"
if (!target.twoFactorEnabled)
    return 400 "User does not have 2FA enabled"
```

Why each guard matters:

- **Self-disable rejected**: the regular Settings flow re-prompts the password before disabling. This endpoint doesn't (it trusts the admin session). An unlocked admin machine + a forged request on the admin's own id would skip the password gate. Forcing self-disable through Settings keeps that gate intact.
- **Admin → admin rejected**: stops a single compromised admin account from weakening every other admin's 2FA in one move.
- **No-op rejected**: cleaner error than a silent success.

Side effects in order:
1. `update user set twoFactorEnabled = false`
2. `delete from twoFactor where userId = ...` (cascade FK would catch it on user delete, but wiping explicitly means re-enrolment starts with a fresh secret)
3. Insert in-app notification ("Support has reset your two-factor authentication...")
4. Insert `TWO_FACTOR_ADMIN_RESET` audit row with `actorId = session.user.id`
5. Send "2FA reset by support" email (best-effort, SMTP failure doesn't undo)

### The Disable 2FA UI

Only visible when the target user has 2FA enabled. Confirmation card with explicit copy:

> Verify their identity out-of-band first. After this, they'll sign in with password only — recommend they re-enable 2FA from Settings → Security immediately. They'll get an in-app notification confirming the reset.

Place the button **separate** from the workflow actions (Approve/Reject/etc.) — break-glass is a destructive operation, not part of the normal vetting flow.

---

## Phase F — Audit log, emails, copy review

### `auth_events` table

```ts
export const authEventTypeEnum = pgEnum("auth_event_type", [
    "TWO_FACTOR_ENABLED",
    "TWO_FACTOR_DISABLED",
    "TWO_FACTOR_VERIFY_SUCCESS",
    "TWO_FACTOR_VERIFY_FAILED",
    "TWO_FACTOR_BACKUP_CODES_REGENERATED",
    "TWO_FACTOR_BACKUP_CODE_USED",
    "TWO_FACTOR_ADMIN_RESET",
]);

export const authEvents = pgTable("auth_events", {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    event: authEventTypeEnum("event").notNull(),
    actorId: text("actor_id").references(() => user.id, { onDelete: "set null" }),
    ip: text("ip"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
    userIdx: index("auth_events_user_idx").on(t.userId),
    createdAtIdx: index("auth_events_created_idx").on(t.createdAt),
}));
```

**Closed enum**: adding a new event type needs a migration. This is the right amount of friction — it stops the table drifting into "log anything" mush.

**`actorId`**: non-null only for `TWO_FACTOR_ADMIN_RESET`, where it captures the acting admin. Everywhere else, the userId is *both* the subject and the actor.

**Append-only**: no update/delete paths anywhere in the code. If a row is wrong, that's a story worth preserving — write a new row, don't rewrite history.

### Ingest endpoint — `POST /api/auth/events`

Client-attested. Session-gated. Records the row + fans out the email.

```ts
// Trust model:
// - userId always comes from the session, not the body — no cross-user forgery.
// - VERIFY_FAILED is the one exception: the user has a pending-2FA cookie
//   but no full session yet. Accept a body-supplied userId for that case,
//   validate it exists in the user table before recording.
// - Better Auth enforced the action server-side; we're audit-only.
// - Emails are best-effort. SMTP failure logs; the audit row is durable.
```

### Client helper

```ts
// lib/auth/events.ts — fire-and-forget
export async function logAuthEvent(event: AuthEventType): Promise<void> {
    try {
        await fetch("/api/auth/events", {
            method: "POST",
            headers: { "content-type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ event }),
            keepalive: true,
        });
    } catch { /* audit is best-effort */ }
}
```

Used like:

```ts
const res = await authClient.twoFactor.verifyTotp({ code });
if (res.error) {
    void logAuthEvent("TWO_FACTOR_VERIFY_FAILED");
    return;
}
void logAuthEvent("TWO_FACTOR_VERIFY_SUCCESS");
if (mode === "backup") void logAuthEvent("TWO_FACTOR_BACKUP_CODE_USED");
```

`void` is deliberate — the audit POST runs alongside the user's flow, doesn't block it.

### Email templates — three of them

1. **`sendTwoFactorEnabledEmail(to, name)`** — emerald accent. Recovery hint ("Misplaced your codes? Go to Settings → Regenerate"). Red "Wasn't you?" callout linking to support.

2. **`sendTwoFactorDisabledEmail(to, name, reason: "self" | "admin-reset")`** — amber accent. Copy switches:
   - `self`: "2FA is off ... we recommend re-enabling" + "Wasn't you?" callout
   - `admin-reset`: "Support reset your 2FA ... re-enable immediately"

3. **`sendAdminTwoFactorEnabledEmail(adminName, adminEmail)`** — heads-up to `ADMIN_ALERT_EMAIL` (env var, optional). Skipped silently if unset. **Don't send to the admin themselves** — they already got their own enrolment email; this is for the security team's inbox.

### Email fan-out rules

| Event | Email recipient | Template |
|---|---|---|
| `TWO_FACTOR_ENABLED` | user | enabled |
| `TWO_FACTOR_ENABLED` (admin role) | security inbox (additional) | admin-enrolled heads-up |
| `TWO_FACTOR_DISABLED` (self) | user | disabled (self) |
| `TWO_FACTOR_ADMIN_RESET` | user | disabled (admin-reset) |
| `*_REGENERATED` / `*_VERIFY_*` / `BACKUP_CODE_USED` | none | audit-only |

**No email on regen.** If you email on every Settings click, users learn to ignore 2FA emails — the opposite of what you want.

### Copy review checklist

One pass for consistency across every surface. Mistakes I made and corrected:

- **Recommended-apps list** mismatched: status card said "1Password, Google, Authy"; wizard said the same + Microsoft Authenticator. Unify both.
- **"Two-factor" vs "2FA"**: pick one for body copy ("two-factor authentication"), use "2FA" only in tight UI (chips, banner tags, settings tab).
- **Disable confirm copy** should mention the email — "We'll email you confirming the change" — so the user expects it.
- **Forced banner** should offer the escape hatch ("Sign out instead") explicitly. Don't trap users.

---

## Files / surface area (for a Next.js App Router project)

```
lib/
  auth/
    server.ts              ← + twoFactor plugin, + schema mapping
    client.ts              ← + twoFactorClient plugin
    events.ts              ← NEW — logAuthEvent helper
  db/schema/
    users.ts               ← + twoFactorEnabled, + twoFactor table
    auth-events.ts         ← NEW — audit table + enum
    index.ts               ← export ./auth-events
  email.ts                 ← + 3 templates

app/
  admin/
    layout.tsx             ← + DB-backed twoFactorEnabled gate
  auth/
    2fa/page.tsx           ← NEW — challenge page
    setup-2fa/page.tsx     ← NEW — role-agnostic forced enrolment
  api/
    auth/events/route.ts   ← NEW — ingest + email fan-out
    admin/users/[id]/disable-2fa/route.ts  ← NEW — break-glass

components/
  auth/
    two-factor-form.tsx           ← NEW — challenge form
    forced-two-factor-setup.tsx   ← NEW — full-page wrapper for setup-2fa
  settings/
    two-factor-status-card.tsx           ← NEW
    two-factor-enable-wizard.tsx         ← NEW (the big one)
    two-factor-disable-dialog.tsx        ← NEW
    two-factor-backup-codes-dialog.tsx   ← NEW
  admin/
    user-vetting-table.tsx        ← + 2FA chip
    user-review-modal.tsx         ← + Disable 2FA action
```

---

## Env vars

| Var | Required? | Purpose |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | yes | Used by Better Auth as baseURL |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | yes for emails | Confirmation emails fan out from `POST /api/auth/events` |
| `SMTP_FROM_NAME` | optional | Display name on the From header (default: app name) |
| `ADMIN_ALERT_EMAIL` | optional | Security inbox for admin-enrolment heads-up. Unset → that email is silently skipped. |
| `SUPPORT_EMAIL` | recommended | Linked from the "Wasn't you?" callout in disable/enable emails |

---

## Risk areas — read these before shipping

### 1. Locked-out admins

If you forget the sign-out escape hatch on the forced-enrol page, an admin who lost their authenticator AND signed out everywhere will be stuck. Belt-and-braces:

- "Sign out instead" link in the forced banner (always reachable, even mid-wizard)
- Admin break-glass endpoint works on *any* admin (assuming you have another admin available)
- Document the "create a new admin from DB" runbook for the worst case

### 2. Schema naming collisions

Better Auth's twoFactor table is named `twoFactor` (camelCase) in your Drizzle schema. If your shop's convention is `two_factor`, the adapter's model-name mapping won't auto-resolve — you'd see "table not found" at first verify. Explicit mapping in the drizzle adapter `schema: { twoFactor: ... }` fixes it.

### 3. Backup-code UX

The "I've saved these codes" checkbox before Done. Don't skip it — without the friction, a non-trivial percentage of users dismiss the dialog and lose the codes. The toast + email are not enough; the gate is what makes them pause.

### 4. TOTP clock drift

If your server clock is more than ±30 seconds off, valid codes will fail. Better Auth's TOTP impl tolerates ±1 step by default (±30s). NTP-synced production servers are fine; long-running Dockerfile snapshots without a date-sync entrypoint can drift.

### 5. Phishing resistance — TOTP doesn't have it

A real-time phishing site can ask for the password AND the current TOTP, then replay both upstream within the 30s window. This is a known limitation of TOTP — passkeys/WebAuthn solve it via origin-binding but you've explicitly deferred those. Make sure stakeholders understand TOTP raises the bar (against credential-stuffing and replay) but isn't phishing-proof.

### 6. Rate limiting on verify

Better Auth's plugin handles this. If you're rolling your own auth, you must add it — without rate limiting, an attacker with a stolen password just brute-forces the 6-digit code (max 10^6 attempts).

### 7. Empty `?next=` producer

In our build the auth panel doesn't track an intended URL, so 2FA always lands on `/dashboard` and role-routing bounces admins to `/admin`. If your flow has a "you clicked a deep link while logged out" path, plumb the target URL through as `?next=...` and let `safeNext()` validate it.

---

## Smoke-test script (manual, end-to-end)

After every phase landing in code, walk through this:

1. **Fresh client signup → enrol 2FA**
   - Settings → Security → Enable 2FA
   - Scan with 1Password
   - Type code → Verify
   - Download codes, tick checkbox, Done
   - Confirm: `user.twoFactorEnabled = true`, `twoFactor` row exists, audit row `TWO_FACTOR_ENABLED`, "now active" email lands

2. **Sign-in flow with 2FA**
   - Sign out, sign in
   - Bounced to `/auth/2fa`
   - Wrong code 3× → rate-limit error
   - Correct code → lands on /dashboard
   - Audit rows: `VERIFY_FAILED` × 3, `VERIFY_SUCCESS`

3. **Backup code branch**
   - Sign out, sign in, "Use a backup code instead"
   - Paste one → lands on /dashboard
   - Audit rows: `VERIFY_SUCCESS` AND `BACKUP_CODE_USED`

4. **Regenerate**
   - Settings → Security → Regenerate backup codes → password → new 10
   - Audit row: `BACKUP_CODES_REGENERATED`. No email.
   - Try an old code at next sign-in → rejected

5. **Disable (self)**
   - Settings → Security → Disable → password → confirmed
   - Audit row: `DISABLED`, "turned off" email lands

6. **Admin forced enrolment**
   - Admin without 2FA → `/admin` → bounced to `/auth/setup-2fa`
   - X / Esc / outside-click all blocked
   - Click "Sign out instead" → signed out, lands on /
   - Sign back in → bounced again → walk through wizard → after Done lands on /admin

7. **Admin break-glass**
   - As admin, /admin/users → Review a 2FA-enabled client → Disable 2FA → confirm
   - Audit row: `TWO_FACTOR_ADMIN_RESET` with `actorId = admin.id`
   - Affected user gets the "support reset" email + in-app notification
   - Try self-disable via the endpoint URL → 400
   - Try admin→admin disable → 400

8. **Open-redirect guard**
   - `/auth/2fa?next=https://evil.example.com` → after success lands on /dashboard, NOT the external URL

---

## What I'd change next time

- **Build the activity panel in F, not as a follow-up.** The audit table exists from day one; the "your security activity" surface in Settings is a 30-min UI on top. We deferred it; users have asked for it.
- **Make `ADMIN_ALERT_EMAIL` mandatory in production.** Treating it as optional means real security signal gets lost in misconfigured envs. Throw at startup in `NODE_ENV=production` if it's unset and `role=admin` exists.
- **Add `verifyOtp`-style "send 2FA via email" as a recovery option later.** Backup codes are good but they go missing. Email-OTP recovery (in addition to backup codes) cuts the support-ticket volume noticeably.
- **Surface failed-verify counts in the admin user-review modal.** "12 failed verifies in the last hour, then asked for a reset" is a different story than "they lost their phone two years after enrolment." Same data, different framing.

---

## License

Use this freely in your projects. No attribution required.
