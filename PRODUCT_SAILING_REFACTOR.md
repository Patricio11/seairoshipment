# Product + Sailing Refactor — Progress Tracker

## Goal

Restructure the booking flow so that a container is **locked to a single product, temperature, and sailing** at creation time by the admin. Clients then see only what's already available in our system (synced from MetaShip), and pick a container that matches all their criteria. If nothing matches, they can **Request a container** instead of hitting a dead end.

**Why:** A reefer physically can't mix frozen fish with ambient fruit, or two sailings. The current flow (client picks anything, then we filter) lets operationally-impossible consolidations through.

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│ ADMIN                                                        │
│  1. Sync Products from MetaShip    → our `products` table   │
│  2. Sync Sailings from MetaShip    → our `sailings` table   │
│  3. Create Container (cascading):                            │
│       Route → Sailing → ContainerType → Temperature →        │
│       Product → Save                                          │
│  Container row now has: sailingId, productId, temperature    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ CLIENT                                                       │
│  1. Booking Type (SRS/SCS)                                   │
│  2. Route (origin → destination)                             │
│  3. Product (filtered to products with open containers on    │
│     this route + service type)                               │
│  4. Temperature (filtered similarly)                         │
│  5. Sailing (filtered to sailings with matching open         │
│     containers)                                              │
│  6. Pick container OR "Request a container" if no match      │
└─────────────────────────────────────────────────────────────┘
```

**Key principle:** a client-facing list (products, sailings, temperature options) should only show values for which an OPEN or THRESHOLD_REACHED container actually exists that matches everything else they've picked so far.

---

## Scope & Phases

### Phase 1 — Foundations (schema + sync) ✅ DONE

- [x] New schema: `products` table
  - `id` (prefixed `prd-<metashipId>`), `metashipId`, `name`, `hsCode`, `description`, `category`, `active`, `lastSyncedAt`
- [x] New schema: `sailings` table
  - `id` (prefixed `sail-<metashipId>`), `metashipId`, `vesselName`, `voyageNumber`, `shippingLine`, ports, countries, `etd`, `eta`, `transitTime`, `serviceType`, `active`, `lastSyncedAt`
- [x] `containers` table: add `sailingId`, `productId`, `temperature` (enum: frozen / chilled / ambient)
- [x] Push schema to DB
- [x] `POST /api/admin/products/sync` — pulls from `/public/v2/product`, upserts by metashipId
- [x] `GET /api/admin/products` — list with container usage count
- [x] `PUT /api/admin/products` — update category/active
- [x] `POST /api/admin/sailings/sync` — iterates all origin×destination pairs, fetches from `/public/v2/sailing-schedules`, MSC-only filter, upserts
- [x] `GET /api/admin/sailings` — list with container usage count, future-only by default

### Phase 2 — Admin management pages ✅ DONE

- [x] `/admin/products` page
  - [x] Table: name, HS code, category, container count, active toggle
  - [x] "Sync from MetaShip" button (calls sync endpoint)
  - [x] Search (name, HS code, description, category)
  - [x] Inline edit for category (click to edit, Enter to save, Esc to cancel)
  - [x] Inline toggle for active flag
  - [x] Loading states + empty states
- [x] `/admin/sailings` page
  - [x] Table: vessel/voyage, route, ETD, ETA, transit time, service type, container count
  - [x] "Sync from MetaShip" dialog with date-range inputs (default: today → +90 days)
  - [x] Search by vessel/voyage/port
  - [x] Future-only toggle (default) / include past sailings toggle
  - [x] Loading + empty states
- [x] Add both pages to admin sidebar navigation (icons: Apple for Products, Anchor for Sailings)
- [ ] Verify stats update after sync (deferred — will confirm once user does a real sync)

### Phase 3 — Container creation cascade ✅ DONE

- [x] Rewrite "Create Container" dialog in fleet-scheduler.tsx
- [x] Cascading field order: 1. Route → 2. Sailing (filtered) → 3. Container Type → 4. Temperature (constrained by reefer/dry) → 5. Product
- [x] Sailing dropdown shows only sailings on the chosen route. Shows vessel, voyage, ETD inline.
- [x] Vessel, voyage, ETD, ETA auto-fill from selected sailing server-side
- [x] Temperature: three buttons (frozen / chilled / ambient). Disabled ones greyed out. Dry container auto-selects ambient. Reefer clears ambient when switched from dry.
- [x] Product: searchable combobox (Command + Popover). Searches by name or HS code. Shows HS code + category in results. Limit 200.
- [x] Admin POST `/api/admin/containers` now requires sailingId, productId, temperature (validates all and rejects bad combos). Vessel/voyage/ETD/ETA are derived from sailing server-side.
- [x] PUT /api/admin/containers/[id] accepts the same fields on edit
- [x] Validates: sailing.portOfLoadValue === route origin AND sailing.portOfDischargeValue === route destination
- [x] Validates: temperature matches container category (reefer → frozen|chilled, dry → ambient)
- [x] Validates: product exists and is active
- [x] Container cards now show product + temperature badges (emerald for product, sky/amber for cold/ambient)
- [x] GET /api/admin/containers now joins products + sailings so list shows productName, sailingVessel, sailingVoyage
- [x] Empty-state message when a route has no synced sailings yet — tells admin to sync first

### Phase 4 — Client booking rewrite ✅ DONE

- [x] New client API: `GET /api/bookings/options?route=X&salesRateTypeId=Y[&productId=Z&temperature=W]`
  - Returns: `{ products, temperatures, sailings, totalContainers }`
  - Cascading filter: products list ignores productId/temperature; temperatures narrow by productId; sailings narrow by product+temp. Only values present on OPEN/THRESHOLD_REACHED containers with remaining capacity are returned.
- [x] Rewrite step-2-cargo.tsx: uses `/api/bookings/options`, each selection re-fetches and clears downstream selections
- [x] Removed client-side calls to `/api/metaship/products` and `/api/metaship/sailing-schedules`; those routes marked `@deprecated` but kept for admin use
- [x] `/api/containers` now accepts productId, temperature, sailingId and filters by all. Joins products + sailings to return productName + sailingVessel in slots
- [x] "Request a container" modal (RequestContainerDialog):
  - Prefilled with whatever the client has selected so far (route, product, temp, sailing, pallet count)
  - Fields: pallet count (required), desired ETD (optional), commodity notes (when no product selected), free-form notes
  - Amber CTA banner appears when any cascading step returns 0 options
  - Secondary "can't find what you need?" link always visible once route is picked
  - Also shown in the no-match empty state on the container-pick stage
- [x] `container_requests` schema + enum (PENDING / ACKNOWLEDGED / FULFILLED / DECLINED)
- [x] `POST /api/container-requests` — client-facing endpoint. Creates admin notification + client confirmation notification. Returns { id }
- [x] `GET /api/container-requests` — client lists own requests
- [x] `GET /api/admin/container-requests` — admin list with user/product/sailing joins
- [x] `PATCH /api/admin/container-requests/[id]` — admin updates status (ACKNOWLEDGED / FULFILLED / DECLINED) with optional message. Client gets BOOKING_APPROVED / BOOKING_REJECTED / GENERAL notification.
- [x] Admin tab "Container Requests" in bookings grid with Respond dropdown (Mark as reviewing / Mark as fulfilled / Decline) → confirmation dialog with optional response text

### Phase 5 — Product Categories + Document checklist ⏳ IN PROGRESS

**Why:** A container carrying "Hake" alone is too specific. Real consolidation
works at the category level: "Frozen Seafood" accepts hake / squid / yellow tail
all on the same reefer. Categories also drive the required-documents list —
different cargo types need different export certs (PPECB for perishables,
CITES for hunting trophies, SAWIS for wine, etc.).

**Client still picks the specific product** (we need the HS code for the
allocation). Category is purely server-side: product → category → containers
that match. On step 3 (docs), the client sees the category's required-doc
checklist and uploads each one tagged with its code.

#### Schema

- [x] New `product_categories` table: id, name, description, salesRateTypeId,
  allowedTemperatures (jsonb string[]), requiredDocuments (jsonb string[]), active
- [x] `products.categoryId` (nullable FK)
- [x] Replace `containers.productId` with `containers.categoryId`
  (kept legacy `product_id` column in DB; code no longer reads from it)
- [x] `documents.documentCode` (new text column — stores specific doc code
  like COMMERCIAL_INVOICE, PPECB_HEALTH_CERTIFICATE)
- [x] DB push

#### Constants

- [x] `lib/constants/document-types.ts` — 17 predefined doc types with codes + labels + descriptions
- [x] `documentLabel(code)` helper for rendering

#### Seed data (to be done at end)

- [ ] Seed 8 starter categories:
  - SRS: Frozen Seafood (frozen), Poultry (frozen), Meat (chilled+frozen),
    Dairy (chilled+frozen), Fruit (chilled)
  - SCS: Hunting Trophies (ambient), Wine & Spirits (ambient), Other Dry Mixed (ambient)
- [ ] Each with the correct requiredDocuments list per Documents_needed_per_commodity.md

#### APIs

- [ ] `GET /api/admin/product-categories` — list with assigned-product count + container-usage count
- [ ] `POST /api/admin/product-categories` — create
- [ ] `PATCH /api/admin/product-categories/[id]` — update name/description/temps/docs/active
- [ ] `DELETE /api/admin/product-categories/[id]` — delete (reject if used by any container)
- [ ] `GET /api/admin/product-categories/[id]` — detail with assigned products list
- [ ] `POST /api/admin/product-categories/[id]/products` — bulk assign products
- [ ] `DELETE /api/admin/product-categories/[id]/products` — bulk un-assign
- [ ] Update `GET /api/admin/products` — container count now comes from category (containers with same categoryId)
- [ ] Update `GET /api/admin/containers` — join product_categories instead of products; return categoryName
- [ ] Update `POST /api/admin/containers` — require categoryId (replaces productId). Validate temperature is in category.allowedTemperatures.
- [ ] Update `PATCH /api/admin/containers/[id]` — accept categoryId

- [ ] Update `GET /api/bookings/options` — products list is now narrowed to "products in categories with matching open containers". Internally: containers → categoryIds → products with those categoryIds.
- [ ] Update `GET /api/containers?productId=X...` — still filters by productId, but resolves to category server-side: looks up product.categoryId and filters containers.categoryId = that.

- [ ] Update `POST /api/bookings` — validate the chosen product belongs to a category that matches the chosen container's category.
- [ ] Update `POST /api/bookings/[id]/upload` & `POST /api/bookings/[id]/documents` — accept `documentCode` and save it.

#### Admin UI

- [ ] `/admin/categories` page (table view)
  - Columns: Name, Service Type badge, Allowed temps (chips), Products count, Open containers count, Required docs count, Active toggle
  - Create dialog: name, description, service type (auto-restricts temperature options — SCS locked to ambient), multi-select temps, multi-select required docs, active
  - Row click → detail view with assigned products + "Add products" searchable multi-select
- [ ] Add "Categories" entry to admin sidebar (between Products and Commodities)
- [ ] Update fleet-scheduler Create Container dialog:
  - Replace step 5 "Product" with step 5 "Category" (searchable dropdown)
  - Step 4 "Temperature" options now constrained by selected category's allowedTemperatures
  - Remove category-less products from any dropdown

#### Client UI

- [ ] Update step-2-cargo:
  - Product dropdown: each product shown has its category badge
  - Only products with a category AND matching open containers appear
  - Temperature options come from the category's allowedTemperatures filtered by available containers
- [ ] Update step-3-docs:
  - Render required-docs checklist from the product's category
  - Each slot: doc label + description tooltip + upload button OR "uploaded" state with filename
  - "Upload extra document" button for ad-hoc docs (saved with code=OTHER)
  - Block submit if required docs missing (or warn)
  - Show completion count ("4 of 8 required documents uploaded")

#### Admin review (display)

- [ ] In the client popup on Bookings tab, show each doc with its `documentCode` label instead of generic type
- [ ] Group docs by required vs other

#### Tracker maintenance + cleanup

- [ ] Update this file at each milestone
- [ ] Drop the legacy `products.category` (freeform string) column after categories are live
- [ ] Drop the legacy `containers.product_id` column once we've verified nothing reads from it

---

## Decisions made

| Question | Decision |
|---|---|
| Product granularity | Specific product per container (not category). Can relax later if needed. |
| Temperature storage | On container (not allocation). Admin locks it at creation. |
| Sync frequency | Manual button for now. Cron later if it becomes a hassle. |
| Backwards compat | Not needed — not in production yet. |
| No-match UX | "Request a container" form → admin notification + Container Requests tab. |
| Client visibility | Only products/sailings/temperatures that have at least one OPEN container matching. |
| Sailing carrier filter | MSC only (same as current logic). |

---

## Files touched

### Phase 1 (done)

- `lib/db/schema/products.ts` (new)
- `lib/db/schema/sailings.ts` (new)
- `lib/db/schema/containers.ts` (modified — added sailingId, productId, temperature)
- `lib/db/schema/index.ts` (re-export products + sailings)
- `app/api/admin/products/route.ts` (new — list + update)
- `app/api/admin/products/sync/route.ts` (new)
- `app/api/admin/sailings/route.ts` (new)
- `app/api/admin/sailings/sync/route.ts` (new)

### Phase 2 (pending)

- `app/admin/products/page.tsx` (new)
- `components/admin/products-manager.tsx` (new)
- `app/admin/sailings/page.tsx` (new)
- `components/admin/sailings-manager.tsx` (new)
- `components/admin/admin-sidebar.tsx` (modify — add nav entries)

### Phase 3 (pending)

- `components/admin/fleet-scheduler.tsx` (rewrite create dialog)
- `app/api/admin/containers/route.ts` (require new fields)
- `app/api/admin/containers/[id]/route.ts` (accept new fields on edit)

### Phase 4 (pending)

- `lib/db/schema/container-requests.ts` (new)
- `app/api/bookings/options/route.ts` (new)
- `app/api/containers/route.ts` (filter by product/temperature/sailing)
- `app/api/container-requests/route.ts` (new)
- `components/booking/step-2-cargo.tsx` (rewrite)
- `components/booking/request-container-dialog.tsx` (new)
- `components/admin/admin-bookings-grid.tsx` (new Container Requests tab)

---

## Open questions / to confirm

- Should products have a manually-set "priority" or "display order" field for the client dropdown? (Not doing for now — alphabetical.)
- If a container is marked as BOOKED/SAILING, should its product/sailing/temp still be editable by admin? (Currently yes at schema level; may want to lock in UI.)
