# Phase D - Admin forced enrollment

**Status**: DONE
**Date completed**: 2026-05-15
**Builds on**: [Phase C - Login challenge](phase-c-login-challenge.md)
**Tracker**: [TWO_FACTOR_AUTH.md](../../TWO_FACTOR_AUTH.md)

Phase C completed the optional 2FA flow - users could enrol from Settings and got challenged at sign-in. Phase D turns it from "encouraged" into "mandatory for admins": an admin who hasn't enrolled can't reach any `/admin/*` route until they finish enrollment.

## What ships

- `app/admin/layout.tsx` now blocks the entire admin shell on a DB-backed `twoFactorEnabled` check.
- Unenrolled admins are redirected to `/auth/setup-2fa`, a new role-agnostic page that hosts the enrollment wizard in `forceEnroll` mode.
- The wizard's banner now includes a "Sign out instead" escape hatch - an admin who can't enrol right now (lost phone, etc.) can bail cleanly.
- After the codes step, the wizard pushes the admin to `/admin` (configurable per producer via `forceEnrollRedirectTo`) and refreshes the route so the admin layout's gate sees `twoFactorEnabled = true`.

## The redirect-loop trap (and why we have /auth/setup-2fa)

The naive design - "redirect unenrolled admins to `/dashboard/settings?force=1`" - ping-pongs:

```
GET /admin              → admin layout sees twoFactorEnabled=false → redirect /dashboard/settings?force=1
GET /dashboard/settings → dashboard layout requires "client" role  → redirect /admin
GET /admin              → ...loop
```

`requireRole(["client"])` in `app/dashboard/layout.tsx` bounces admins to `/admin`. Fix options considered:

1. Allow admins through `/dashboard/settings` when `?force=1` - couples role check to query string; fragile.
2. Build a settings sub-page inside `/admin/*` - duplicates the wizard surface; same gate has to be skipped for the setup route.
3. **Dedicated `/auth/setup-2fa` page outside both layouts.** Role-agnostic, no gate conflict, single owner of the forced flow.

(3) won. The page does its own auth check (must be signed in) and its own enrollment check (must be unenrolled), so it can't be abused as a generic "render the wizard" surface.

## Files

### [app/admin/layout.tsx](../../app/admin/layout.tsx) - the gate

