# Digital Vault — Documents Wire-Up

## Goal

The `/dashboard/documents` page (Digital Vault) had a real backend
underneath it — schema with allocation/container linkage, MetaShip
sync, ownership-checked APIs — but the UI rendered hardcoded `SHIPMENTS`
+ `allDocs` arrays and the upload dialog was a `setTimeout` placeholder.

Make the page actually use the data we already have, and turn the
upload / preview / download / delete actions into real handlers.

---

## Decisions

| Question | Answer |
|---|---|
| Where do client-uploaded files go in storage? | Supabase, path `STORAGE_PATHS.BOOKING_DOCUMENTS = "bookings/documents"` (already defined, was unused). |
| How are docs linked? | `documents.allocationId` (per-shipment) + `documents.containerId` (for container-shared MetaShip docs). POST now persists both so a future carrier-side sync can find allocation uploads via the container too. |
| Stored-name template | `{ACCOUNT}_{TYPE}_{REF}.{ext}` — kept exactly as it was. The MetaShip sync endpoint matches inbound carrier docs back to allocations by **substring of the user's account number** in `doc.name`, so any change here would break the round-trip. |
| Where does the Upload button live? | **Detail view only.** Removed from the list view because it has no allocation context there. List view's existing empty-state copy ("Select a shipment to view its documents") naturally guides the flow. |
| Can clients delete carrier-issued docs? | **No.** DELETE is constrained to `source = CLIENT_UPLOAD`. Carrier docs (`METASHIP_CLIENT`, `METASHIP_SHARED`) are visible + downloadable but never editable from the client. A lock badge labelled "Carrier" on those cards makes the read-only state obvious. |
| What does delete actually delete? | The DB row only. The Supabase file stays — same as `app/api/bookings/[allocationId]/documents/route.ts` already commented. Storage cleanup is a separate housekeeping concern, not a per-click action. |
| Schema additions | `mimeType` + `sizeBytes` on `documents`. Both nullable so existing rows back-fill cleanly; UI renders "—" when missing. |
| Server-side type validation | Accept what the upload dialog sends (mapped from a fixed dropdown to the `documentTypeEnum`). Mime/size are stored as metadata; we don't currently validate that, say, a `INVOICE` is actually a PDF. Out of scope for v1. |
| List status mapping | Same `deriveBookingStatus(allocation, container, depositInvoice)` used in `/api/dashboard/overview` and `/api/bookings`. Single source of truth for what a "shipment status" means across the app. |

---

## What was built

### Schema — [lib/db/schema/documents.ts](lib/db/schema/documents.ts)
- [x] Added `mimeType` (text, nullable)
- [x] Added `sizeBytes` (integer, nullable)

### APIs

#### [POST /api/bookings/[allocationId]/documents](app/api/bookings/[allocationId]/documents/route.ts)
- [x] Accepts `mimeType` and `sizeBytes` from the body
- [x] Now also persists `containerId` (from the allocation) so container-shared queries continue to find allocation uploads after admin sync runs

#### [DELETE /api/bookings/[allocationId]/documents?docId=…](app/api/bookings/[allocationId]/documents/route.ts)
- [x] Constrained to `source = CLIENT_UPLOAD` so carrier docs are immutable from the client
- [x] Returns 404 when no row matched (instead of silently succeeding) so the UI can toast a real error

#### [GET /api/dashboard/documents](app/api/dashboard/documents/route.ts) — new
- [x] Returns the user's allocations shaped as `Shipment[]` for the vault list
- [x] Per-row `docCount` = own uploads + container-level shared MetaShip docs (`METASHIP_SHARED` rows on the same container)
- [x] Status uses the shared `deriveBookingStatus(...)` so the badge matches `/dashboard` and `/dashboard/bookings`
- [x] Booking ref pulled from the deposit invoice (where bookingRef is canonical)

### Components

#### [components/documents/document-card.tsx](components/documents/document-card.tsx)
- [x] Click the file icon → opens the URL in a new tab
- [x] Dropdown menu: **Preview** (open in new tab), **Download** (anchor + `download` attr — streams from Supabase, no proxy), **Delete** (with confirm + toast)
- [x] Delete only renders when `source === "CLIENT_UPLOAD"`
- [x] Carrier badge with `Lock` icon on `METASHIP_CLIENT` / `METASHIP_SHARED` rows + a tooltip explaining why
- [x] Real file size formatted as B / KB / MB; null-safe `—`
- [x] Real `uploadedAt` formatted en-ZA short date
- [x] Calls `onDelete?.(id)` so parent can refresh

