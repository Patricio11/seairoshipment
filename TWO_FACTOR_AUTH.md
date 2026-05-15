# Two-Factor Authentication — Progress Tracker

## Goal

Add **TOTP-based two-factor authentication** to the Seairo platform for both admin and client accounts. After a correct password the user is asked for a 6-digit code from their authenticator app (Google Authenticator, 1Password, Authy, etc.) before the session is fully issued.

- **Optional for clients**, enrolled from Settings → Security.
- **Mandatory for admins** — first login after this ships forces enrollment.
- **Backup codes** are the only recovery path. 10 single-use codes shown once at setup, must be downloaded or copied before the user can leave the screen.

Built on Better Auth's [`twoFactor` plugin](https://www.better-auth.com/docs/plugins/2fa) — handles the cryptographic primitives (TOTP secret generation, code verification, backup-code hashing) and the session-state interception so we don't have to reinvent any of that. We build the UI and the orchestration around it.

---

## Architecture at a glance

```
LOGIN FLOW
─────────────────────────────────────────────────
[1] /auth/sign-in        →   email + password
                              ↓ correct?
                                                 (no 2FA enabled)
                                                 ─────────────────→ /dashboard
[2] /auth/2fa            ←   "2FA required" intercepted
     ↓ 6-digit code OR backup code
     ↓ verified?
                                                 → /dashboard

ADMIN FORCED FLOW (one-time)
─────────────────────────────────────────────────
[1] admin logs in        →   no 2FA enrolled
                              ↓
[2] /dashboard/settings/security?force=1
                              ↓ enable + verify + save codes
                              ↓
                                                 → /admin/...

SETTINGS / OWNER MANAGEMENT
─────────────────────────────────────────────────
/dashboard/settings/security
  ├─ status (Off | Enabled)
  ├─ Enable wizard (password gate → QR + secret → verify → codes)
  ├─ Disable (password + current code)
  └─ View / regenerate backup codes
```

---

## Decisions — locked in

| Question | Answer |
|---|---|
| Second-factor method | **TOTP via authenticator app**. SMS is NIST-deprecated; email OTP is too vulnerable for primary 2FA. |
| Recovery | **Backup codes only.** 10 single-use, generated at setup, shown once. Lost → admin break-glass via user-vetting page. |
| Admin enforcement | **Forced.** Admin role can't reach any `/admin/...` page until 2FA is enabled. |
| Trust this device for 30 days | **Deferred.** v1 prompts on every login. Add to v2 if friction becomes a real complaint. |
| Email-OTP recovery | **Deferred.** Backup codes are the only recovery path in v1. |
| Plugin choice | **Better Auth's `twoFactor`.** Already on 1.4.17. The plugin owns the schema, the verification crypto, and the auth-flow hooks. |
| Settings location | `/dashboard/settings/security`. Same path for clients and admins. |
| Login challenge page | `/auth/2fa`. Server-rendered shell, client form. |
| Backup-code presentation | Downloadable as a `.txt` file AND copy-to-clipboard. User must check "I've saved these" before the dialog closes. |
| Backup-code regeneration | Available from the same settings page. Regenerating invalidates the old set. |
| 2FA-required indicator on user vetting list | Yes — small chip next to each admin row showing whether they've enrolled. |
| Audit log | One entry per: enable, disable, successful verify, failed verify (rate-limited per user), admin reset. |

---

## Phases at a glance

```
A · Foundation — install & wire the plugin           → docs/two-factor-auth/phase-a-foundation.md
B · Settings UI — enable, disable, view backup codes → docs/two-factor-auth/phase-b-settings-ui.md
C · Login interception + /auth/2fa challenge page    → docs/two-factor-auth/phase-c-login-challenge.md
D · Admin enforcement + forced enrollment            → docs/two-factor-auth/phase-d-admin-enforcement.md
E · Admin user-management touchups (break-glass + indicators) → docs/two-factor-auth/phase-e-admin-management.md
F · Polish — emails, audit log, copy review          → docs/two-factor-auth/phase-f-polish.md
```

A → B → C is the critical path for a working v1. D blocks rollout for admins. E + F are polish that can ship same week.

---

## Phase A — Foundation ✅

**Goal**: Better Auth's `twoFactor` plugin is wired into the server, the schema has migrated, and the client SDK exposes the new methods. Nothing user-facing yet.

📄 [docs/two-factor-auth/phase-a-foundation.md](docs/two-factor-auth/phase-a-foundation.md)