```ts
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

We read the DB row instead of trusting `session.user.twoFactorEnabled` because the session has cookie cache (5 min in our config). An admin who enrols in another tab shouldn't be stuck on `/auth/setup-2fa` for the cache window - fresh DB read clears the gate on next navigation.

The query is single-row, indexed (`user.id` PK), and runs on every `/admin/*` request. Cost is comparable to the existing `requireRole` round-trip; negligible.

### [app/auth/setup-2fa/page.tsx](../../app/auth/setup-2fa/page.tsx) - the dedicated forced page

Server component. Three branches:

| State | Behavior |
|---|---|
| Not signed in | `redirect("/")` |
| Already enrolled | `redirect("/admin")` or `redirect("/dashboard")` based on role - nothing to do here |
| Signed in, not enrolled | Render `<ForcedTwoFactorSetup role={...} />` |

### [components/auth/forced-two-factor-setup.tsx](../../components/auth/forced-two-factor-setup.tsx)

Full-page wrapper that gives the page chrome (gradient background, title, explainer copy) and renders `<TwoFactorEnableWizard forceEnroll forceEnrollRedirectTo={...} />`. Without the wrapper the user would land on a blank page with only a Dialog visible - disorienting.

Belt-and-braces: the wrapper's `onOpenChange` ignores `false`, even though the wizard's own `forceEnroll` mode already suppresses dismissal. Defence in depth - if someone refactors one path the other still holds.

### [components/settings/two-factor-enable-wizard.tsx](../../components/settings/two-factor-enable-wizard.tsx) - extended

Two small additions, no behaviour change for the existing Settings flow:

- New optional prop `forceEnrollRedirectTo` (defaults to `/admin`). Only consulted when `forceEnroll` is true and the user clicks Done on the codes step.
- New "Sign out instead" link inside the forced-enroll banner, calling `authClient.signOut()` then `router.push("/")`. Gives the admin a way out if they can't enrol right now.

The banner was previously a single horizontal flex row; it's now a column so the action sits below the warning text without crowding.

## Edge cases

- **Admin disables 2FA from Settings while inside `/admin`.** Disable dialog calls `authClient.twoFactor.disable` which sets `twoFactorEnabled = false`. Next `/admin/*` navigation re-runs the gate → redirect to `/auth/setup-2fa`. No stuck state.
- **Two-tab race**: admin opens `/admin/users` and `/auth/setup-2fa` simultaneously. The admin tab redirects to setup; the setup tab loads the wizard. They enrol in the setup tab; the admin tab is stale until the next navigation. Acceptable - refreshing the admin tab clears the gate.
- **Client visits `/auth/setup-2fa` directly.** Page renders the wizard with `role="client"` and a `forceEnrollRedirectTo="/dashboard"`. Currently no producer routes clients here, but if forced enrolment widens later (Phase F option) the page already supports it correctly.
- **Admin clicks "Sign out instead" mid-wizard.** `authClient.signOut()` clears the session, `router.push("/")` lands them on the landing page. On their next sign-in attempt they'll hit the same gate again - that's the point.

## Smoke test (manual)

1. Create a fresh admin user (or pick one without 2FA enrolled). Sign in.
2. Land on `/admin`. Expect: instant redirect to `/auth/setup-2fa` showing the forced banner + wizard step 1.
3. Try to close the wizard - X is hidden, Esc and outside-click are blocked.
4. Click "Sign out instead". Expect: signed out, lands on `/`.
5. Sign in again. Same admin user. Land on `/admin` → bounced again to setup. Walk through the 4 steps:
   - Password → continues to scan
   - Scan QR with authenticator app → continues to verify
   - Type 6-digit code → "Two-factor authentication enabled" toast, advances to codes step. X button now appears.
   - Tick "I've saved these codes", click Done.
6. Expect: router pushes `/admin`, the admin shell renders normally. DB shows `twoFactorEnabled = true` for the user + a `twoFactor` row.
7. Sign out, sign in again as the same admin. Expect: bounced to `/auth/2fa` (Phase C challenge) instead of setup. Enter code → `/admin` loads directly.
8. Negative test: from inside `/admin`, hit `/auth/setup-2fa` manually. Expect: redirected to `/admin` (the page detects already-enrolled and bounces).

## Decisions

- **DB read, not session cache, for the gate.** Session cookie cache is 5 min; we don't want a 5-minute window where an enrolled admin still gets bounced.
- **Setup page outside `/admin/*` and `/dashboard/*`.** Avoids the role-routing loop without weakening either layout's role check.
- **No "Re-prompt for 2FA on every admin action".** Tracker locked v1 as "challenge per login, not per action". Sensitive admin actions (delete a container, refund an invoice) are guarded by other means (confirm dialogs, audit logs). Re-prompt-per-action is a v2 conversation.
- **`forceEnrollRedirectTo` defaults to `/admin`.** Today's only producer is the admin layout. The default keeps the existing Settings flow inert (it never sets `forceEnroll`, so the prop is unused there) and the forced page can opt out by passing `/dashboard`.

## Out of scope (Phase F territory)

- **`sendAdminTwoFactorEnabledEmail`** - security-team notification email. Email templates land in Phase F together with the audit log.
- **Audit-log row on forced-enroll success.** Same - Phase F adds `auth_events` and instruments every state change.

## What's next

Phase E - Admin user-management touchups: a chip on the user vetting list showing whether each user has 2FA enrolled, plus a "Disable 2FA" break-glass action on the per-user menu for support cases (lost authenticator + lost backup codes).
