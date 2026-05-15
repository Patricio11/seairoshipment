# Phase A — Foundation

**Status**: DONE
**Date completed**: 2026-05-15
**Tracker**: [TWO_FACTOR_AUTH.md](../../TWO_FACTOR_AUTH.md)

Plumbing only. The Better Auth `twoFactor` plugin is wired into the server, the matching `twoFactorClient` is wired into the React client, and the database has the columns/tables the plugin needs. Nothing user-facing yet — Phase B owns the UI.

## What shipped

### 1. Plugin wired server-side

[lib/auth/server.ts](../../lib/auth/server.ts)

```ts
import { betterAuth } from "better-auth";
import { twoFactor } from "better-auth/plugins";
// ...
export const auth = betterAuth({
    // ...
    plugins: [
        twoFactor({
            issuer: "Seairo Cargo",
            totpOptions: { digits: 6, period: 30 },
        }),
    ],
});
```

The plugin's `twoFactor` table is also registered with the drizzle adapter so the plugin's enable/verify/disable flows have somewhere to read and write:

```ts
database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
        twoFactor: schema.twoFactor,
    },
}),
```

The plugin ships everything we need — no separate `@better-auth/two-factor` install. The dependency is already satisfied by `better-auth@^1.4.17`.

### 2. Client mirror

[lib/auth/client.ts](../../lib/auth/client.ts)

```ts
import { twoFactorClient } from "better-auth/client/plugins";
// ...
export const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    plugins: [ twoFactorClient() ],
});
```

This unlocks `authClient.twoFactor.enable/disable/verifyTotp/verifyBackupCode/getTotpUri/...` for the upcoming settings UI, and makes the sign-in response include `twoFactorRedirect: true` when 2FA is gated — that's the signal Phase C will key off.

### 3. Schema additions

[lib/db/schema/users.ts](../../lib/db/schema/users.ts)

- `user.twoFactorEnabled boolean default false` — flag on the existing user row. The plugin flips this on successful enable / off on disable; `input: false` upstream means it's never settable from a client API call.
- New `twoFactor` table — `{ id, userId (FK → user.id, cascade), secret, backupCodes }`. One row per enrolled user; storing the TOTP secret + the encoded backup-code set. The plugin owns reads and writes; the secret/codes are never returned over the wire.

The schema is exported from [lib/db/schema/users.ts](../../lib/db/schema/users.ts) and picked up automatically through [lib/db/schema/index.ts](../../lib/db/schema/index.ts).

### 4. Schema pushed

`npm run db:push` applied the two changes:
- `ALTER TABLE "user" ADD COLUMN "twoFactorEnabled" boolean DEFAULT false`
- `CREATE TABLE "twoFactor" (...)`

Per the project rule, no hand-written SQL — drizzle-kit handles it.

## What the plugin gives us for free

- **TOTP secret generation** (32-byte base32, RFC 6238).
- **Code verification** with the standard ±1-step drift window.
- **Backup-code generation + hashing** (Argon2, not plaintext).
- **Sign-in interception**: when a user has `twoFactorEnabled = true`, Better Auth's `signIn` returns `{ twoFactorRedirect: true }` instead of issuing a session. The client gets the signal, the session is held in a short-lived cookie until verification succeeds.
- **Rate limiting** on `/two-factor/verify-totp` and `/two-factor/verify-backup-code` (Better Auth's built-in rate limiter, 3 attempts / 10s by default).

## Endpoints now live (no UI yet)

| Endpoint | Purpose |
|---|---|
| `POST /api/auth/two-factor/enable` | Body `{ password }` — generates secret + 10 backup codes, returns `{ totpURI, backupCodes }`. **Doesn't flip `twoFactorEnabled` until the user verifies in step 2.** |
| `POST /api/auth/two-factor/verify-totp` | Body `{ code, trustDevice? }` — verifies a 6-digit code. First successful verify flips `twoFactorEnabled = true`. |
| `POST /api/auth/two-factor/verify-backup-code` | Body `{ code, trustDevice? }` — same flow, but consumes a single backup code. |
| `POST /api/auth/two-factor/disable` | Body `{ password }` — destroys the secret + backup codes, flips `twoFactorEnabled = false`. |
| `POST /api/auth/two-factor/get-totp-uri` | Re-fetches the `otpauth://` URI for an enrolled user (so Settings can re-show the QR if they want). |
| `POST /api/auth/two-factor/generate-backup-codes` | Regenerates the 10 backup codes — invalidates the old set. |

## Sanity test

Phase A is "wiring only", so the manual check is:

1. `npm run dev`.
2. Open DevTools → Network.
3. From the browser console: `await fetch("/api/auth/two-factor/enable", { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: "wrong" }) }).then(r => r.status)`.
4. Expected: `401` (invalid password) — proves the endpoint is mounted, password-gated, and reachable.

No further smoke test in Phase A — anything more meaningful belongs in Phase B once we have a real flow to enroll a test account through.

## Decisions made along the way

- **No backup-code customisation.** The plugin's defaults (10 codes, 8 chars, alphanumeric, hashed at rest) match what we asked for in the tracker.
- **`skipVerificationOnEnable: false` (the default).** A user must successfully verify a TOTP code before `twoFactorEnabled` flips on — otherwise a scanned-then-deleted QR could brick the account.
- **No `twoFactorCookieMaxAge` override.** The default 10 minutes is right — generous enough that an enrolled user fumbling for their phone won't get bounced, short enough that an abandoned 2FA challenge expires.
- **Drizzle table named `twoFactor` (camelCase).** Matches the rest of our schema (`onboardingRequirements`, `containerTypes`, etc.). The Better Auth adapter resolves the model name `twoFactor` to whatever the drizzle table is called via the explicit mapping above.

## What's next

Phase B — Settings → Security UI. The endpoints exist; we need to wrap them in a multi-step dialog that walks a user through password gate → QR scan → verify → save backup codes.
