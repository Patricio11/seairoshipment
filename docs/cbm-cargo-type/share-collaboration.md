# Share-Link Collaboration - Approve, Edit, Activity Timeline

**Status**: ✅ DONE
**Date completed**: 2026-05-15
**Builds on**: [Phase C.3 - Share-by-link + PDF + bulk paste](phase-c3-share-pdf-bulk-paste.md)

Phase C.3 shipped read-only share links for CBM calculations - a forwarder generates a link, sends it to a consignee, the consignee opens it and sees the items + 3D viz with no auth. Good for confirming dimensions, but the consignee's only path back was email.

This follow-up upgrades the share link with two optional capabilities the owner can toggle when they create it:

- **Allow approve** - recipient clicks a single button, enters their name + email, optional note. Owner gets a notification.
- **Allow edit** - recipient edits cargo items inline on the share page, hits Save, enters their name + email. Owner gets a notification and can revert.

Both default off, so existing share-link callers keep getting strictly read-only tokens.

## The problem this solves

Two real B2B workflows that previously required email back-and-forth:

1. **Consignee confirmation.** Forwarder sends 60 wine cases dimensions to the consignee; consignee replies "looks good, ship it". Now they click Approve and the forwarder sees an audit-trailed event with the approver's name, email, optional note, and timestamp.
2. **Dimension correction.** Consignee spots that the box dimensions are wrong (different supplier shipped a slightly larger carton). Previously they'd email "please change box C to 400×300×270". Now they edit inline on the share page, save, and the forwarder sees the change with a one-click revert if they don't agree.

## Schema

Two boolean columns added to `cargo_calculation_shares`:

| Column | Default | Purpose |
|---|---|---|
| `allow_approve` | `false` | Show Approve button on the share page |
| `allow_edit` | `false` | Make cargo items editable on the share page |

New audit-log table `cargo_calculation_share_actions`:

| Column | Notes |
|---|---|
| `id` | PK, `CSA-{nanoid(12)}` |
| `share_token` | FK → `cargo_calculation_shares.token`, cascade delete |
| `calculation_id` | FK → `cargo_calculations.id`, cascade delete |
| `action` | `share_action_type` enum: `APPROVED` \| `EDITED` |
| `guest_name` | required |
| `guest_email` | required |
| `note` | optional, max 500 chars |
| `items_snapshot` | JSONB. For `APPROVED` rows: items the approver saw. For `EDITED` rows: items **before** this edit (= what owner-side Revert restores). |
| `created_at` | defaultNow |

Two new values on `client_notification_type` enum:
- `CBM_SHARE_APPROVED`
- `CBM_SHARE_EDITED`

## API endpoints

### Public (no auth, token-gated)

```
POST /api/share/cbm/[token]/approve
Body: { name, email, note? }
```

Validates: token exists, not revoked, not expired, `allow_approve = true`, name+email present, email syntax-checks.
Side effects: inserts `CSA-...` action row → inserts owner's `client_notifications` row → fires `sendCbmShareApprovedEmail` (best-effort, won't fail the request).

```
POST /api/share/cbm/[token]/edit
Body: { name, email, items, note? }
```

Validates: same gates + `allow_edit = true`, items array is non-empty.
Sanitises every item server-side (drops items with non-positive dims/qty, regenerates IDs).
Snapshots the calc's **current** items into the action row first, then overwrites with the sanitised payload and **recomputes totals server-side** (`totalCbm`, `totalWeight`, `volumetricWeightSea` from `lib/cbm.ts`). Never trusts client-supplied totals.
Same notification + email path as approve.

```
GET /api/share/cbm/[token]
```

Existing endpoint - now also returns `allowApprove` and `allowEdit` so the public viewer can render the right affordances.

### Owner-only

```
GET /api/dashboard/cbm-calculations/[id]/activity
```

Returns the share-action log for this calc, newest-first. Used by the activity panel on the calc detail page.

```
POST /api/dashboard/cbm-calculations/[id]/revert
Body: { actionId }
```

Validates the action belongs to this calc and is an `EDITED` row. Restores its `items_snapshot` and recomputes totals.

### Share-create POST extended

`POST /api/dashboard/cbm-calculations/[id]/share` now accepts:

```ts
{ expiresInDays?: number, allowApprove?: boolean, allowEdit?: boolean }
```

Both flags default `false`. Existing callers that only pass `expiresInDays` keep getting strictly read-only links.

## UI surface area

