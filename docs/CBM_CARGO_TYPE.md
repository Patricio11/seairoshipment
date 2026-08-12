# CBM Calculator & Cargo Type (Pallet vs Cube) - Progress Tracker

## Goal

Add a **Cargo Type** dimension to SCS:

- **Pallet** - keeps the existing flow (pallet count slider, per-pallet pricing).
- **Cube** - a new flow built around a reusable **CBM Calculator** that lives under a dedicated **Tools** section. Clients save named calculations, see a 3D preview of how the cargo fits, and reuse those calculations when booking.

SRS stays pallet-only - reefer cargo is always palletised.

The booking wizard stays light: a Cube booking is just *pick a container + pick a saved calculation*. All the heavy lifting (item entry, unit conversion, 3D visualisation, download) lives in the standalone calculator under `/dashboard/tools/cbm-calculator`.

---

## Architecture at a glance

```
TOOLS                                    BOOKING
─────────────                            ──────────────────
/dashboard/tools                         Step 1 · route + sailing
└─ cbm-calculator                        Step 2 · cargo type? ──┐
   ├─ /                  (list)                                 │
   ├─ /new               (create)                       ┌───────┴───────┐
   └─ /[id]              (view + edit + download)       │               │
                                                     Pallet            Cube
   Each calc = name + items[] +                          │               │
   totals + 3D snapshot                          existing flow    pick container
                                                                  + pick saved calc
                                                                  ─→ snapshot + cbm
```

**Containers** are now created with a `cargoType` lock - Pallet OR Cube, never both. Booking filters containers by cargo type. Rate cards carry the same discriminator so pricing follows naturally.

---

## What's out there - research notes (May 2026)

Quick scan of the established tools in this space so we know what's table-stakes vs differentiated.

