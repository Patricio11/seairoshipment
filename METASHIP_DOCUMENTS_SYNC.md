# MetaShip Documents Sync — Progress Tracker

## Goal

After the admin creates a MetaShip Order and manually confirms it on MetaShip's side,
MetaShip generates finalised shipment documents for the whole container (shared
docs like the Ocean Bill of Lading, plus per-shipper documents like House Bill
of Lading). We need to pull those back and split them per client based on the
account number embedded in the filename.

- Each client has an `accountNumber` (e.g. `SRS-CLI-001`)
- Uploaded docs were named `{accountNumber}_{filename}` on our side
- MetaShip's finalised versions should retain that prefix in the document `name`
- On sync, we match on `accountNumber` substring to attach per-client documents
- Docs without a matching account number → container-level (visible to all
  clients on that container)

Client-facing UX: once a finalised version exists, the client's draft upload
is hidden from the main list (kept in DB for audit, surfaced behind a toggle).
Clients see the authoritative MetaShip version.

---

## Flow diagram

```
┌─────────────────────────────────────────────────────────────┐
│ ADMIN                                                        │
│  1. Create MetaShip Order (existing)                         │
│  2. Log into MetaShip manually → finalise + generate docs    │
│  3. In our system: click "Sync Documents from MetaShip" →    │
│     pulls all docs + splits by account number                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ CLIENT (per allocation)                                      │
│  sees 3 groups on the bookings page:                         │
│    1. Finalised by MetaShip (matched by account number)      │
│    2. Container Documents (shared, no account match)         │
│    3. Your Uploads (hidden by default — toggle to show)      │
└─────────────────────────────────────────────────────────────┘
```

---

## MetaShip API details (from metaShip_API_getDocuments_for_Order.html)

- **List:** `GET /public/v2/shipments/{systemReference}/documents`
- **Single:** `GET /public/v2/shipments/{systemReference}/documents/{documentId}`
- Scope: `shipment-documents:read` ✅ confirmed available on client's credentials
- Response shape:
  ```json
  {
    "shipmentReference": "887ab849-b040-408d-98e6-50eb4356a677",
    "documents": [
      {
        "id": 4218731,
        "name": "Certificate of Origin (COO)",
        "reference": "COO-2026-0142",
        "mimeType": "application/pdf",
        "sizeBytes": 184320,
        "version": 4,
        "completedAt": "2026-01-22T08:14:03.000Z",
        "downloadUrl": "https://...",
        "expiresAt": "2026-04-09T13:15:00.000Z"
      }
    ]
  }
  ```
- Excludes internal-only files (XLSX templates, cargo dues, SAD500 customs)
- Signed CloudFront URL, 15-minute TTL
- Our container's MetaShip systemReference is already stored in
  `containers.metashipReference` (set when admin creates the order)

---

## Decisions made

| Question | Answer |
|---|---|
| Match strategy | substring of user.accountNumber in MetaShip doc's `name` OR `reference` |
| Unmatched docs | container-level (METASHIP_SHARED) — visible to every client on that container |
| Draft UX when finalised exists | hide drafts from main list, keep in DB, expose behind a "Show drafts" toggle |
| Sync trigger | manual only for now (admin button) |
| Sync idempotency | upsert by MetaShip `documentId` unique per container |
| Signed URL refresh | lazy — on View click, if within 2 min of expiry, hit single-doc endpoint to refresh |

---

## Phases

### Phase A — Schema + MetaShip API client ⏳ TODO

- [ ] Add enum: `document_source` with values `CLIENT_UPLOAD`, `METASHIP_SHARED`, `METASHIP_CLIENT`
- [ ] Add columns to `documents`:
  - [ ] `source` (enum, default CLIENT_UPLOAD)
  - [ ] `metashipDocumentId` (integer, nullable)
  - [ ] `metashipReference` (text, nullable — e.g. "COO-2026-0142")
  - [ ] `metashipDownloadUrl` (text, nullable — cached signed URL)
  - [ ] `metashipUrlExpiresAt` (timestamp, nullable)
- [ ] Make `allocationId` explicitly nullable if not already (shared docs have no allocation)
- [ ] Push schema via `npm run db:push`
- [ ] Add to `lib/metaship.ts`:
  - [ ] `getMetaShipShipmentDocuments(systemReference)` — list
  - [ ] `getMetaShipShipmentDocument(systemReference, documentId)` — single, for URL refresh
  - [ ] Typed response interfaces

### Phase B — Admin sync endpoint ⏳ TODO

