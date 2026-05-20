# Phase E - Admin user-management touchups

**Status**: DONE
**Date completed**: 2026-05-15
**Builds on**: [Phase D - Admin enforcement](phase-d-admin-enforcement.md)
**Tracker**: [TWO_FACTOR_AUTH.md](../../TWO_FACTOR_AUTH.md)

Phases A–D delivered the full client-side 2FA story: enrol from Settings, get challenged at sign-in, and forced enrollment for admins. Phase E adds the **support story**:

- An admin can see who has 2FA enabled when triaging the vetting queue.
- An admin can break-glass a user's 2FA when the user has lost both their authenticator AND their backup codes.

## What ships

1. **Inline 2FA chip on the vetting list.** Slate `Off`, emerald `On`. Sits next to the email on the Contact column.
2. **`Disable 2FA` button in the user-review modal**, visible only when the user actually has 2FA enabled.
3. **Confirmation card with explicit copy** - "verify identity out-of-band first", "user will sign in with password only", "recommend they re-enable immediately".
4. **In-app notification** to the user when an admin disables their 2FA so they know support touched their security setting.
5. **New API endpoint**: `POST /api/admin/users/[id]/disable-2fa`.

## Files

### [app/api/admin/users/[id]/disable-2fa/route.ts](../../app/api/admin/users/[id]/disable-2fa/route.ts) - new

POST. `requireAdmin` gate. Three guards before the mutation:

```ts
if (id === session.user.id)          // self-disable through this endpoint is rejected
if (target.role !== "client")        // admin → admin disable is rejected
if (!target.twoFactorEnabled)        // already off - no-op rejected
```

The self-disable rejection is deliberate: the regular `/dashboard/settings` flow re-prompts the password before disabling, which this endpoint doesn't (it trusts the admin session). If an admin's machine is unlocked and someone hits this endpoint via a forged request on their own account, they bypass that re-prompt. Forcing self-disable through Settings keeps the password gate intact.

Admin-on-admin disable is rejected because we don't want a single compromised admin account to be able to weaken every other admin's 2FA in one move. Admins manage their own 2FA from Settings.

Side effects in order:
1. `update user set twoFactorEnabled = false`
2. `delete from twoFactor where userId = ...` (wipes the secret + backup codes so re-enrollment starts fresh)
3. Insert a `clientNotifications` row of type `GENERAL` titled "Two-factor authentication reset"

Audit-log row gets added in Phase F when the rest of the auth-event instrumentation lands.

### [app/api/admin/users/vetting/route.ts](../../app/api/admin/users/vetting/route.ts) - extended

Adds `twoFactorEnabled` to the select projection so the vetting table receives the flag without a follow-up request.

### [components/admin/user-vetting-table.tsx](../../components/admin/user-vetting-table.tsx)

- New `<TwoFactorChip>` helper at the bottom of the file. Tiny (text-[9px]) so it sits inline with the email row without breaking the table's compact density.
- Imports `ShieldCheck` / `ShieldOff` icons. Chip is title-tooltipped (`2FA enabled` / `2FA disabled`) for hover-discovery.

### [components/admin/user-review-modal.tsx](../../components/admin/user-review-modal.tsx)

- `VettingUser.twoFactorEnabled: boolean | null` added to the type.
- New `Action = ... | "disable-2fa"` union.
- New entry-point button in the footer **left** group (next to Close) - separates the destructive break-glass from the workflow actions (Approve/Reject/Request Changes) on the right. Only renders when `user.twoFactorEnabled` is true.
- New confirmation card with red accent + the "verify identity first" copy.
- `runAction` now picks `POST` for `disable-2fa` (the endpoint is a destructive operation, not a vetting-state patch).
- `disable-2fa` doesn't change vetting status, so the modal stays open after success - same convention as `resend-verification`. The admin sees the toast, the chip updates after the parent re-fetches, and they can close manually.

## What was scoped out (vs the tracker)

- **"Off - required" red chip for admin rows.** The vetting list is client-only (filtered server-side by `eq(user.role, "client")`); admins never appear. If a future "admin directory" page surfaces, the chip helper already supports both states - just add the red variant there.
- **Audit-log entry on disable.** Lives with Phase F's `auth_events` instrumentation.
- **Email notification** to the user that an admin reset their 2FA. In-app notification covers the immediate "make the user aware" story; email lands in Phase F together with the rest of the security email templates.

## Smoke test (manual)

1. As a client, enrol in 2FA (Phase B flow).
2. Sign in as admin → `/admin/users`. The client's row shows the emerald `2FA` chip next to their email.
3. Click Review on the client's row. Modal opens with **Disable 2FA** button visible in the footer.
4. Click Disable 2FA. Red confirmation card appears: "verify identity out-of-band first", etc.
5. Click "Yes, disable 2FA". Toast: "2FA disabled - user notified". The user row's chip flips to slate `2FA Off` after the list refetches.
6. DB: `user.twoFactorEnabled = false` for the target; their `twoFactor` row is gone; new `clientNotifications` row of type `GENERAL`.
7. Negative test: try the endpoint against your own admin id - `400` with "Use Settings → Security to disable your own 2FA".
8. Negative test: try the endpoint against another admin (manually changing the URL id) - `400` with "Only client 2FA can be reset from this UI".
9. As the affected client, sign in - only password is required. The notification bell shows the support-reset message.

## What's next

Phase F - Polish. Email templates for `2FA_ENABLED` / `2FA_DISABLED` / admin notifications, the `auth_events` audit log table, and a copy review across all the 2FA surfaces (sign-in form, forced banner, settings card, emails).
