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

### Phase 2 — Admin management pages ⏳ IN PROGRESS

- [ ] `/admin/products` page
  - [ ] Table: name, HS code, category, container count, active toggle, last synced
  - [ ] "Sync from MetaShip" button (calls sync endpoint)
  - [ ] Search
  - [ ] Inline edit for category (text input)
  - [ ] Inline toggle for active flag
  - [ ] Loading states + skeleton
  - [ ] Empty state ("No products synced — click Sync")
- [ ] `/admin/sailings` page
  - [ ] Table: vessel, voyage, route, ETD, ETA, transit, container count, active, last synced
  - [ ] "Sync from MetaShip" button with optional date-range inputs
  - [ ] Search by vessel/voyage/route
  - [ ] Filter by origin/destination
  - [ ] Loading + empty states
- [ ] Add both pages to the admin sidebar navigation
- [ ] Verify stats update after sync (container count matches what's in DB)

### Phase 3 — Container creation cascade ⏳ TODO

- [ ] Rewrite "Create Container" dialog in fleet-scheduler.tsx
- [ ] Cascading field order: Route → Sailing (filtered) → Container Type → Temperature (constrained by reefer/dry) → Product → Save
- [ ] Sailing dropdown shows only sailings on the chosen route from our `sailings` table
- [ ] Vessel, voyage, ETD, ETA auto-fill from selected sailing (read-only)
- [ ] Temperature options: reefer → [frozen, chilled], dry → [ambient]
- [ ] Product searchable dropdown (from `products` table, active only)
- [ ] Admin POST `/api/admin/containers` now requires sailingId, productId, temperature
- [ ] Validate: sailing.portOfLoadValue === route origin AND sailing.portOfDischargeValue === route destination
- [ ] Show product + temperature badges on container cards in fleet list

### Phase 4 — Client booking rewrite ⏳ TODO

- [ ] New client API: `GET /api/bookings/options?route=X&salesRateTypeId=Y`
  - Returns: `{ products: [...], temperatures: [...], sailings: [...] }`
  - Each list filtered to items that have at least one open container matching all prior selections
- [ ] Rewrite step-2-cargo.tsx: use /options endpoint, cascading filter
- [ ] Remove direct calls to `/api/metaship/products` and `/api/metaship/sailing-schedules` from client UI
- [ ] Update `/api/containers?route=X&salesRateTypeId=Y&productId=Z&temperature=W&sailingId=V` to filter all criteria
- [ ] "Request a container" button when no match:
  - [ ] Modal collecting: route, product, temperature, sailing, preferred dates, pallet count, notes
  - [ ] New schema: `container_requests` table (id, userId, route, productId, temperature, desiredEtd, palletCount, notes, status, createdAt)
  - [ ] POST /api/container-requests endpoint
  - [ ] Admin notification on submit
  - [ ] Admin tab "Container Requests" in bookings grid

### Phase 5 — Cleanup + Polish ⏳ TODO

- [ ] Deprecate `/api/metaship/products` (mark as legacy or remove)
- [ ] Deprecate `/api/metaship/sailing-schedules` (mark as legacy or remove)
- [ ] Sidebar icons for Products + Sailings pages
- [ ] Optional: cron job to auto-sync products weekly, sailings daily
- [ ] Update README / docs with new flow
- [ ] QA walkthrough: admin full cycle + client full cycle

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