| Tool | What they do well | What they're missing |
|---|---|---|
| **[pier2pier.com](https://www.pier2pier.com/loadcalc/)** | 3D load calculator with palletisation, custom equipment dimensions, separate door measurements, link-share, PDF export | Generic - no live rates, no real fleet, no platform integration |
| **[CBM3.net](https://www.cbm3.net/)** | 16 container types incl. reefer/open-top/flatrack, loading-sequence 3D playback, NMFC freight class, 5 pallet standards, CSV import, product library, multi-currency cost calc, branded PDFs in 12 languages, keyboard shortcuts | Subscription paywall. Cargo-only - disconnected from any actual carrier or operational data. |
| **Freightos / DHL / UPS calculators** | Chargeable weight, HS-code lookup, rate-band estimates, transit time | Stop at "here's an estimate" - can't carry through to a real booking |

**Common across all of them** (table-stakes we must match):
- CBM + volumetric weight (sea 1:1000, air 1:6000/1:167, road 1:333)
- Multiple input units (cm/in/m/ft, kg/lb)
- Multi-item entry
- Container fit table for 20ft / 40ft / 40ft HC
- PDF / link export
- Some flavour of save/history

**Common gap across all of them**: they're islands. The CBM number doesn't get you closer to a booking - you still have to call a forwarder, swap emails, re-enter dimensions, get a quote, then book. Every step is a chance for the deal to drop.

---

## Killer features - what *only* Seairo can do

These exist precisely because we're a **platform**, not a calculator. None of the tools above can copy them without rebuilding their whole product. **These are the ones that turn the Tools section from "nice utility" into "the reason clients log in".**

### Tier 1 - must ship in v1

1. **Quote from real rate cards in one click.** A calc reads SCS rate cards for the user's typical/last-used route, applies the live FX, and shows `R XX,XXX estimated for 12.5 m³ CPT → RTM` right inside the calculator. No other tool can do this because no other tool has rate cards specific to *us*. Endpoint: extend `/api/rates/quote` to accept a cbm volume + route → return CostBreakdown. Display: a "Live SCS quote" card on the calculator page next to the totals.

2. **"Which of *your* containers fits this?"** The calculator queries open containers on the client's recent routes and shows a smart-match list:
    > MSC TOGO Voy 921 · ZACPT → GBLGP · **8.5 m³ remaining** · **cut-off in 2d 14h** · your 6.2 m³ fits with 2.3 m³ to spare → [Book this]
   Generic calculators can't do this - they don't know our fleet. We're already serving live containers + cut-offs to the dashboard, this is the same data joined to the calc.

3. **One-click "Use this calc to book"** from any saved calculation. Pre-fills the wizard with the calc's items, the matched container, and skips the cargo-type gate. Cuts a Cube booking from ~5 minutes to ~30 seconds.

4. **Cargo item library - seeded + personal.** Admin-curated common items per category (Wine 12-bottle case 350×300×230mm, Hunting trophy crate, Chocolate 24-bar carton, etc.) plus the user's own "saved items". When they add a row in the calculator, they can pick from a searchable presets dropdown instead of typing dimensions every time. Dimensions stay editable. Pier2pier doesn't have this; CBM3 has a generic "product library" but no industry-curated content.

5. **Bulk paste from a packing list.** Forwarders paste rows from Excel/email with `Description, Qty, L, W, H, Weight` columns. We parse, snap units, and add all rows at once. CSV upload is the same path via file picker. Saves 5+ minutes per booking; this alone justifies the section to a forwarder client.

6. **Share-by-link with the consignee or buyer** (read-only public URL, optional expiry). Forwarders constantly need to confirm dimensions with consignees before booking; a read-only link kills the email back-and-forth. Different from pier2pier's link-share because it's *gated and audit-trailed* - we know who accessed it and when.

### Tier 2 - also ships in v1 (cheap, brand-on)

7. **Pallet-equivalent indicator.** Show "≈ 5.2 standard pallets" alongside the CBM. Bridges the mental model for clients used to thinking in pallets, especially when comparing Cube vs Pallet booking for the same shipment.

8. **Cut-off urgency banner on the calculator.** If the user is calculating against a specific destination port, show the next two cut-offs on that route inline ("cut-off in 1d 8h · MSC LARA closes Fri 12:00"). Same data the dashboard already shows; in the calculator it's a "this is going to ship, you know" nudge.

9. **3D loading playback.** Match what CBM3 does best - animate cargo loading sequentially inside the container. Easy to screen-record and share with a buyer. Plays well with our existing `@react-three/fiber` setup and gives us a strong demo asset for sales calls. Implemented as a "Play loading" button on the 3D viz that runs through items in order over ~3 seconds; export as GIF/MP4 deferred.

10. **Sustainability score.** Per-CBM CO2 estimate for SCS ocean vs alternative modes. Industry-standard factors: sea ≈ 15 g CO2 / tonne-km, air ≈ 600 g CO2 / tonne-km, road ≈ 60 g CO2 / tonne-km. Display: "≈ XX kg CO2eq sea - ~95% less than air for this volume". Plays directly into our brand voice ("smart, sustainable freight"). Static formula in `lib/cbm.ts`, no external API call, free differentiator.

### Tier 3 - future tools that share the section

The Tools hub is built so future calculators slot in. Sketched here so the hub layout is right from day one:

- **Pallet-fit calculator** - cartons → pallets (for SRS-side workflows)
- **Chargeable weight calculator** - variation on CBM for air/road/courier modes
- **Container loading planner** - proper 3D bin-packing with weight distribution and door clearance (the heavyweight version of `<CBM3DViz>`)
- **ETA / transit-time calculator** - route + sailing → delivery date using real sailings + buffer
- **HS-code lookup** - curated SA-export common codes per category, with PPECB notes
- **Incoterms comparison** - DAP vs FOB vs CIF vs EXW side-by-side cost/responsibility chart
- **Insurance coverage estimator** - given cargo value + commodity, premium estimate
- **Currency converter** - uses our internal forex rates (the same ones already powering rate cards)
- **Document checklist generator** - pick cargo category + destination → required-docs list, deep-linked to onboarding requirements

---

## Decisions - all confirmed

| Question | Answer |
|---|---|
| Pricing model for Cube | **Per m³, flat** across origin / ocean / destination |
| Container mode | **Locked at creation** - each container is Pallet OR Cube, set in the admin Fleet scheduler |
| Existing data migration | All current rows back-filled as `cargoType: "PALLET"` |
| Cargo items storage on the calc | **JSONB** array (`cargoItems`) on the calc row |
| Snapshot semantics for bookings | Allocation **copies** items + totals from the calc at booking time, **plus** stores `calculationId` for "view source" navigation. Editing a calc later does NOT mutate already-booked allocations. |
| Capacity tracking | Containers carry both `totalPallets` + `totalCBM`; subtract based on the booking's cargo type |
| Calculator placement | **Standalone tools page** is the primary surface. Booking wizard only *consumes* saved calcs - no inline calculator. |
| Calc visibility | **User-scoped** for v1 (each user sees their own calcs). Org-wide sharing deferred. |
| 3D engine | Reuse the existing `@react-three/fiber` + `@react-three/drei` setup that powers the container scene |
| Container fit (calculator side) | Volume-only fit table for 20ft / 40ft / 40ft HC. No dimensional simulation. |
| Download | Client-side PDF: calc name, items table, totals, container-fit grid, 3D snapshot |
| First-time Cube users (no saved calcs yet) | Inline "Create your first calculation" CTA in the booking wizard that opens `/dashboard/tools/cbm-calculator/new` in a new tab so wizard state survives |
| MetaShip | **Unchanged.** Carrier handoff stays as-is. |

---

## Phases at a glance

```
A · Schema foundations            ✅ DONE  → docs/cbm-cargo-type/phase-a-schema-foundations.md
B · CBM helpers + calculator UI   ✅ DONE  → docs/cbm-cargo-type/phase-b-calculator-ui.md
C · Tools hub + saved calcs       ✅ DONE
   C.1 foundation                 ✅ DONE  → docs/cbm-cargo-type/phase-c1-tools-hub-and-crud.md
   C.2 presets + live-quote + smart-match  ✅ DONE  → docs/cbm-cargo-type/phase-c2-killer-feature-panels.md
   C.3 share + PDF + bulk paste   ✅ DONE  → docs/cbm-cargo-type/phase-c3-share-pdf-bulk-paste.md
D · Booking wizard integration    ✅ DONE  → docs/cbm-cargo-type/phase-d-booking-integration.md
E · Admin rate cards              ✅ DONE  → docs/cbm-cargo-type/phase-e-admin-rate-cards.md
F · Container creation + admin views ✅ DONE  → docs/cbm-cargo-type/phase-f-container-creation-and-admin-views.md
G · Display surfaces              ✅ DONE  → docs/cbm-cargo-type/phase-g-display-surfaces.md
H · Polish + tracker updates      ✅ DONE  → docs/cbm-cargo-type/phase-h-polish-and-doc-updates.md
```

Each phase ships independently. A → B → C is the critical path for any Cube booking to be possible; D depends on C; E unblocks correct billing; F polishes admin; G is read-side polish; H is docs.

---

## Phase A - Schema foundations ✅ DONE

**Detailed write-up:** [docs/cbm-cargo-type/phase-a-schema-foundations.md](docs/cbm-cargo-type/phase-a-schema-foundations.md)

**Goal**: every table is cargoType-aware. Nothing visible yet.

- [x] `lib/db/schema/pallet-allocations.ts` - `cargoType`, `cbmVolume`, `volumetricWeightKg`, `cargoItems` (JSONB), `calculationId` (soft ref)
- [x] `lib/db/schema/containers.ts` - `cargoTypeEnum` defined here (shared); `cargoType`, `totalCBM`, `maxCapacityCBM` columns
- [x] `lib/db/schema/container-types.ts` - `volumeCBM`, `internalLengthMm/WidthMm/HeightMm` (all nullable)
- [x] `lib/db/schema/rate-tables.ts` - `cargoType` on all three header tables (origin / ocean freight / destination); `PER_CBM` added to `chargeTypeEnum`
- [x] `lib/db/schema/invoices.ts` - `cargoType` + `cbmVolume`
- [x] `lib/db/schema/cargo-calculations.ts` - new table
- [x] `lib/db/schema/cargo-item-presets.ts` - new table (admin + user rows distinguished by `isAdmin` flag)
- [x] `lib/db/schema/cargo-calculation-shares.ts` - new table for share tokens
- [x] `lib/db/schema/index.ts` - exports the three new tables
- [x] Back-fill of existing rows: handled automatically by `NOT NULL DEFAULT 'PALLET'`; Postgres applies the default to existing rows during `db:push`
- [ ] **Manual step for user**: `npm run db:push`

**Verified**: `tsc --noEmit` clean.

---

## Phase B - CBM helpers + calculator UI ✅ DONE

**Detailed write-up:** [docs/cbm-cargo-type/phase-b-calculator-ui.md](docs/cbm-cargo-type/phase-b-calculator-ui.md)

**Goal**: standalone, testable calculator component + pure unit-conversion helpers. No backend wiring yet.

- [x] `lib/cbm.ts` - pure helpers (units, CBM math, volumetric weight × 4 modes, container fit, pallet equivalent, sustainability score, formatters)
- [x] `components/cbm/cbm-calculator.tsx` - controlled component with per-row inputs, unit toggles, stat cards, container fit table, read-only mode for share views
- [x] `components/cbm/cbm-3d-viz.tsx` - react-three-fiber scene matching the existing booking aesthetic; shelf-pack placement; 60-block visual cap; auto-rotate
- [x] Smoke test page at `/dev/cbm` (throwaway - deleted at the end of Phase C)

**Verified**: `tsc --noEmit` clean. Manual smoke test passes for the demo cargo across all four length units and both weight units.

---

## Phase C - Tools hub + saved calculations + killer features

**Goal**: full standalone calculator with named saves, 3D viz, PDF download, **plus the Tier 1 platform-integration features that make this section unique**. This is the primary user surface and the thing that gets clients hooked.

### Pages & components

- [ ] New page `/dashboard/tools/page.tsx` - Tools hub
  - Card grid showing CBM Calculator as the first available tool + "Coming soon" tiles for the Tier 3 future tools (clearly disabled), so the section feels like a growing suite, not a one-off.
- [ ] New page `/dashboard/tools/cbm-calculator/page.tsx` - list of saved calculations
  - Search by name; filter active/archived
  - "+ New calculation" CTA → routes to `/new`
  - Each row: name, total CBM, item count, created date, "Open" button, **and a quick "Use to book" shortcut** (Tier 1.3)
  - Empty state with primary CTA
- [ ] New page `/dashboard/tools/cbm-calculator/new/page.tsx` - create
  - Name field at the top
  - `<CBMCalculator>` for items (which includes the **cargo-item presets dropdown** and **bulk paste affordance** - see below)
  - `<CBM3DViz>` side panel
  - **Live Quote panel** below the totals - Tier 1.1 (see API section)
  - **Smart-match Containers panel** - Tier 1.2 (see API section)
  - **Sustainability score line** - Tier 2.10 (static formula in `lib/cbm.ts`)
  - "Save calculation" → POST → redirect to `/[id]`
- [ ] New page `/dashboard/tools/cbm-calculator/[id]/page.tsx` - view + edit + download + share
  - Same layout as `/new` but pre-populated
  - Actions: Save changes · Duplicate as new · Archive · Download PDF · **Generate share link** (Tier 1.6) · **Use this calc to book** (Tier 1.3)
  - PDF: calc name, items table, totals, container-fit grid, 3D snapshot. `@react-pdf/renderer` dynamically imported on button click so it stays out of the main bundle.
- [ ] New page `/share/cbm/[token]/page.tsx` - read-only public view of a shared calc
  - No auth required. Token-gated; rate-limited; access events logged.
  - Renders read-only `<CBMCalculator>` + `<CBM3DViz>`; no edit/save actions.
  - Optional expiry shown ("This link expires in 6 days").

### `<CBMCalculator>` upgrades (extends Phase B baseline)

- [ ] **Cargo item presets dropdown** (Tier 1.4) - beside the "Add row" button, a searchable picker:
  - Admin-curated common items per category (`cargo_item_presets` table - see schema addendum below)
  - User's own "saved items" alongside
  - Selecting a preset pre-fills L/W/H/weight; quantity defaults to 1; user can still edit
- [ ] **Bulk paste / CSV upload** (Tier 1.5) - paste area accepts:
  - Tab or comma-separated rows with fuzzy column detection (Description, Qty, L, W, H, Weight, Unit)
  - CSV file upload (same parser)
  - Preview before commit; reject bad rows with line-numbered errors
- [ ] **Pallet-equivalent display** (Tier 2.7) - small caption under the total CBM: `≈ X.X standard pallets (EUR1, 1.2 × 1.0 × 1.4m)`. Pure computed metric, no schema. Also shows on the booking detail page for Cube allocations.
- [ ] **Cut-off urgency banner** (Tier 2.8) - when a route is selected in the calculator (via the smart-match panel), show the next two cut-offs as a small banner inline.
- [ ] **3D loading playback** (Tier 2.9) - "Play loading" button on the 3D viz animates items appearing in order over ~3 seconds. Reuses the existing react-three-fiber scene.
- [ ] **Sustainability score** (Tier 2.10) - small badge below totals: `~XX kg CO2eq · sea SCS · ~95% less than air`. Formula in `lib/cbm.ts`, no external API call.
- [ ] **Keyboard shortcuts** - Ctrl+N add row, Enter to add on last row, Tab between fields. Quality-of-life win that matches CBM3.

### APIs

- [ ] Calculations CRUD
  - `GET /api/dashboard/cbm-calculations` - list user's calcs
  - `POST /api/dashboard/cbm-calculations` - create (totals computed server-side from items)
  - `GET /api/dashboard/cbm-calculations/[id]` - single calc
  - `PATCH /api/dashboard/cbm-calculations/[id]` - edit name/items/notes; recompute totals
  - `DELETE /api/dashboard/cbm-calculations/[id]` - soft delete
  - All endpoints check ownership
- [ ] **Live Quote endpoint** (Tier 1.1)
  - `GET /api/dashboard/cbm-calculations/[id]/quote?route=ZACPT-NLRTM` - runs the cube quote path through `lib/rates.ts` and returns a CostBreakdown shaped for inline display
  - Returns `{ estimated: false }` if no rate card exists for the route, with a helpful "Get a quote from sales" CTA fallback
- [ ] **Smart-match Containers endpoint** (Tier 1.2)
  - `GET /api/dashboard/cbm-calculations/[id]/matches?route=ZACPT-NLRTM` - returns active SCS Cube containers on the route with `cbmRemaining ≥ totalCbm`, sorted by next-cut-off
  - Falls back to all routes if `route` not provided; uses the user's most-recent booked route as the default
  - Each match includes `containerId`, vessel, voyage, route, cbmRemaining, cutoffAt, hoursToCutoff → enough for the inline panel
- [ ] **Cargo item presets** (Tier 1.4)
  - `GET /api/cargo-item-presets` - returns admin-curated + user's own presets
  - `POST /api/cargo-item-presets` - user saves their own (admin-curated ones are seeded via the same table with `isAdmin: true`, only editable from admin UI)
  - Admin CRUD endpoints under `/api/admin/cargo-item-presets/*` for curation
- [ ] **Share-by-link** (Tier 1.6)
  - `POST /api/dashboard/cbm-calculations/[id]/share` - generates a token, stores it in `cargo_calculation_shares` table with optional expiry, returns the public URL
  - `GET /api/share/cbm/[token]` - public, returns read-only calc payload; logs the access event
  - `DELETE /api/dashboard/cbm-calculations/[id]/share/[token]` - revoke
- [ ] **One-click "Use to book"** (Tier 1.3) - no new endpoint needed; navigates to the booking wizard with `?calculationId=…` and the wizard auto-resolves cargoType=CUBE + pre-fills the snapshot

### Schema addenda (added to Phase A)

- [ ] `lib/db/schema/cargo-item-presets.ts` (new)
  - `id, name, categoryId (nullable, references productCategories), lengthMm, widthMm, heightMm, weightKg, isAdmin (bool), userId (nullable, FK to users), active, createdAt, updatedAt`
  - Admin-curated rows have `isAdmin: true, userId: null`. User rows have `isAdmin: false, userId: <id>`.
  - The `categoryId` link is meaningful - the container creation flow already binds container ↔ category. When a user is calculating against a container with `categoryId = cat-wine-spirits`, the preset picker filters to wine-related items first (then all others). Smart contextual surfacing instead of dumping every preset into one big list.
- [ ] `lib/db/schema/cargo-calculation-shares.ts` (new)
  - `token (primary key, generated), calculationId (FK), expiresAt (nullable), revokedAt (nullable), accessCount, lastAccessedAt, createdAt`

### Initial admin-curated preset seed (one-off, ships with Phase C)

Seeded into `cargo_item_presets` with `isAdmin: true, userId: null`. Real industry-typical dimensions; admin can edit/add via the Phase F UI later.

| Category (`categoryId`) | Preset name | L × W × H (mm) | Weight (kg) |
|---|---|---|---|
| `cat-wine-spirits` | Wine 12-bottle case (standard 750ml) | 350 × 300 × 230 | 16 |
| `cat-wine-spirits` | Wine 6-bottle case | 350 × 160 × 230 | 8 |
| `cat-wine-spirits` | Spirits case (12 × 750ml) | 350 × 300 × 280 | 18 |
| `cat-fruit` | Citrus 15kg carton | 400 × 300 × 270 | 15 |
| `cat-fruit` | Grape 4.5kg punnet pack | 400 × 300 × 100 | 4.5 |
| `cat-fruit` | Apple/pear 18kg bin liner | 600 × 400 × 300 | 18 |
| `cat-hunting-trophies` | Standard trophy crate | 1200 × 800 × 800 | 45 |
| `cat-hunting-trophies` | Skull/horn export box | 800 × 600 × 600 | 25 |
| `cat-confectionery` | Chocolate 24-bar carton | 400 × 300 × 200 | 6 |
| `cat-confectionery` | Confectionery bulk box | 500 × 400 × 300 | 12 |
| `cat-dry-mixed` | Standard double-wall carton | 400 × 400 × 400 | 10 |
| `cat-dry-mixed` | Industrial drum (200L) | 580 × 580 × 880 | 25 |
| _no category_ | Euro pallet base (EUR 1) | 1200 × 800 × 144 | 22 |
| _no category_ | ISO pallet base | 1200 × 1000 × 144 | 25 |

Easy to expand later - the seed lives in `app/api/admin/cargo-item-presets/seed/route.ts` (same pattern as `product-categories/seed`).

### Sidebar nav
- [ ] Add **Tools** entry to the dashboard sidebar pointing at `/dashboard/tools`. Icon: `Wrench` or `Calculator`.

**Done when**: a client can create a named CBM calculation, see a live quote on their route, see which open containers fit their cargo (with cut-off urgency), share it by link to a consignee, and one-click that calc into a complete booking.

---

## Phase D - Booking wizard integration

**Goal**: SCS booking flow lets the user pick Pallet or Cube; Cube path uses a saved calculation.

- [ ] `components/booking/step-2-cargo.tsx`
  - After Step 1's route + sailing selection, before container picker: add a **Cargo Type** chooser (two big tiles, Pallet / Cube). Only appears when the route's containers include both modes; if only one mode is available, auto-select it.
  - **Pallet branch**: existing slider unchanged. Container picker filters by `cargoType = PALLET`.
  - **Cube branch**:
    - Container picker filters by `cargoType = CUBE`. Each container shows `bookedCBM / maxCBM` instead of pallet count.
    - After container selection: a **searchable dropdown** of the user's saved calculations. Each option shows name + total CBM. Calcs whose CBM exceeds the container's remaining capacity are shown disabled with a "Doesn't fit" badge.
    - Below the dropdown: a "Create your first calculation" inline button when the user has zero calcs; opens `/dashboard/tools/cbm-calculator/new` in a new tab.
    - Selected calc renders the 3D viz inline (re-using `<CBM3DViz>`) so the user sees their cargo in the actual container they picked.
  - `isInitialComplete` checks per branch: Pallet needs `palletCount ≥ 1`; Cube needs `calculationId` selected and snapshot data present.
  - Submit payload: PALLET sends `palletCount`; CUBE sends `cargoType, calculationId, cbmVolume, volumetricWeightKg, cargoItems` (snapshotted from the calc).
- [ ] `types/index.ts` - extend `BookingFormData`:
  - `cargoType: "PALLET" | "CUBE"`
  - `calculationId?: string`
  - `cbmVolume?: number`
  - `volumetricWeightKg?: number`
  - `cargoItems?: CargoItem[]`
- [ ] `app/api/bookings/route.ts` (POST)
  - Accept the new fields. Validate per type. Cube ignores `palletCount`.
  - Fetch the referenced calc; verify ownership; **snapshot** the items + totals into the allocation row (don't trust client-sent volumes - server recomputes from the calc's items).
  - Verify container.cargoType matches; reject mismatch.
  - Update `containers.totalCBM` for Cube; `containers.totalPallets` for Pallet.
- [ ] `app/api/containers/route.ts`
  - Accept `cargoType` query param; filter accordingly
  - Return `cbmCapacity`, `cbmFilled` alongside pallet fields
- [ ] `app/api/bookings/options/route.ts`
  - Filter cascading options by `cargoType`
- [ ] `lib/rates.ts` + `app/api/rates/quote/route.ts`
  - Accept `cargoType, cbmVolume`. CUBE uses `PER_CBM` charge items × cbm; ocean = `freightTotal × (cbm / containerMaxCBM)` instead of `÷ 20`.
- [ ] `components/booking/step-cost-breakdown.tsx`
  - Render per-m³ pricing for Cube; per-pallet for Pallet.

**Done when**: A Cube booking goes through end-to-end - select container, pick a saved calc, see correct pricing, container's `totalCBM` increases by the calc's volume.

---

## Phase E - Admin rate cards with cargo type ✅ DONE

**Detailed write-up:** [docs/cbm-cargo-type/phase-e-admin-rate-cards.md](docs/cbm-cargo-type/phase-e-admin-rate-cards.md)

- [x] `components/admin/finance/origin-charge-editor.tsx` - Cargo Type-aware line items. For CUBE, charge-type dropdown swaps `PER_PALLET` for `PER_CBM`, table headers swap "/ pallet" → "/ m³", container-equivalent uses `× 67.7` (40ft HC m³) instead of `× 20`.
- [x] `components/admin/finance/destination-charge-editor.tsx` - cargoType passthrough + per-unit divisor in totals (m³ vs pallet).
- [x] `components/admin/finance/create-origin-charge-dialog.tsx` + `create-destination-charge-dialog.tsx` + `create-ocean-freight-dialog.tsx` - Cargo Type field appears below Rate Type **only when SCS is selected**; SRS forces PALLET silently. Field is **locked after creation** (disabled in edit mode for ocean freight; not editable on the editor pages for origin/destination).
- [x] `app/api/admin/origin-charges/`, `destination-charges/`, `ocean-freight/` (route + `[id]`)
  - cargoType returned in GET responses; accepted in POST; locked on PUT (server fetches existing cargoType and validates items against it).
  - `validateChargeTypeForCargoType()` / `validateDestinationChargeType()` helpers reject `PER_PALLET` items on a CUBE card and `PER_CBM` items on a PALLET card.
- [x] `app/admin/finance/{origin,destination}-charges/new/page.tsx` - parse `cargoType` from URL params (SRS → "PALLET", SCS → param value).
- [x] `app/admin/finance/{origin,destination}-charges/[id]/page.tsx` - include `cargoType` in select clause + `initialData`; widen item chargeType type to include `PER_CBM | PER_PALLET`.
- [x] List grids: small `m³` chip next to the Rate Type badge for CUBE cards (origin-charges-list, destination-charges-list, ocean-freight-grid).

**Note**: `lib/rates.ts` cargoType filtering shipped in Phase D's quote endpoint (`cargoType` is already a quote-input dimension); no further changes needed here.

**Done when**: admin can create a Cube destination card with `PER_CBM` line items; booking quotes pick it up correctly. ✅

---

## Phase F - Container creation + admin views ✅ DONE

**Detailed write-up:** [docs/cbm-cargo-type/phase-f-container-creation-and-admin-views.md](docs/cbm-cargo-type/phase-f-container-creation-and-admin-views.md)

- [x] `components/admin/fleet-scheduler.tsx`
  - Added **Cargo Type** field to the container creation form (Step 3b). Visible only for DRY (SCS); REEFER (SRS) is silently forced to PALLET.
  - Locked when editing an existing container (buttons disabled).
  - `volumeCBM` is hydrated server-side from the chosen container type onto `maxCapacityCBM`.
  - Container row badges: purple "m³ Cube" pill alongside the existing type / temperature pills.
  - Capacity counter swaps to CBM mode for Cube containers (`totalCBM / maxCapacityCBM`).
- [x] `app/api/admin/containers/route.ts` (POST + `[id]/route.ts` PUT)
  - POST accepts `cargoType`, defaults to PALLET when SRS, and hydrates `maxCapacityCBM` from `containerTypes.volumeCBM`.
  - PUT refuses any cargoType change after creation. When `containerTypeId` changes, `maxCapacityCBM` is re-hydrated from the new container type.
- [x] `components/admin/admin-bookings-grid.tsx`
  - Volume column shows `{N}` (pallets) OR `{X.XX} m³` based on `allocation.cargoType`, via new `formatAllocationVolume()` helper.
  - Container-header CUBE badge mirrors the fleet scheduler.
  - Capacity counter on each container card swaps to CBM mode for Cube.
  - Review-request modal labels the volume box "Volume"/"Pallets" appropriately and shows a CUBE chip next to the rate-type badge.
- [x] No further filter chip needed: rate-type chip (SRS/SCS) already separates the two cleanly, and Cube only exists under SCS - the m³ chip is the visual filter.

**Done when**: admin can create a Cube container, allocate Cube bookings to it, and see correct capacity / units everywhere. ✅

---

## Phase G - Display surfaces (client side) ✅ DONE

**Detailed write-up:** [docs/cbm-cargo-type/phase-g-display-surfaces.md](docs/cbm-cargo-type/phase-g-display-surfaces.md)

- [x] `components/dashboard/overview/recent-shipments.tsx` - "Pallets" column renamed "Volume"; renders `{palletCount}` for PALLET, `{cbmVolume.toFixed(2)} m³` for CUBE.
- [x] `components/dashboard/overview/my-bookings-widget.tsx` - replaced `{b.palletCount} pallet(s)` with cargoType branch (`X.XX m³` for CUBE).
- [x] `components/dashboard/overview/overview-grid.tsx` - `upcomingBookings` type extended with optional `cargoType` + `cbmVolume`.
- [x] `app/dashboard/bookings/page.tsx` - bookings list pallet cell renders m³ for CUBE.
- [x] `components/booking/booking-detail-dialog.tsx` - cargo details panel flips "Pallets" → "Volume" for CUBE.
- [x] `components/finance/invoice-view-dialog.tsx` - line-item table headers + per-unit divisor branch on cargoType. Route header chip shows m³ for CUBE invoices.
- [x] `app/api/dashboard/overview/route.ts` - `upcomingBookings` payload includes `cargoType` + `cbmVolume`.
- [x] `app/api/bookings/route.ts` - bookings payload includes `cargoType` + `cbmVolume`.
- [x] `app/api/invoices/route.ts` - admin select clause includes `cargoType` + `cbmVolume`.
- [x] `types/index.ts` - `ClientBooking` and `Invoice` gain optional `cargoType` + `cbmVolume`.
- [x] Documents vault: no change needed (it doesn't display pallet/CBM, only route + vessel + booking ref).

**Done when**: every "N pallets" string on the client side branches correctly. ✅

---

## Phase H - Polish + tracker updates ✅ DONE

**Detailed write-up:** [docs/cbm-cargo-type/phase-h-polish-and-doc-updates.md](docs/cbm-cargo-type/phase-h-polish-and-doc-updates.md)

- [x] Empty-state copy + tooltips wherever a new field appears - audited in Phase H. Calculator first-time empty state, cube-calc-picker "Create your first calculation" CTA, booking wizard cargo-type tile descriptions, and admin fleet scheduler Cargo Type help text were all wired up in earlier phases (C, D, F). Nothing new to ship.
- [x] Updated [CLIENT_DASHBOARD.md](CLIENT_DASHBOARD.md) with a new "Phase 3 - Tools section + Cube booking path" section noting the new surfaces.
- [x] Updated [SCS_SRS_RULES.md](SCS_SRS_RULES.md) with a "Cargo type (Pallet vs Cube)" subsection explaining the SRS-always-pallet rule and the SCS Pallet/Cube split.
- [x] Flagged the public CBM calculator landing as a future SEO target in [SEO_PLAYBOOK.md](SEO_PLAYBOOK.md) (§7b) with target queries, scope, and out-of-scope notes - kept separate from the playbook's core execution.

---

## Files most affected (roll-up)

### Schema (A)
- `lib/db/schema/pallet-allocations.ts`, `containers.ts`, `container-types.ts`, `rate-tables.ts`, `invoices.ts`, `cargo-calculations.ts` (new), `index.ts`

### Calculator engine (B)
- `lib/cbm.ts` (new), `components/cbm/cbm-calculator.tsx` (new), `components/cbm/cbm-3d-viz.tsx` (new)

### Tools section (C)
- `app/dashboard/tools/page.tsx` (new)
- `app/dashboard/tools/cbm-calculator/{page,new/page,[id]/page}.tsx` (new)
- `app/share/cbm/[token]/page.tsx` (new - public share view)
- `app/api/dashboard/cbm-calculations/{route,[id]/route,[id]/quote/route,[id]/matches/route,[id]/share/route}.ts` (new)
- `app/api/cargo-item-presets/route.ts` + `app/api/admin/cargo-item-presets/{route,[id]/route}.ts` (new)
- `app/api/share/cbm/[token]/route.ts` (new - public read)
- `lib/db/schema/cargo-item-presets.ts`, `cargo-calculation-shares.ts` (new - added to Phase A)
- Sidebar nav update

### Booking (D)
- `components/booking/step-2-cargo.tsx`, `step-cost-breakdown.tsx`
- `app/api/bookings/route.ts`, `bookings/options/route.ts`, `containers/route.ts`, `rates/quote/route.ts`
- `lib/rates.ts`, `types/index.ts`

### Admin rates (E)
- `components/admin/finance/origin-charge-editor.tsx`, `destination-charge-editor.tsx`, `create-ocean-freight-dialog.tsx`
- `app/api/admin/origin-charges/`, `destination-charges/`, `ocean-freight/` (+ `[id]`)

### Admin container + bookings (F)
- `components/admin/fleet-scheduler.tsx`, `admin-bookings-grid.tsx`, `user-review-modal.tsx`
- `app/api/admin/containers/`

### Client display (G)
- `components/dashboard/overview/{recent-shipments,my-bookings-widget}.tsx`
- `components/finance/invoice-view-dialog.tsx`
- `app/api/dashboard/{overview,documents}/route.ts`

### Tracker
- `CBM_CARGO_TYPE.md` (this file)

---

## Risk areas

- **Snapshot drift**: a user edits a calc *after* booking with it. The allocation snapshot is intact, but the displayed "source calc name" might now be different. Acceptable; we'll show a small "snapshot from {date}" note on the booking detail so it's clear.
- **Container mode lock-in**: an admin who chose Pallet on a container can't later "upgrade" it to accept Cube. Acceptable per decisions; SCS containers are cheap to spin up.
- **Calc fit at booking vs at creation**: a calc that was fine 2 weeks ago might no longer fit because more bookings have arrived on the chosen container. The dropdown disables non-fitting calcs at picker time - but if a user *had* one selected and another booking landed, we re-validate on submit and toast a clear error.
- **PDF rendering**: `@react-pdf/renderer` is a chunky dep (~200 KB). Acceptable; the PDF action is opt-in (button click triggers dynamic import) so it doesn't bloat the dashboard bundle.
- **3D viz performance with many items**: 50+ distinct item rows could slow the scene. Cap at 20 visual cargo blocks in the scene (merge identical items into stacks; show the rest as a count label). Calculation math is unaffected.
- **No saved calcs at booking time**: clear inline CTA mitigates, but the cross-page flow (calculator opens in new tab) means we lose any partially-filled wizard state if the user navigates within the same tab. Solution: enforce new-tab open via `target="_blank"` + `rel="noopener"`.
- **Public share-link abuse** (Tier 1.6): unauthenticated URLs are a small risk surface. Mitigations: tokens are long random strings (not sequential IDs), rate-limited per token, revocable from the calc page, optional expiry, and access events logged. We don't expose calculation name, owner email, or other identifying info in the public payload - only the items/totals/3D.
- **Live quote endpoint trust** (Tier 1.1): the quote must compute from server-side rate cards, not anything the client sends. The calc's `totalCBM` itself is server-recomputed from items inside the same endpoint to avoid client tampering.

---

## Out of scope for v1

- Dimensional / stacking / longest-side container fit. Volume-only.
- Chargeable-weight pricing (max of actual vs volumetric). Per-CBM flat.
- Editing a booked allocation's cargo type. If wrong, cancel + rebook.
- Migrating existing PALLET bookings to CUBE. Forward-only.
- Org-wide sharing of calculations between users in the same client account. User-scoped only.
- Public marketing calculator on the landing site.
- Air / courier volumetric pricing modes. Sea only.

---

## Open questions

- [ ] Sales preference for displayed unit on quotes - `m³` or `cbm` in copy?
- [ ] Pre-booking quote requests when no Cube container is open yet on the route - queue as a "request" the way Pallet does, or block with a "no available capacity" message?
- [ ] Default container fit highlight on the calculator: smallest container that fits, or always show all three?
- [ ] Share-link expiry default - 30 days, 90 days, or never (manual revoke)?

### Closed (locked-in)

- ✅ Cargo-item presets: **admin curates a starter set** linked to product categories. Wine cases under Wine & Spirits, citrus crates under Fruit, hunting trophy crates under Hunting Trophies, chocolate cartons under Confectionery & Chocolate, etc. Categories are the existing `productCategories` table. Admin UI ships in Phase F.
- ✅ Pallet equivalent indicator: shows on both the calculator AND the Cube booking detail page (v1).
- ✅ Tier 2 scope: **all four Tier 2 features ship in v1** - pallet-equivalent, cut-off urgency banner, 3D loading playback, sustainability score.
