# Phase B — Settings → Security UI

**Status**: DONE
**Date completed**: 2026-05-15
**Builds on**: [Phase A — Foundation](phase-a-foundation.md)
**Tracker**: [TWO_FACTOR_AUTH.md](../../TWO_FACTOR_AUTH.md)

Phase A wired the Better Auth `twoFactor` plugin and exposed `authClient.twoFactor.*` to the client SDK — but with no UI, the only way to interact with it was raw `fetch`. Phase B builds the full enrollment, disable, and backup-code regeneration flow inside Settings → Security.

## What ships

A user (client or admin) can now:

- Open Settings → Security and see whether 2FA is on or off.
- **Enable** 2FA via a 4-step wizard: password → QR scan → 6-digit verify → save backup codes.
- **Disable** 2FA via a password-gated dialog.
- **Regenerate backup codes** via a password-gated dialog that invalidates the old set and shows the new ones once.

Sign-in interception (`twoFactorRedirect`) is **not** wired yet — that's Phase C. Until then, enabling 2FA from Settings stores the secret server-side but the login flow still goes straight to the dashboard. Useful for end-to-end testing of the enrollment path; not yet useful as a security mechanism.

## Architecture

```
/dashboard/settings  (already existed)
    │
    ├── tab: Profile        — unchanged
    ├── tab: Notifications  — unchanged
    └── tab: Security ─── components/settings/security-settings.tsx
                              │
                              ├── (existing) Change Password section
                              └── <TwoFactorStatusCard forceEnroll={?} />
                                    │
                                    ├── (when OFF)  "Enable 2FA" button → wizard
                                    └── (when ON)   "Regenerate backup codes" + "Disable" buttons
                                        │
                                        ├── <TwoFactorEnableWizard />        (4 steps)
                                        ├── <TwoFactorDisableDialog />       (password)
                                        └── <TwoFactorBackupCodesDialog />   (password → 10 fresh codes)
```

`forceEnroll` is a prop the admin layout will pass in Phase D — when true, the wizard opens automatically on mount and can't be closed until step 4 is finished. Plumbing wired now; admin layout uses it in Phase D.

## Components added

### [components/settings/two-factor-status-card.tsx](../../components/settings/two-factor-status-card.tsx)
Card that adapts to the user's current 2FA state. Reads `twoFactorEnabled` from `authClient.useSession()` (Better Auth surfaces the column on the session user). After enable or disable succeeds, the card calls `refetch()` so the UI swaps state without a full reload.

- **Off**: gradient slate card with animated scan-line + "Enable 2FA" CTA.
- **On**: same card with an emerald `CheckCircle` and two buttons — Regenerate / Disable.
- **forceEnroll** (admin Phase D): yellow "Required for admins" pill, wizard opens on mount, X/Esc/click-outside blocked until enrollment finishes.

### [components/settings/two-factor-enable-wizard.tsx](../../components/settings/two-factor-enable-wizard.tsx)
4-step Dialog using the existing `Dialog` primitive. Each step shares the dialog frame, only the body and footer swap.

