# Phase C - Login challenge page

**Status**: DONE
**Date completed**: 2026-05-15
**Builds on**: [Phase B - Settings UI](phase-b-settings-ui.md)
**Tracker**: [TWO_FACTOR_AUTH.md](../../TWO_FACTOR_AUTH.md)

Phase B gave users the ability to enrol in 2FA but the secret didn't actually gate sign-in - Better Auth's `twoFactorRedirect` signal was unread, so an enrolled user typed their password and still went straight to the dashboard.

Phase C wires the missing half. After a correct password, an enrolled user is bounced to `/auth/2fa` and must type a 6-digit code (or a single-use backup code) before the session is issued.

## Flow

```
Landing page  ─ AuthPanel.signIn.email(email, password)
                  │
                  │  password OK?  ──no──→ "Invalid email or password" toast
                  │
                  ▼
        ctx.data.twoFactorRedirect?
          │                │
          no               yes
          │                │
          ▼                ▼
   role-based redirect  router.push('/auth/2fa')
   /admin or /dashboard          │
                                 ▼
                       TwoFactorForm
                       ├─ TOTP (6-digit)  → authClient.twoFactor.verifyTotp({ code })
                       └─ Backup code     → authClient.twoFactor.verifyBackupCode({ code })
                                 │
                                 │  verify OK?  ──no──→ inline error, retry
                                 │
                                 ▼
                       router.push(next)  // safeNext sanitised, defaults to /dashboard
                       router.refresh()   // forces middleware to re-read the new session
```

## Files added

### [app/auth/2fa/page.tsx](../../app/auth/2fa/page.tsx)
Server-rendered shell. Re-uses the gradient / glass-panel layout from [app/auth/reset-password/page.tsx](../../app/auth/reset-password/page.tsx) so the auth surfaces feel cohesive. Wraps `<TwoFactorForm />` in `<Suspense>` because the form reads search params via the client hook.

No auth gating on the page itself - Better Auth holds the pending session in the `better-auth.two_factor` cookie, and the verify calls fail with a clear error if the cookie is missing. Gating the page would mean a second source of truth.

### [components/auth/two-factor-form.tsx](../../components/auth/two-factor-form.tsx)
The actual form. Two modes:

- **TOTP** (default) - numeric-only `inputMode`, 6-digit max, monospace tracked input, `autoComplete="one-time-code"` so browsers and password managers offer the latest code. Submit calls `authClient.twoFactor.verifyTotp`.
- **Backup code** - toggled via the "Use a backup code instead" link below the form. Free-text 20-char max. Submit calls `authClient.twoFactor.verifyBackupCode`. The link copy reminds the user backup codes are single-use.

The toggle re-focuses the input each time mode flips (via a `useRef` + effect on `mode`) so the user can paste-and-go without a stray click.

Error handling is inline (under the input), not toasted - the form is the only thing on the page, so the error belongs in the form's flow. Successful verify fires a "Signed in" toast and pushes the destination.

### `safeNext()` open-redirect guard

The form reads `?next=…` and only allows same-origin, non-protocol-relative paths:

```ts
function safeNext(next: string | null): string {
    if (!next) return "/dashboard"
    if (!next.startsWith("/")) return "/dashboard"
    if (next.startsWith("//")) return "/dashboard"
    return next
}
```

Defeats `?next=https://evil.example.com` and `?next=//evil.example.com` redirects. Path-only same-origin targets still work (`?next=/dashboard/cbm-calculations/abc`).

## Files changed

### [components/auth-panel.tsx](../../components/auth-panel.tsx)
The `onSuccess` callback of `authClient.signIn.email` now checks for `ctx.data.twoFactorRedirect`. When present:

```ts
const data = ctx.data as { twoFactorRedirect?: boolean; user?: { role?: string } } | undefined
if (data?.twoFactorRedirect) {
    onClose()
    router.push('/auth/2fa')
    return
}
```

The "Welcome back!" toast and the role-based redirect are skipped - the user hasn't actually signed in yet, only proven their password. Toast + role-redirect fire after `verifyTotp` succeeds on the 2FA page.

Better Auth's response is typed loosely (the union of "user issued" and "redirect pending") so we cast to a narrow shape. The cast is local to this one site; no spread through `types/index.ts`.

## `?next=` propagation - what's wired and what's not

The 2FA form **reads and sanitises** `?next`. But:

- The AuthPanel is opened from the landing page / CTAs and doesn't currently capture an intended destination. Right now, `router.push('/auth/2fa')` is called without `?next`, so the form falls back to `/dashboard`. The existing role-routing in `requireRole` then bounces admins to `/admin` automatically - same behavior as a password-only sign-in.
- If a future deep-link flow ("you clicked a link to `/dashboard/bookings/xyz` while logged out → please sign in") sets a target URL when opening the auth panel, plumbing it through is one line: append `?next=${encodeURIComponent(target)}` to the `/auth/2fa` push, and forward it on the non-2FA branch too.

Left as a TODO seam, not a bug - there's no producer for `?next` today.

## Rate limiting

Better Auth's `twoFactor` plugin rate-limits `/two-factor/verify-totp` and `/two-factor/verify-backup-code` automatically - 3 attempts in a 10-second window by default. After that the call returns an error and the verification cookie's max age (10 min) provides a natural hard ceiling on a brute-force window. No additional code needed on our side.

Visually, repeated wrong codes surface as inline error text; the user can keep trying without a forced cooldown UI - Better Auth's rate-limit error message is shown verbatim.

## Smoke test (manual)

1. Sign in as a user **without** 2FA. Expect: usual flow, lands on /dashboard.
2. Enable 2FA from Settings (Phase B). Sign out.
3. Sign in again. Expect: panel closes, browser pushes `/auth/2fa`.
4. Type the current 6-digit code. Expect: "Signed in" toast, lands on `/dashboard` (or `/admin` if admin).
5. Sign out. Sign in again. Click "Use a backup code instead". Paste one of the saved codes. Expect: same destination.
6. Sign out. Sign in again. Type a wrong code three times. Expect: rate-limit error after the third attempt. Wait, retype the real code. Expect: success.
7. Verify open-redirect guard: hit `/auth/2fa?next=https://evil.example.com` directly with a pending verification cookie, complete the challenge. Expect: lands on `/dashboard`, NOT the external URL.

## Decisions

- **Backup-code field is plain text, not 6-digit-numeric.** Better Auth generates alphanumeric codes (e.g. `K7H2-9PXM`) so the input has to allow letters and the optional hyphen. We `.trim()` before sending so a copy-paste with trailing whitespace still works.
- **No "trust this device" checkbox.** Deferred to v2 per the locked decisions in the tracker. Users prompt every login until that ships.
- **No password re-prompt on the challenge page.** Better Auth's flow accepts the verification cookie alone - re-prompting would be redundant.
- **`router.refresh()` after the redirect.** Forces the Server Component layer to re-fetch the session so the dashboard renders with the now-authenticated user, not the pre-2FA stub.

## What's next

Phase D - Admin forced enrollment. The `forceTwoFactorEnroll` plumbing in Settings already exists (Phase B); Phase D adds the server-side check in `app/admin/layout.tsx` that bounces unenrolled admins to `/dashboard/settings?force=1`.