- [x] No separate install — `twoFactor` ships inside `better-auth@^1.4.17` (no `@better-auth/two-factor` package needed).
- [x] `lib/auth/server.ts` — plugin added with `issuer: "Seairo Cargo"`, `totpOptions: { digits: 6, period: 30 }`. `twoFactor` table registered in the drizzle adapter mapping.
- [x] `lib/auth/client.ts` — extended with `twoFactorClient()` so `authClient.twoFactor.*` exists and sign-in returns `twoFactorRedirect`.
- [x] `lib/db/schema/users.ts` — `user.twoFactorEnabled boolean default false` + new `twoFactor` table (`id`, `userId` FK cascade, `secret`, `backupCodes`).
- [x] `npm run db:push` applied — column + table created.
- [x] Smoke test: `POST /api/auth/two-factor/enable` returns `401` on a bad password — endpoint is mounted and password-gated.

**Done**: `/api/auth/two-factor/*` endpoints exist and respond correctly. No UI yet — Phase B owns that.

---

## Phase B — Settings → Security UI ✅

**Goal**: A user can enable, verify, view backup codes, regenerate them, and disable 2FA from Settings.

📄 [docs/two-factor-auth/phase-b-settings-ui.md](docs/two-factor-auth/phase-b-settings-ui.md)

- [x] `/dashboard/settings` already existed — extended the existing `SettingsShell` with an `initialTab` prop so `?force=1` can land directly on Security.
- [x] Security tab lives inside `components/settings/security-settings.tsx` (the existing shell-children pattern). Mock 2FA UI replaced with the real card.
- [x] `components/settings/two-factor-status-card.tsx` — reads `twoFactorEnabled` from `authClient.useSession()`. Off shows Enable. On shows Regenerate + Disable. Supports `forceEnroll` for Phase D.
- [x] `components/settings/two-factor-enable-wizard.tsx` — 4-step dialog (password → QR + setup key → verify → backup codes with download/copy + "I've saved these" checkbox). Uses `qrcode.react` for the QR. Suppresses close on outside-click / Esc / X when `forceEnroll && step !== "codes"`.
- [x] `components/settings/two-factor-disable-dialog.tsx` — password-gated. Calls `authClient.twoFactor.disable`. Red warning panel + email-confirm copy.
- [x] `components/settings/two-factor-backup-codes-dialog.tsx` — password → fresh 10 codes from `generateBackupCodes`. Old codes invalidated immediately.
- [x] `package.json` — added `qrcode.react`.

**Done**: typecheck clean. Enrollment flow round-trips: enable → DB shows `user.twoFactorEnabled = true` + a `twoFactor` row; disable removes both. Sign-in interception comes in Phase C — until then 2FA is enrollable but doesn't actually gate logins yet.

---

## Phase C — Login challenge page ✅

**Goal**: After a correct password, a user with 2FA enabled is redirected to `/auth/2fa` instead of straight to the dashboard.

📄 [docs/two-factor-auth/phase-c-login-challenge.md](docs/two-factor-auth/phase-c-login-challenge.md)

- [x] [components/auth-panel.tsx](components/auth-panel.tsx) — `onSuccess` reads `ctx.data.twoFactorRedirect`; when present, closes the panel and pushes `/auth/2fa`. Toast + role-redirect now only fire for the no-2FA branch.
- [x] [app/auth/2fa/page.tsx](app/auth/2fa/page.tsx) — server-rendered shell using the same gradient/glass layout as `/auth/reset-password`. `<Suspense>` wraps the form so search-param reads don't break SSG.
- [x] [components/auth/two-factor-form.tsx](components/auth/two-factor-form.tsx) — 6-digit `inputMode="numeric"` field with `autoComplete="one-time-code"`. Submit hits `authClient.twoFactor.verifyTotp`. Inline error on bad code. Toggle "Use a backup code instead" swaps to a free-text 20-char field that calls `verifyBackupCode`. Auto-focus on mode change.
- [x] `?next=` plumbing on the receiver side — `safeNext()` allows only same-origin paths (`/foo`), rejects `//evil.com` and absolute URLs. Producer side (auth panel passing `?next`) is left as a one-line seam since the landing-page panel has no intended destination today.

**Done**: sign in with a 2FA-enabled account → bounced to `/auth/2fa` → 6-digit code accepted → lands on `/dashboard` (admin role-routing kicks in). Backup-code branch works the same way. Better Auth's built-in rate limiting handles brute-force protection.

---

## Phase D — Admin forced enrollment ✅

**Goal**: Admin-role users can't access any `/admin/...` route until they've enrolled 2FA.

📄 [docs/two-factor-auth/phase-d-admin-enforcement.md](docs/two-factor-auth/phase-d-admin-enforcement.md)