#### [components/documents/upload-dialog.tsx](components/documents/upload-dialog.tsx)
- [x] Now requires `allocationId` + `bookingRef` props (was previously running with no allocation context — that's why it was a `setTimeout` placeholder)
- [x] Removed the manual "Shipment Ref" input — the dialog already knows it
- [x] Added "Other" type option since the schema supports `OTHER`
- [x] Real upload pipeline:
  1. `uploadFile(file, STORAGE_PATHS.BOOKING_DOCUMENTS, storedName)` → Supabase
  2. `POST /api/bookings/[allocationId]/documents` with `{originalName, storedName, url, type, mimeType, sizeBytes}`
- [x] Stored-name template `{ACCOUNT}_{TYPE}_{REF}.{ext}` preserved for MetaShip round-trip matching
- [x] `onUploaded()` callback fires so the parent re-fetches docs without a page refresh

### Page — [app/dashboard/documents/page.tsx](app/dashboard/documents/page.tsx)
- [x] Hardcoded `SHIPMENTS` + `allDocs` constants gone
- [x] **List view** fetches `/api/dashboard/documents` once on mount
- [x] **Detail view** fetches `/api/bookings/[allocationId]/documents` when a shipment is selected; refreshes after upload or delete
- [x] Search input filters the active view: shipments on the list, doc names on the detail
- [x] Tab counts compute off the *filtered* docs so search + tabs combine intuitively
- [x] Empty states for: no shipments at all, no shipments matching search, no docs yet, no docs matching search/type
- [x] Loading states with Loader2 spinners
- [x] Detail view header shows route + vessel + voyage + status pill from real data

---

## Files touched

| File | New? | Purpose |
|---|---|---|
| `lib/db/schema/documents.ts` | modify | mimeType + sizeBytes columns |
| `app/api/bookings/[allocationId]/documents/route.ts` | modify | accept mime/size on POST, restrict DELETE to CLIENT_UPLOAD |
| `app/api/dashboard/documents/route.ts` | new | list user's shipments with doc counts |
| `app/dashboard/documents/page.tsx` | modify | replace placeholder data with real fetches |
| `components/documents/document-card.tsx` | modify | wire actions, add carrier badge, real metadata |
| `components/documents/upload-dialog.tsx` | modify | real Supabase upload + POST |

---

## Manual steps for you

1. Run `npm run db:push` — adds the `mime_type` + `size_bytes` columns to the `documents` table.
2. (Optional) Create a Supabase storage bucket named `srs-documents` if it doesn't exist already, with the `bookings/documents` path. Same bucket the rest of the app already uses.
3. Test the round-trip:
   - From `/dashboard/documents` open one of your bookings
   - Upload a small PDF → it should appear in the grid + the doc count on the list view should bump
   - Click the file icon → opens in a new tab
   - Three-dot menu → Download → file streams from Supabase
   - Three-dot menu → Delete → confirm → row disappears, toast confirms

---

## Reality check / deferred items

- **File size limit** — UI hints "Max size 10 MB" but the server doesn't reject larger uploads. Real cap belongs at the Supabase bucket policy level. Add a server-side check if abuse appears.
- **Virus scanning** — not implemented. If we ever take untrusted uploads from non-vetted clients, this becomes a launch blocker. Vetted-clients-only flow makes it lower priority for now.
- **Bulk delete / multi-select** — single-doc delete only. Most clients have ≤10 docs per shipment; bulk feels premature.
- **Share-link generation** — the previous Share menu item was removed because it was a no-op. If we ever want to share docs with a forwarder/buyer, generate a signed Supabase URL rather than a public one — defer until someone asks.
- **Storage cleanup on delete** — the DB row goes; the Supabase file stays. Build a periodic reaper (compare bucket contents vs `documents.url`) when storage cost becomes noticeable.
- **Server-side mime/type cross-check** — we trust the dropdown selection. A user could upload `.exe` and label it INVOICE. The `accept` attr filters in the file picker; an attacker could bypass it. Add a server-side mime sniff if abuse appears.
- **Per-document audit trail** — no changelog (who downloaded what when). Add when the user/customer needs an audit feature.

---

## Open questions

- [ ] Should the admin be able to upload to a client's allocation on their behalf? Current admin endpoint exists at `/api/admin/allocations/[id]/documents` but no UI page surfaces it. If yes, we'd build a mirror of this flow under `/admin/...`.
- [ ] Do we want an in-page PDF preview instead of opening in a new tab? Embedded PDF.js viewer is doable but adds bundle weight; out-of-page tab is the safest default for v1.
- [ ] When a document is `METASHIP_SHARED` (container-level), should it appear *under every allocation* on that container, or get its own visible "container documents" section? Current: appears under each allocation that pulls the endpoint. That's right for clients with one allocation per container; revisit if clients commonly have multiple allocations on the same container.