### Owner - share dialog ([components/cbm/share-link-button.tsx](../../components/cbm/share-link-button.tsx))

Two new `<Switch>` toggles in the create panel: **Allow approve** and **Allow edit**, each with a one-line explanation. State stays local until the owner clicks "Generate new link" - both flags POST through.

Active-link rows in the same dialog now show small chips on rows where each permission is enabled (`approve` in emerald, `edit` in amber) so the owner can scan permissions at a glance.

### Public - share page ([app/share/cbm/[token]/page.tsx](../../app/share/cbm/[token]/page.tsx))

- Header pill flips between `read-only` and `editable` so the recipient knows what's allowed.
- When `allowEdit`: the `<CBMCalculator>` becomes editable (existing `readOnly` prop), local items state drives the 3D viz, a **Save changes** button appears (enabled only when items are dirty vs. server state).
- When `allowApprove`: an emerald **Approve calculation** button appears.
- Both buttons open the same `<Dialog>` asking name + email (required) + optional note (500 chars max).
- After successful approval the button collapses into a green "You approved this calculation." line for that session.

### Owner - activity panel ([components/cbm/activity-panel.tsx](../../components/cbm/activity-panel.tsx))

New right-column panel below SmartMatch on the calc detail page. Behaviours:

- Newest-first list of approvals + edits.
- Approval rows are emerald, edit rows are amber.
- Each entry shows guest name, mailto-linked email, timestamp, and (if present) a quoted note bubble.
- Edit rows have a **Revert** button. Confirm-dialog spells out "this restores items to before {guest}'s edit on {date}". On confirm hits the `/revert` endpoint, toasts success, and calls `onReverted` so the parent re-fetches the calc.

### Emails ([lib/email.ts](../../lib/email.ts))

Two new templates:

- `sendCbmShareApprovedEmail` - green accent, "Your calculation was approved", surfaces the guest's name + email + note. Subject: `{name} approved your calculation - {calcName}`. Reply-To set to the guest's email so the owner can reply straight to them.
- `sendCbmShareEditedEmail` - amber accent, "Your calculation was edited", same fields plus a "Need to undo?" callout that points at the activity timeline's Revert button.

Both wrap the send in try/catch so a flaky SMTP doesn't fail the action - the in-app notification still lands.

## Notification fan-out

For each guest action three channels fire:

1. **In-app bell** - new row in `client_notifications` with type `CBM_SHARE_APPROVED` or `CBM_SHARE_EDITED`.
2. **Email** - via the new email templates above.
3. **Activity timeline** - already-existing channel; the action row is the source.

The order in code: insert action row → insert notification → send email. If email fails the rest is already durable.

## Security model

- Public endpoints are token-gated. Tokens are 32-byte base64url random strings (not sequential), generated by `randomBytes(24)`.
- Each request rechecks `revoked_at IS NULL` and `expires_at >= now()`. A revoked link can never approve or edit.
- The action toggles are checked **per request**, not just at link creation - flipping a link's `allow_edit` off would immediately block edits on subsequent attempts (currently no UI to flip flags after creation; ticket parked).
- Edits sanitise items server-side and recompute totals - a malicious payload can't inject negative dimensions, fake CBM, or bypass capacity math.
- Owner-only endpoints (`activity`, `revert`) verify the calc belongs to the session user before doing anything.

## Out of scope for v1

- **Public-link revocation by recipient.** Only the owner can revoke a link.
- **Diff view between revert snapshots.** Right now Revert restores the prior state but doesn't show "you're about to undo: box A changed from 350×300 to 400×300" - just the row + timestamp. Future polish.
- **Flipping `allow_approve` / `allow_edit` on an existing share.** Currently both are set at create time only. Workaround: revoke and create a new link.
- **Concurrent-edit conflict resolution.** Last writer wins. Two guests editing simultaneously will both succeed and the later save will overwrite the earlier - both writes are still in the action log so the owner can see both and Revert the wrong one.
- **Approver-email verification.** The email field is captured but not verified (no magic-link round-trip). This matches DocuSign Lite's UX - the audit trail (timestamp, IP from the request, the typed name + email) is what matters in B2B.

## Required setup

After deploying, run `npm run db:push` once to apply the schema changes:

- Two new `cargo_calculation_shares` columns
- New `cargo_calculation_share_actions` table + `share_action_type` enum
- Two new values on `client_notification_type` enum

SMTP env vars (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`) must be set for the email channel to deliver; missing config logs an error but doesn't block the in-app notification.
