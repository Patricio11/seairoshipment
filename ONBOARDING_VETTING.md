# Signup → Verify → Onboarding → Admin Vetting → Dashboard — Progress Tracker

## Goal

Only serious, vetted companies should land in the dashboard. Today the flow
is **signup → email verify → straight into dashboard**, even when `isVetted = false`
and we have no company info. We're closing that gap with a proper onboarding
step + admin approval gate + better signup UX.

---

## Target flow

```
1. Signup form           → name, company name, email, password + confirm + strength meter
                           (companyName persists into onboarding as pre-fill)

2. Email verification    → click link → emailVerified = true
                           Redirect to /auth/onboarding (NOT dashboard)

3. /auth/onboarding      → single-step form:
                              - Legal company name
                              - Company registration number
                              - Country
                              - Physical address
                              - VAT number (optional)
                              - Upload CIPC / registration cert (required)
                              - Upload proof of address (required)
                           On submit:
                              - Persist company fields on user row
                              - Save documents to company_documents table
                              - vettingStatus → PENDING_REVIEW
                              - Notify admin

4. Holding screen        → same /auth/onboarding route shows
                           "Application under review" when PENDING_REVIEW.
                           Login while pending always lands here.
                           Banner explains what's happening + ETA.

5. Admin vetting         → /admin/users page (already exists) shows real users
                           with PENDING_REVIEW status. Admin opens review modal,
                           sees company fields + can preview uploaded docs.
                              - Approve → isVetted = true,
                                          status = APPROVED,
                                          accountNumber assigned (already
                                          auto-generated at signup),
                                          welcome email sent.
                              - Reject  → status = REJECTED + rejectionReason,
                                          email sent with reason.
                              - Request changes → status back to ONBOARDING_PENDING
                                          + admin note. Email sent.
                                          User re-opens onboarding form to fix.

6. Dashboard             → only reachable when status = APPROVED.
                           Anything else → redirect to /auth/onboarding.
```

---

## Decisions made (vs my exploratory questions)

| Question | Decision |
|---|---|
| Onboarding required upfront? | **Required** — admin can't approve without company info. Friction is the point. |
| Documents required at onboarding? | **Required** — CIPC cert + proof of address. Saves admin a ping-pong round. |
| Reject vs Request-changes? | **Both** — reject is final, request-changes reopens the form with an admin note. |
| Approval/rejection email channel | Existing nodemailer SMTP via `lib/email.ts`. |
| Password strength rule | 4-tier meter (length / mixed-case / number / symbol). Min length 8. |
| Email-verified redirect | Change `/dashboard` → `/auth/onboarding`; the page itself decides what to render based on status. |

---

## State machine — `users.vettingStatus`

| State | What it means | What the user can do |
|---|---|---|
| `EMAIL_PENDING` | Just signed up, hasn't clicked the verify link | See "verify your email" screen |
| `ONBOARDING_PENDING` | Email verified, hasn't completed onboarding form yet (or admin reopened it) | Fill in onboarding form |
| `PENDING_REVIEW` | Onboarding submitted, waiting on admin | Holding screen + "we'll email you" |
| `APPROVED` | Vetted by admin → `isVetted = true` | Dashboard unlocked |
| `REJECTED` | Admin rejected | Read-only rejection screen with reason; contact-support CTA |

`isVetted` boolean is kept for backwards-compat (existing dashboard checks may rely on it later) but `vettingStatus` is the canonical state.

---

## Phases

### Phase A — Schema + types ✅ DONE (awaiting db:push)

- [x] `vetting_status` enum + `vettingStatus` column on `user` (default `EMAIL_PENDING`)
- [x] `vettingRejectionReason`, `vettingAdminNote`, `vettingReviewedAt`, `vettingReviewedBy` on `user`
- [x] `companyAddress`, `companyCountry`, `vatNumber` on `user`
- [x] New table `company_documents` with type enum (`COMPANY_REG_CERT | PROOF_OF_ADDRESS | VAT_CERT | OTHER`), userId FK with cascade, indexed by userId
- [x] Schema exported from `lib/db/schema/index.ts`
- [x] `User` type + `VettingStatus` exported from `types/index.ts`
- [ ] User to run `npm run db:push`

### Phase B — Signup form polish ✅ DONE