- [ ] `POST /api/admin/containers/[id]/sync-documents`
  - [ ] Load container, verify `metashipReference` exists (else 400)
  - [ ] Load allocations on this container + their users' account numbers
  - [ ] Call MetaShip GET list endpoint
  - [ ] For each MetaShip doc:
    - [ ] Search for an account number substring match in `name` or `reference`
    - [ ] If matched → `source=METASHIP_CLIENT`, `allocationId` set
    - [ ] If not → `source=METASHIP_SHARED`, `allocationId=null`, `containerId` tracked via a new column or via naming convention
  - [ ] Upsert by `metashipDocumentId` (if exists, update; else insert)
  - [ ] Cache `metashipDownloadUrl` + `metashipUrlExpiresAt`
  - [ ] Return summary: `{ total, matched, shared, inserted, updated }`

  **Consideration:** for shared docs, we currently require `allocationId`. Options:
  - (a) Relax `allocationId` to nullable and add `containerId` column to `documents`
  - (b) Create one row per allocation on the container, each pointing to the same MetaShip doc ID (higher row count but simpler queries)
  - Decision: **(a)** — cleaner data model; add `containerId` FK to documents

- [ ] Tracked column addition: `documents.containerId` (text, nullable, FK → containers.id)

### Phase C — Admin UI ⏳ TODO

- [ ] In admin bookings grid container detail dialog, next to "MetaShip Order" section:
  - [ ] Add "Sync Documents from MetaShip" button (visible only if container has `metashipOrderNo`)
  - [ ] Loading state with spinner
  - [ ] Success toast with summary `"Synced {N} docs — {M} matched to clients, {S} container-level"`
  - [ ] Failure toast with error reason

### Phase D — Display per-allocation (admin + client) ⏳ TODO

**Admin — client allocation popup (in bookings grid):**
- [ ] Fetch MetaShip-finalised + shared docs for the allocation
- [ ] Render 3 sections:
  - [ ] "Finalised by MetaShip" (METASHIP_CLIENT matched to this allocation)
  - [ ] "Container Documents" (METASHIP_SHARED for this container)
  - [ ] "Your Uploads (drafts)" — hidden behind a "Show drafts" toggle
- [ ] Each doc shows: name, reference (MetaShip), documentCode, View + Download

**Client — bookings page detail / resubmit dialog / ad-hoc viewer:**
- [ ] Same three sections, clients can only View (not edit)
- [ ] On the bookings list, show a badge "Documents available" once sync completes

### Phase E — Signed URL refresh ⏳ TODO

- [ ] `POST /api/admin/documents/[id]/refresh-url` (or GET with proper auth)
  - [ ] Reads doc → calls MetaShip single-doc endpoint → updates cached URL + expiry
  - [ ] Returns fresh `{ downloadUrl, expiresAt }`
- [ ] Client-side: before showing View, check expiry; if within 2 min, refresh first
- [ ] Add a note on the modal: "Download links expire in 15 minutes"

### Phase F — Polish + QA ⏳ TODO

- [ ] End-to-end test: create order → go to MetaShip → add a test doc prefixed with client account number → sync → confirm it lands on the right client
- [ ] Test shared doc: same sync → doc without account number → confirm it shows for all clients
- [ ] Test re-sync: second run just updates URLs, doesn't duplicate rows
- [ ] Test URL refresh after 15 min: view a doc, get fresh URL
- [ ] Update `PRODUCT_SAILING_REFACTOR.md` or reference this new tracker where appropriate

---

## Files to touch

### Schema
- `lib/db/schema/documents.ts` — add source enum, metashipDocumentId, etc.

### API client
- `lib/metaship.ts` — 2 new functions + types

### Server routes
- `app/api/admin/containers/[id]/sync-documents/route.ts` — new
- `app/api/admin/documents/[id]/refresh-url/route.ts` — new
- (Optional) `app/api/bookings/[allocationId]/documents/route.ts` — update GET to include source + filter drafts
- (Optional) `app/api/admin/allocations/[id]/documents/route.ts` — same

### UI
- `components/admin/admin-bookings-grid.tsx` — button in container detail, document list rewrites
- `app/dashboard/bookings/page.tsx` or related — client view of finalised docs
- Maybe a new reusable `AllocationDocumentsPanel` component used in both admin and client

---

## Open questions

- [ ] Confirm MetaShip actually preserves the account-number prefix in the `name` field of returned documents. If they rename them, we'll need a different strategy (maybe store `metashipUploadId` → `documentId` mapping from the upload step).
- [ ] For shared docs, should they be visible to every client (including past cancelled ones)? → Probably only CONFIRMED allocations. Clarify if edge case matters.
