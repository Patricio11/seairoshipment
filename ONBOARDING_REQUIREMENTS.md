# Admin-Managed Onboarding Requirements — Progress Tracker

## Goal

Replace the hardcoded list of onboarding document requirements with an
admin-managed, dynamic configuration. Two kinds of entries share the same
admin UI:

- **Fillable templates** — admin uploads the file once (e.g. Credit
  Application, Terms & Conditions). The verification email links to the
  original; the user downloads, fills it in, and uploads their completed
  version into the same slot on the onboarding form.
- **User documents** — admin just defines the slot (e.g. "Tax Clearance
  Certificate, not older than 3 months"). No template; the user uploads
  their own.

Admin can add, remove, reorder, replace, and toggle required/optional —
all without a code change. New requirements take effect for new
submissions; existing in-flight applications are unaffected.

---

## Architecture

### Single table — `onboarding_requirements`

| Column | Notes |
|---|---|
| `id` | text PK |
| `name` | shown to user — e.g. "Credit Application" |
| `description` | shown under the card — e.g. "Sign all pages and date" |
| `templateUrl` | nullable — presence flips the row from "user-document slot" to "fillable template" |
| `templateMimeType` | nullable |
| `templateOriginalName` | nullable — the filename the user downloads |
| `templateSizeBytes` | nullable |
| `required` | bool — admin can mark a slot optional |
| `sortOrder` | int — drag-to-reorder index |
| `active` | bool — soft-delete; inactive rows preserve history but don't show on the form |
| `uploadedBy` | text, nullable — admin user id who created/edited |
| `createdAt`, `updatedAt` | timestamps |

### Linking the user's filled docs back

`company_documents` gets a new `requirementId` column (nullable, FK →
`onboarding_requirements.id`). User uploads on the onboarding form save
the requirement they answer, so the admin reviewer can see "Filled
Credit Application (their version)" next to "Credit Application (the
original template they downloaded)".

Existing hardcoded `type` enum on `company_documents` stays for
backwards-compat (rows already in the DB pre-migration). New rows can
either use the typed enum AND/OR the requirementId link.

### Email — links not attachments

Verification email gets a new "Documents to download and fill in"
section listing every active template with a public Supabase URL.
Avoids SMTP attachment limits + spam scoring; replacing a template
file updates the link without resending emails.

---

## Decisions

| Question | Answer |
|---|---|
| Initial seed | All 6 currently-hardcoded docs become rows: Company Reg / Proof of Address / RLA Export Cert / Bank Confirmation / Director's ID / Tax Clearance — all required, plus **VAT Cert as optional**. |
| Admin notification email recipient | `ADMIN_NOTIFICATIONS_EMAIL` env, falls back to `SUPPORT_EMAIL` (`cat@seairocargo.co.za`) for v1. |
| Email format for templates | List of links in verification email body — no attachments. |
| Replacing a template file | Updates the same row, same URL. No versioning. Old emails point at the latest. |
| In-flight users | Anyone already in `PENDING_REVIEW` keeps their existing docs unchanged. Only new submissions are validated against the active requirement set. |
| Scope of admin page | New route `/admin/settings/onboarding-requirements` (under settings). Drag-to-reorder, upload/replace template, toggle required, toggle active, delete. |

---

## Phases

### Phase A — Schema + seed ✅ DONE (awaiting db:push + seed run)

- [x] New table `onboarding_requirements` ([lib/db/schema/onboarding-requirements.ts](lib/db/schema/onboarding-requirements.ts)) with all columns from the design + indexes on `sortOrder` and `active`
- [x] `company_documents.requirementId` column added (nullable text, indexed) so user uploads link back to the requirement they answer
- [x] `TAX_CLEARANCE` added to the `company_document_type` enum
- [x] Seed script at [scripts/seed-onboarding-requirements.ts](scripts/seed-onboarding-requirements.ts) — idempotent, uses stable ids (`req-company-reg`, `req-proof-of-address`, `req-rla-export`, `req-tax-clearance`, `req-bank-confirmation`, `req-director-id`, `req-vat-cert`). 6 required + VAT optional.
- [x] Schema exported from `lib/db/schema/index.ts`

**Quick wins folded into Phase A:**
- [x] `sendAdminVettingNotificationEmail()` in [lib/email.ts](lib/email.ts) — branded layout, table of company/contact/email/userId/submittedAt, "Open vetting queue" CTA button. Routes to `ADMIN_NOTIFICATIONS_EMAIL` env, falls back to `SUPPORT_EMAIL`.
- [x] Wired into `POST /api/auth/onboarding` — fires alongside the in-app `adminNotifications` row, best-effort wrapped (email failures log a warning but don't fail the submission).

**Action on your side:**
- [ ] Run `npm run db:push` to apply the schema changes
- [ ] Run `npx tsx scripts/seed-onboarding-requirements.ts` once to populate the 7 initial rows

### Phase B — Admin CRUD page ✅ DONE

**API** (all admin-only)
- [x] `GET /api/admin/onboarding-requirements` — list all rows ordered by `sortOrder`
- [x] `POST /api/admin/onboarding-requirements` — create new row, auto-assigns next sortOrder
- [x] `PATCH /api/admin/onboarding-requirements/[id]` — edit name / description / required / active
- [x] `DELETE /api/admin/onboarding-requirements/[id]` — soft-delete (sets `active=false`, keeps row for history)
- [x] `PATCH /api/admin/onboarding-requirements/reorder` — bulk-update sortOrder
- [x] `POST /api/admin/onboarding-requirements/[id]/template` — set/replace fillable template (URL + metadata)
- [x] `DELETE /api/admin/onboarding-requirements/[id]/template` — remove template (row reverts to user-document slot)

**UI** at `/admin/users/requirements`
- [x] Drag-to-reorder via `@dnd-kit/sortable` with optimistic local update + persist
- [x] Inline editable name + description (click to edit, Enter to save / Esc to cancel)
- [x] Toggle Required ↔ Optional, Hide ↔ Show (soft delete)
- [x] Status pills: Required / Optional / Has template / Inactive
- [x] Per-row template controls: open original (target=_blank), replace, remove. Drop area changes to "Attach a fillable template" when none.
- [x] "Add new requirement" inline form at the bottom — name + description + required toggle
- [x] Inactive rows visually dimmed but still editable (so admin can re-activate)
- [x] "How this works" callout explaining user-document vs fillable-template

**Discoverability**
- [x] "Manage Onboarding Requirements" button added to the User Vetting page header — no sidebar growth
- [x] `STORAGE_PATHS.ONBOARDING_TEMPLATES` (`onboarding/templates`) added to Supabase config so template uploads have a clean path

### Phase C — Dynamic onboarding form ✅ DONE

- [x] `GET /api/auth/onboarding` returns the active requirement set alongside the user's status — single round-trip
- [x] `app/auth/onboarding/page.tsx` (server component) fetches active requirements and passes them to the form, so first render has them with no loading flash
- [x] `components/auth/onboarding-form.tsx` renders cards from the dynamic list instead of the hardcoded `DOC_META`
- [x] Each fillable-template card shows a "Download template" link (with the original filename) and the upload-completed-file button
- [x] Submit gating: every required active requirement must have an upload before submit enables
- [x] `POST /api/auth/onboarding` validates against the active required-requirements set; inserts persist `requirementId` plus a `SEED_TYPE_MAP[requirementId] ?? "OTHER"` mapping for backwards-compat with the legacy `type` enum

### Phase D — Verification email integration ⏳ TODO

- [ ] `sendVerificationEmail` in `lib/email.ts` accepts an optional `templates: Array<{ name; url; description? }>`
- [ ] Better Auth's `emailVerification.sendVerificationEmail` callback in `lib/auth/server.ts` queries active fillable templates and passes them in
- [ ] Email body gains a "Documents to download and fill in" section between the verify CTA and the "what's next" callout

### Phase E — Polish ⏳ TODO

- [ ] Admin review modal labels: dynamic doc names from `requirementId` join (falls back to the legacy enum-label map for old rows)
- [ ] Drag-to-reorder polish on admin page
- [ ] Empty state on admin page if no requirements exist
- [ ] "Match to requirement" affordance in admin review modal for legacy `company_documents` rows that don't have a `requirementId`

---

## Files to touch

### Phase A
- `lib/db/schema/company-documents.ts` — add `TAX_CLEARANCE` to enum + `requirementId` column
- `lib/db/schema/onboarding-requirements.ts` — new
- `lib/db/schema/index.ts` — export
- `lib/email.ts` — `sendAdminVettingNotificationEmail`
- `app/api/auth/onboarding/route.ts` — fire admin email post-submit
- Seed: probably a one-shot script under `scripts/seed-onboarding-requirements.ts` OR a server-side run-once on first admin-page visit

### Phase B
- `app/api/admin/onboarding-requirements/route.ts` — list + create
- `app/api/admin/onboarding-requirements/[id]/route.ts` — patch + soft-delete
- `app/api/admin/onboarding-requirements/[id]/template/route.ts` — upload + remove template
- `app/api/admin/onboarding-requirements/reorder/route.ts` — bulk sort
- `app/admin/settings/onboarding-requirements/page.tsx` — admin UI page
- `components/admin/onboarding-requirements-table.tsx` — main editable table
- `components/admin/onboarding-requirement-template-uploader.tsx` — file picker + upload

### Phase C
- `app/api/auth/onboarding/route.ts` — extend GET response, change POST validation
- `components/auth/onboarding-form.tsx` — render dynamic cards

### Phase D
- `lib/email.ts` — `sendVerificationEmail` template-list section
- `lib/auth/server.ts` — query templates before sending

### Phase E
- `components/admin/user-review-modal.tsx` — dynamic labels via `requirementId`

---

## Open questions

- [ ] Do we need versioning of templates (audit history of who uploaded which version when)? Out of scope for v1; the `updatedAt` column on the requirement is enough for now.
- [ ] Should there be a "preview" of the template (PDF inline) on the admin page, or is open-in-new-tab enough? V1: open in new tab.
- [ ] Do we surface inactive requirements to existing in-flight users so they can still see what they originally uploaded? V1: yes — read-side queries don't filter by `active`, only the form-rendering side does.