- [x] Company Name kept at signup (existing field) — persists onto `users.companyName`, will pre-fill onboarding
- [x] **Confirm Password** input added with its own eye toggle, red border + inline "Passwords don't match" error when they diverge
- [x] **4-tier strength meter** (4 segments + label): `Weak / Fair / Good / Strong`, scoring on length≥8, mixed case, number, symbol. Visible only after the user starts typing.
- [x] Submit button disabled until passwords match AND score ≥ 2 (Fair); duplicated as a runtime guard in `handleSubmit` with toast errors
- [x] `vettingStatus = "EMAIL_PENDING"` is the schema default — no extra wiring needed at signup

### Phase C — Onboarding API + page ✅ DONE

**API** ([app/api/auth/onboarding/route.ts](app/api/auth/onboarding/route.ts))
- [x] `GET` returns `{ status, fields, rejectionReason, adminNote, accountNumber, documents[] }` for the logged-in user. `fields.companyName` pre-fills from signup.
- [x] Lazy bumps `EMAIL_PENDING → ONBOARDING_PENDING` when emailVerified=true (server fallback in case redirect-side wiring is missed).
- [x] `POST` validates required fields + at least one `COMPANY_REG_CERT` and one `PROOF_OF_ADDRESS` doc. Persists user fields, replaces company_documents rows (so resubmit doesn't pile up), flips `vettingStatus` to `PENDING_REVIEW`, clears any prior `vettingAdminNote`, fires admin notification.
- [x] Storage path `STORAGE_PATHS.COMPANY_DOCUMENTS = "company/documents"` added.

**Form** ([components/auth/onboarding-form.tsx](components/auth/onboarding-form.tsx))
- [x] Two-column field grid (legal name, reg no, country, VAT, full-width address)
- [x] Three doc cards (CIPC required, Proof of address required, VAT optional) — emerald when uploaded with filename + remove button; dashed when empty with "Upload file" button
- [x] Country auto-uppercases to 2 chars
- [x] Submit disabled until all required fields + both required docs are uploaded
- [x] Admin-changes-requested banner at the top when `adminNote` is present

**Status screens** ([components/auth/onboarding-status-screens.tsx](components/auth/onboarding-status-screens.tsx))
- [x] `EmailPendingScreen` — gradient blue mail icon, masked email, resend button hitting `/api/auth/resend-verification`
- [x] `PendingReviewScreen` — amber clock, 4-step checklist (submitted ✓ / docs ✓ / review ⏳ / welcome ⏳), ETA copy + submitted-at timestamp
- [x] `ApprovedScreen` — emerald shield, account number callout, auto-redirect to `/dashboard` after 2.5s + manual button
- [x] `RejectedScreen` — red shield, reason quoted in red card, support email CTA

**Page** ([app/auth/onboarding/page.tsx](app/auth/onboarding/page.tsx))
- [x] Server component, force-dynamic. Redirects unauthenticated → `/`, admin → `/admin`. Same lazy-bump as the API for safety.
- [x] Branded header (Seairo logo + "ONBOARDING" pill) and clean gradient background
- [x] Renders the right sub-view based on `vettingStatus`

### Phase D — Dashboard gate + post-verification redirect ✅ DONE

- [x] `requireRole()` ([lib/auth/server.ts](lib/auth/server.ts)) now does an extra DB read for clients and redirects to `/auth/onboarding` unless `vettingStatus = APPROVED`. Admins are unaffected.
- [x] `/auth/verified` page ([app/auth/verified/page.tsx](app/auth/verified/page.tsx)) now routes clients to `/auth/onboarding` (not `/dashboard`) post-verification, with copy adjusted ("Just one more step — finishing your onboarding…"). Admins still go to `/admin`.
- [x] Status bump from `EMAIL_PENDING → ONBOARDING_PENDING` happens server-side in two places (Phase C: `/api/auth/onboarding` GET + the onboarding page itself), so verified users always see the right sub-view regardless of redirect quirks.
- [x] Existing dashboard layout calls `requireRole(["client"])` → automatically picks up the new vetting gate, no change needed at the layout file.

### Phase E — Admin vetting (real data + actions) ✅ DONE

- [x] `GET /api/admin/users/vetting` ([route.ts](app/api/admin/users/vetting/route.ts)) — returns every client user with company fields + uploaded documents inlined. Single round-trip for the table.
- [x] `PATCH /api/admin/users/[id]/approve` — sets `isVetted=true`, `vettingStatus=APPROVED`, stamps reviewer, assigns `accountNumber` if missing, drops a client notification. Email send is a TODO for Phase F.
- [x] `PATCH /api/admin/users/[id]/reject` — requires `reason`, stores it on `vettingRejectionReason`, drops a client notification. Email TODO Phase F.
- [x] `PATCH /api/admin/users/[id]/request-changes` — requires `note`, flips status back to `ONBOARDING_PENDING` so the client can edit, drops a client notification. Email TODO Phase F.
- [x] Vetting table rewritten ([user-vetting-table.tsx](components/admin/user-vetting-table.tsx)) — real data, four-tab pill (Pending Review / Approved / Rejected / All) with live counts, search across company/contact/email/reg-no, refresh button, friendly empty state, click-row-to-review.
- [x] Review modal ([user-review-modal.tsx](components/admin/user-review-modal.tsx)) — status pill, contact line with verified-email tick, prior rejection reason / admin note pinned, company info grid, document list with open-in-new-tab links, and the three actions. Reject + Request-changes both prompt for a textarea before confirming.

### Phase F — Emails ✅ DONE

`lib/email.ts` rewritten with a shared brand layout helper (`emailLayout` + `ctaButton`) so every email looks the same: gradient header, padded card body, footer with support email + year.

- [x] `sendVerificationEmail` — refreshed copy that mentions onboarding ("After verifying we'll guide you through a quick onboarding…") plus a "What's next" callout
- [x] `sendPasswordResetEmail` — refreshed to use the brand layout
- [x] `sendOnboardingSubmittedEmail(to, companyName)` — fired from `POST /api/auth/onboarding` after submission. Yellow "Under review" callout + "Check application status" button to `/auth/onboarding`.
- [x] `sendApprovalEmail(to, accountNumber, companyName)` — fired from `PATCH /api/admin/users/[id]/approve`. Emerald header, big monospace account number callout, "Go to dashboard" button.
- [x] `sendRejectionEmail(to, reason, companyName)` — fired from `PATCH /api/admin/users/[id]/reject`. Red header, reason quoted in a red card, support email CTA.
- [x] `sendRequestChangesEmail(to, adminNote, companyName)` — fired from `PATCH /api/admin/users/[id]/request-changes`. Amber header, note in a yellow card, "Update your application" button back to `/auth/onboarding`.
- [x] All sends are best-effort wrapped in try/catch — email failures log a console warning but don't fail the request, so admin actions and onboarding submissions still succeed if SMTP is misconfigured.
- [x] Used `escapeHtml` helper to safely interpolate user-provided fields (companyName, reason, adminNote) so we don't HTML-inject our own emails.

---

## Files to touch

### Phase A
- `lib/db/schema/users.ts` — new columns + enum
- `lib/db/schema/company-documents.ts` — new file
- `lib/db/schema/index.ts` — export
- `types/index.ts` — `User` interface

### Phase B
- `components/auth-panel.tsx`

### Phase C
- `app/api/auth/onboarding/route.ts` — new
- `app/auth/onboarding/page.tsx` — new
- `components/auth/onboarding-form.tsx` — new (form section)
- `components/auth/onboarding-status-screens.tsx` — new (holding/rejected/etc)

### Phase D
- `lib/auth/server.ts` — `requireRole` update
- `app/auth/verified/page.tsx` — redirect change + status bump

### Phase E
- `app/api/admin/users/pending-review/route.ts` — new
- `app/api/admin/users/[id]/approve/route.ts` — new
- `app/api/admin/users/[id]/reject/route.ts` — new
- `app/api/admin/users/[id]/request-changes/route.ts` — new
- `components/admin/user-vetting-table.tsx` — replace mock with real
- `components/admin/user-review-modal.tsx` — new

### Phase F
- `lib/email.ts` — four new senders

---

## Open questions to revisit later

- [ ] Should we also require **proof of trade volume** (e.g. last invoice, business plan) for higher-tier accounts? Out of scope for v1.
- [ ] Should rejected users be able to re-apply, or is rejection final? Default: rejection is final; if the user contacts support, admin can manually flip them back to `ONBOARDING_PENDING`.
- [ ] Do we want a **client-uploaded annual review** flow once they're approved? Out of scope — separate feature.