| Step | What | Server call |
|---|---|---|
| 1. password | Re-confirm password | none yet |
| 2. scan | Show QR + setup key | `authClient.twoFactor.enable({ password })` — returns `{ totpURI, backupCodes }`. The backup codes come back here but we don't show them until step 4 (after verify). |
| 3. verify | 6-digit input | `authClient.twoFactor.verifyTotp({ code })` — first successful call flips `twoFactorEnabled = true` server-side. |
| 4. codes | Show 10 codes | none (codes were returned in step 2's response) |

QR rendering uses [qrcode.react](https://www.npmjs.com/package/qrcode.react) — small (~115KB unpacked), no canvas dependency, renders SVG inline. Added to `package.json` in this phase.

Setup key (the base32 secret extracted from the `otpauth://` URI) is shown beneath the QR so apps that can't scan can paste it directly. Chunked into 4-char groups for readability and copy-able.

Backup codes screen has Download (.txt) and Copy all buttons. The "I've saved these codes" checkbox must be ticked before Done is enabled — a soft enforcement that makes the user pause and acknowledge before closing the modal.

State is wiped on close (with a 200ms delay so the close animation completes) so re-opening the wizard starts fresh and never replays an old TOTP URI.

### [components/settings/two-factor-disable-dialog.tsx](../../components/settings/two-factor-disable-dialog.tsx)
Password-gated. Calls `authClient.twoFactor.disable({ password })`. Surfaces a red-tinted warning panel because turning off 2FA is a security-downgrade event. Toast on success, dialog closes, parent re-fetches the session.

The tracker mentioned requiring a current 6-digit code in addition to the password — Better Auth's `disable` endpoint only takes a password, so that's all we ask for. Re-prompting the password is sufficient to defeat a walk-up attacker; a stolen authenticator alone can't disable 2FA because the password is still required. Phase F adds the confirmation email so the legitimate user knows immediately if disable was triggered.

### [components/settings/two-factor-backup-codes-dialog.tsx](../../components/settings/two-factor-backup-codes-dialog.tsx)
Two-phase dialog: password gate → new codes. Calls `authClient.twoFactor.generateBackupCodes({ password })`. Same UX as the wizard's step 4 (download .txt, copy all, "I've saved these codes" checkbox).

Note: the tracker mentioned "view current codes (greyed out for already-used)" — Better Auth's only user-facing endpoint is regenerate; `viewBackupCodes` exists server-side but takes a `userId` and isn't exposed on the client SDK. That matches the intended UX anyway — once a user has saved their codes, the system shouldn't keep showing them. If they lose them, the answer is regenerate, which invalidates the old set. Cleaner security model than "always viewable".

## Files touched

- [app/dashboard/settings/page.tsx](../../app/dashboard/settings/page.tsx) — reads `?force=1` and routes it through to `SecuritySettings`; strips the param after consuming it so a refresh doesn't re-trigger.
- [components/settings/settings-shell.tsx](../../components/settings/settings-shell.tsx) — accepts an `initialTab` prop so the forced-enroll redirect can land on Security directly.
- [components/settings/security-settings.tsx](../../components/settings/security-settings.tsx) — mock 2FA UI replaced with `<TwoFactorStatusCard />`. The Change Password section is untouched (unrelated to this phase).
- [components/settings/two-factor-status-card.tsx](../../components/settings/two-factor-status-card.tsx) — new.
- [components/settings/two-factor-enable-wizard.tsx](../../components/settings/two-factor-enable-wizard.tsx) — new.
- [components/settings/two-factor-disable-dialog.tsx](../../components/settings/two-factor-disable-dialog.tsx) — new.
- [components/settings/two-factor-backup-codes-dialog.tsx](../../components/settings/two-factor-backup-codes-dialog.tsx) — new.
- [package.json](../../package.json) — added `qrcode.react`.

## Smoke test (manual)

1. Sign in as any user.
2. Settings → Security & Access. Card shows "Secure your account" + Enable button.
3. Click **Enable 2FA**.
4. Step 1: enter password, Continue.
5. Step 2: scan QR with 1Password (or Google Authenticator). Confirm a 6-digit code appears in the app for "Seairo Cargo".
6. Step 3: type the current code, Verify & enable. Toast confirms.
7. Step 4: 10 codes display. Click Download .txt — a file is saved. Tick the checkbox, click Done.
8. Card now shows "Two-factor authentication is on" + Regenerate / Disable buttons.
9. Click **Regenerate backup codes**. Password → 10 new codes appear. Old codes from step 7 are now invalid (would fail at sign-in challenge once Phase C ships).
10. Click **Disable**. Password → 2FA off, card flips back to the enable state. DB confirms `user.twoFactorEnabled = false` and the `twoFactor` row is gone.

## Decisions & gotchas

- **`User` type in `types/index.ts` doesn't list `twoFactorEnabled`.** Better Auth attaches it to `session.user` automatically (via the plugin's schema). The status card reads it via a cast — adding it to the global `User` type would propagate through unrelated code, so left local.
- **`refetch` from `useSession`** — not a manual reload. Better Auth's hook exposes a `refetch` we can call after enable/disable to update the cached session without a full page navigation.
- **Backup codes shown in step 4 come from step 2's response.** Better Auth returns them at `enable` time, but we hold them until after successful verify so a half-finished enrollment doesn't leak codes the user can't actually use yet.
- **State wipe on close.** All dialogs reset internal state after a 200ms close-animation delay. Prevents stale state (an old TOTP URI, a typed-but-not-submitted password) leaking into a subsequent open.
- **Force-enroll suppression of close.** The wizard's `onInteractOutside` and `onEscapeKeyDown` handlers are gated on `forceEnroll && step !== "codes"`. Once the user finishes step 3 and lands on codes, they can close normally. This is what makes the admin Phase D forced flow work without a separate component.

## What's next

Phase C — Login challenge page. Until that ships, the secret stored here doesn't actually gate sign-in. The plumbing:

- `authClient.signIn.email(...)` already returns `{ data: { twoFactorRedirect: true } }` for 2FA-enrolled users — the auth-panel needs to read it and push to `/auth/2fa`.
- `/auth/2fa/page.tsx` + `components/auth/two-factor-form.tsx` to render the challenge form.
- `authClient.twoFactor.verifyTotp({ code })` (or `verifyBackupCode`) finishes the session.