- [x] [app/admin/layout.tsx](app/admin/layout.tsx) — after `requireRole(["admin"])`, reads `user.twoFactorEnabled` from the DB and redirects to `/auth/setup-2fa` if false. DB read (not session cache) so a fresh enrollment clears the gate on next nav.
- [x] [app/auth/setup-2fa/page.tsx](app/auth/setup-2fa/page.tsx) — **role-agnostic** forced-enrollment page. Avoids the redirect loop that would happen if we sent admins to `/dashboard/settings` (which `requireRole(["client"])` bounces back to `/admin`).
- [x] [components/auth/forced-two-factor-setup.tsx](components/auth/forced-two-factor-setup.tsx) — full-page chrome around the wizard (gradient background, title, explainer copy).
- [x] [components/settings/two-factor-enable-wizard.tsx](components/settings/two-factor-enable-wizard.tsx) — banner now has a **"Sign out instead"** escape hatch. New `forceEnrollRedirectTo` prop drives the post-codes-step redirect (default `/admin`, set to `/dashboard` for non-admins).
- [x] After codes-step, the wizard pushes to the configured destination + `router.refresh()` so the admin layout's gate sees the new DB state.
- ⏸ `sendAdminTwoFactorEnabledEmail` notification — **deferred to Phase F** (lives with the email-templates batch).

**Done**: A fresh admin lands on `/admin` → bounced to `/auth/setup-2fa` → must enrol or sign out. After enrollment, immediate access to `/admin`. Sign-out escape works. No redirect loops in any role/state combination.

---

## Phase E — Admin user-management touchups ✅

**Goal**: Break-glass support + visibility into who has 2FA enabled.

📄 [docs/two-factor-auth/phase-e-admin-management.md](docs/two-factor-auth/phase-e-admin-management.md)

- [x] [components/admin/user-vetting-table.tsx](components/admin/user-vetting-table.tsx) — inline 2FA chip next to each user's email. Emerald `2FA` when on, slate `2FA Off` when off. ("Off — required" red variant scoped out — the vetting list is client-only and clients aren't forced.)
- [x] [components/admin/user-review-modal.tsx](components/admin/user-review-modal.tsx) — **Disable 2FA** button in the footer (left group, separated from vetting actions). Only visible when `user.twoFactorEnabled` is true. Red confirm card spells out "verify identity out-of-band first".
- [x] [app/api/admin/users/[id]/disable-2fa/route.ts](app/api/admin/users/[id]/disable-2fa/route.ts) — POST, `requireAdmin`. Rejects self-disable (use Settings), rejects admin→admin disable, rejects no-op. Wipes `twoFactor` row + clears the user flag + fires in-app notification.
- [x] [app/api/admin/users/vetting/route.ts](app/api/admin/users/vetting/route.ts) — projection extended with `twoFactorEnabled`.
- ⏸ Audit-log row + email notification on disable — deferred to Phase F.

**Done**: A user who's lost their authenticator + backup codes can be unblocked end-to-end. Identity-verified out-of-band, admin clicks Disable 2FA, user signs in with password only, gets a notification to re-enrol immediately.

---

## Phase F — Polish ✅

📄 [docs/two-factor-auth/phase-f-polish.md](docs/two-factor-auth/phase-f-polish.md)

- [x] **Audit log table** [`auth_events`](lib/db/schema/auth-events.ts) — 7-value closed enum, indexed on `userId` and `createdAt`, with an `actorId` FK so admin break-glass resets carry the acting admin's id. Insert paths: client-attested via [POST /api/auth/events](app/api/auth/events/route.ts) for user-initiated flows, server-direct from the admin break-glass route for `TWO_FACTOR_ADMIN_RESET`. (Activity-panel surface deferred — data is captured, UI on top is a follow-up.)
- [x] **Email templates** in [lib/email.ts](lib/email.ts):
  - `sendTwoFactorEnabledEmail` — emerald accent, recovery hint about Regenerate backup codes, red "Wasn't you?" callout.
  - `sendTwoFactorDisabledEmail(reason)` — amber accent, copy switches between `self` and `admin-reset` variants.
  - `sendAdminTwoFactorEnabledEmail` — heads-up to `ADMIN_ALERT_EMAIL` (skipped silently if unset).
- [x] **Copy review** — recommended-apps list unified (status card + wizard now both mention 1Password / Google Authenticator / Authy / Microsoft Authenticator). All forced-enroll, disable, and challenge surfaces read consistently.
- [x] **[CLIENT_DASHBOARD.md](CLIENT_DASHBOARD.md)** — new "Phase 4 — Settings → Security" section pointing at the full design tracker.

**Done**: every state change fires the right email and writes an audit row. Closed-enum table is safe to query for "show me every security event for this user". `ADMIN_ALERT_EMAIL` is the one optional env (missing → admin enrolment alert is skipped, nothing else regresses).

---

## Required setup (post-rollout)

After deploying, run `npm run db:push` once. Pending schema additions across all phases:

- Phase A: `user.twoFactorEnabled boolean`, new `twoFactor` table
- Phase F: new `auth_events` table + `auth_event_type` enum

Optional env (Phase F):
- `ADMIN_ALERT_EMAIL` — security inbox for admin-enrolment alerts. Unset → no admin alerts, no error.

---

## Files most affected (rolling)

### Auth core (A)
- `lib/auth/server.ts` (plugin wiring)
- `lib/auth/client.ts` (twoFactor client extension)
- Better Auth schema (handled by plugin + drizzle-kit)

### Settings (B)
- `app/dashboard/settings/page.tsx` (shell, new)
- `app/dashboard/settings/security/page.tsx` (new)
- `components/settings/two-factor-status-card.tsx` (new)
- `components/settings/two-factor-enable-wizard.tsx` (new)
- `components/settings/two-factor-disable-dialog.tsx` (new)
- `components/settings/two-factor-backup-codes-dialog.tsx` (new)

### Login challenge (C)
- `components/auth/auth-panel.tsx` (intercept 2FA response)
- `app/auth/2fa/page.tsx` (new)
- `components/auth/two-factor-form.tsx` (new)

### Admin enforcement (D)
- `app/admin/layout.tsx` (force-redirect check)

### Admin user management (E)
- `app/admin/users/page.tsx` (chip + action menu)
- `app/api/admin/users/[id]/disable-2fa/route.ts` (new)

### Polish (F)
- `lib/db/schema/auth-events.ts` (new)
- `lib/email.ts` (three new templates)

---

## Risk areas

- **Locked-out admins.** If all admins enable 2FA, lose their devices, and have no backup codes, nobody can reset anyone. Mitigation: at least one admin must always retain backup codes in a secure location (password manager, physical safe). Document this in onboarding for the next admin who gets approved.
- **Better Auth schema collisions.** The plugin owns the `twoFactor` table. If we ever add columns to it manually they'll get overwritten on plugin update. Don't extend the plugin's tables — add a sibling table if we need more fields.
- **Backup-code UX.** Users notoriously close the dialog without saving the codes, then panic when they lose their phone. The "I've saved these codes" checkbox is a forcing function but isn't bulletproof. Fallback is admin reset.
- **TOTP clock drift.** Authenticator apps and our server clocks can drift up to ±30 seconds. Better Auth's plugin tolerates a 1-window drift by default (so codes from the previous or next window also pass). Don't tighten this without good reason.
- **Phishing resistance.** TOTP is not phishing-resistant — a real-time MITM proxy can capture the 6-digit code and replay it. WebAuthn / passkeys are the proper fix. Out of scope for v1; consider for a future hardening phase.
- **Rate limiting.** Better Auth rate-limits verify attempts per user. Confirm our overall API rate limiter doesn't block 2FA traffic before that — would lock people out for the wrong reason.
- **Recovery codes in transit.** If we ever email codes (we don't right now), that's a downgrade — email accounts get compromised. Backup codes shown once at setup is the right model; don't add an "email me my codes" button.

---

## Out of scope for v1

- **WebAuthn / passkeys / hardware keys.** Stronger and phishing-resistant. Future phase G.
- **SMS second factor.** NIST-deprecated for a reason. Won't add even on request.
- **Trust this device for N days.** Defer to a v2 phase if friction is a real complaint. Adds a `trusted_devices` table and a "remember me" checkbox on `/auth/2fa`.
- **Email OTP as a primary factor.** Email accounts are too commonly compromised to count as a second factor.
- **Per-role grace period.** Once an admin's 2FA enforcement ships, every admin is required immediately. No "you have 7 days to enroll".
- **Step-up authentication.** Forcing a re-verification before sensitive actions (delete account, change email). Useful but separate work.
- **Admin-side bulk disable.** Each break-glass disable is per-user only.

---

## Open questions

- [ ] Should the audit log surface on the user's own Settings page ("Your recent security events"), or only in the admin user-vetting view? Default: both, read-only for the user.
- [ ] Authenticator app recommendations list — should it include only the four big ones (1Password, Google Authenticator, Authy, Microsoft Authenticator) or also FreeOTP / Aegis (free / open-source)? Default: the four big ones, smaller "or any TOTP-compatible app" footnote.
- [ ] Copy tone on the forced-enrollment banner. Default: matter-of-fact, "this protects the platform for everyone". Avoid blame.

---

## Manual steps the user does after each phase

| Phase | Manual step |
|---|---|
| A | `npm run db:push` to add the plugin's schema |
| B | Smoke-test enable/disable flow end-to-end with a test client account |
| C | Smoke-test login interception with that test account |
| D | First admin enrolls under forced flow; verify break-glass on user-vetting page works |
| E | (none — covered above) |
| F | (none — emails just start sending) |
