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

### Phase A — Schema + MetaShip API client ✅ DONE

- [x] Add enum: `document_source` with values `CLIENT_UPLOAD`, `METASHIP_SHARED`, `METASHIP_CLIENT`
- [x] Add columns to `documents`:
  - [x] `source` (enum, default CLIENT_UPLOAD)
  - [x] `metashipDocumentId` (integer, nullable)
  - [x] `metashipReference` (text, nullable — e.g. "COO-2026-0142")
  - [x] `metashipDownloadUrl` (text, nullable — cached signed URL)
  - [x] `metashipUrlExpiresAt` (timestamp, nullable)
- [x] Make `allocationId` explicitly nullable (shared docs have no allocation)
- [x] Schema pushed via direct SQL (additive-only)
- [x] `lib/metaship.ts` additions:
  - [x] `getMetaShipShipmentDocuments(systemReference)` — list
  - [x] `getMetaShipShipmentDocument(systemReference, documentId)` — single, for URL refresh
  - [x] `MetaShipShipmentDocument` interface

### Phase B — Admin sync endpoint ✅ DONE

- [x] `POST /api/admin/containers/[id]/sync-documents`
  - [x] Loads container, verifies `metashipReference` exists (else 400)
  - [x] Loads allocations on this container + their users' account numbers
  - [x] Calls MetaShip GET list endpoint
  - [x] For each MetaShip doc:
    - [x] Searches for account number substring match in `name` or `reference`
    - [x] If matched → `source=METASHIP_CLIENT`, `allocationId` set
    - [x] If not → `source=METASHIP_SHARED`, `allocationId=null`, `containerId` set
  - [x] Upserts by `(containerId, metashipDocumentId)`
  - [x] Caches `metashipDownloadUrl` + `metashipUrlExpiresAt`
  - [x] Returns summary: `{ total, matched, shared, inserted, updated }`
- [x] `documents.containerId` (text, nullable, FK → containers.id) added

### Phase C — Admin UI ✅ DONE

- [x] "Sync Documents from MetaShip" button in container detail dialog (below MetaShip Order panel, only when `metashipOrderNo` present)
- [x] Loading state with spinner (`syncingDocs` state)
- [x] Success/failure toasts with summary counts

### Phase D — Display per-allocation (admin + client) ✅ DONE

**Shared component:** `components/admin/allocation-docs.tsx` — reused by both admin + client.
Three sections: Finalised by MetaShip (emerald) / Container Documents (sky) /
Client Uploads-drafts (slate, collapsed behind toggle when finalised versions exist).

**Admin:**
- [x] `admin-bookings-grid.tsx` client allocation popup uses `<AllocationDocs/>`
- [x] GET `/api/admin/allocations/[id]/documents` returns `{ flat, clientUploads, finalisedFromMetaShip, containerDocuments }`

**Client:**
- [x] `booking-detail-dialog.tsx` fetches + renders `<AllocationDocs/>` with inline viewer
- [x] `resubmit-booking-dialog.tsx` updated to unwrap `{ clientUploads }` response
- [x] GET `/api/bookings/[allocationId]/documents` returns same grouped shape

### Phase E — Signed URL refresh ✅ DONE

- [x] `POST /api/admin/documents/[id]/refresh-url`
  - [x] Reads doc → calls MetaShip single-doc endpoint → updates cached URL + expiry
  - [x] Returns fresh `{ downloadUrl, expiresAt }`
- [x] Client-side: `openViewDoc` checks expiry in admin grid; if within 2 min, refreshes first

### Phase F — Polish + QA ⏳ IN PROGRESS

**Code polish (done in this pass):**
- [x] Client GET route surfaces `metashipDownloadUrl` (selects full row)
- [x] Client GET route guards against null `containerId` (avoids bad `OR`)
- [x] "Download links expire in 15 minutes" note on client view modal (shown when doc is from MetaShip)
- [x] Full typecheck passes (`tsc --noEmit`)

**Manual QA with live MetaShip (requires admin steps):**
- [ ] E2E: create order → go to MetaShip → add a test doc prefixed with client account number → sync → confirm it lands on the right client
- [ ] Shared doc: sync with a doc that has no account number → confirm it shows for every allocation on the container
- [ ] Re-sync idempotency: second run should show `inserted:0, updated:N` and not create duplicate rows
- [ ] URL refresh: view a doc, wait 15+ min, view again → admin path auto-refreshes via `/api/admin/documents/[id]/refresh-url`

**Known gap (admin-only refresh):**
- Client-side viewer currently shows whatever URL the DB has cached. If it's stale, the client should reopen after an admin re-sync. A client-facing refresh endpoint could be added later if needed; flagged but intentionally out of scope for this pass.

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
