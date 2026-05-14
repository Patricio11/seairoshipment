# Phase E — Admin Rate Cards with Cargo Type

**Status**: ✅ DONE
**Date completed**: 2026-05-14
**Tracker**: [CBM_CARGO_TYPE.md](../../CBM_CARGO_TYPE.md)

## Goal

Make every admin rate card cargoType-aware so SCS rate cards can price per-m³ instead of (or alongside) per-pallet. SRS rate cards stay unchanged — SRS is always pallet, always temperature-controlled.

## What changed (UX)

When an admin clicks **+ New Rate Card** on any of the three rate-card surfaces (Origin Charges, Ocean Freight, Destination Charges):

1. They pick a **Rate Type** (SRS / SCS) — same field as before.
2. If they pick **SCS**, a new **Cargo Type** field appears immediately below: *Pallet* or *Cube (per m³)*.
3. If they pick **SRS**, the field stays hidden and `cargoType` is silently saved as `"PALLET"`.
4. Once the card is created, **cargoType is locked** — same pattern as `salesRateTypeId`.

On the line items (origin + destination editors):
- **PALLET card**: per-unit charges use `PER_PALLET` (unchanged behaviour, table shows "/ pallet" headers, container-equivalent multiplies by 20 pallets).
- **CUBE card**: the per-unit dropdown swaps in `PER_CBM`. Table headers show "/ m³", container-equivalent multiplies by **67.7** (the m³ capacity of a 40ft HC reefer — matching `containers.volumeCBM`).

On the list pages, CUBE cards get a small purple `m³` chip next to the existing rate-type badge so admins can scan the table and spot Cube cards at a glance.

## What changed (data flow)

```
[Dialog] → URL params (cargoType) → [/new page] → initialData → [Editor]
                                                                    │
                                              ┌─── POST body ──────┘
                                              ▼
[POST /api/admin/<rates>] ─── validates chargeType ↔ cargoType ─── INSERT cargoType
                                                                          │
[GET /api/admin/<rates>] ─── returns cargoType in row payload ◄────────────┘
                                                                          │
[PUT /api/admin/<rates>/[id]] ─── fetches existing cargoType ──────────────┘
        │
        └── validates items against locked cargoType, rejects mismatches
```

Key invariant: **clients never tell the server what cargoType to update to**. The PUT route reads the existing card's cargoType and uses *that* to validate items. cargoType is set once on POST and is immutable from the API's perspective.

## Files touched

### Server (APIs)
- `app/api/admin/origin-charges/route.ts` — POST accepts `cargoType`, validates each item via `validateChargeTypeForCargoType()`, inserts with cargoType. GET selects cargoType.
- `app/api/admin/origin-charges/[id]/route.ts` — PUT fetches existing `cargoType` first, validates items, refuses to mutate cargoType.
- `app/api/admin/destination-charges/route.ts` — same pattern with `validateDestinationChargeType()`.
- `app/api/admin/destination-charges/[id]/route.ts` — PUT fetches existing cargoType, validates inline.
- `app/api/admin/ocean-freight/route.ts` — POST accepts cargoType; GET returns cargoType.

The validators explicitly reject:
- `PER_PALLET` items on a CUBE card
- `PER_CBM` items on a PALLET card
- `FIXED` / `PER_CONTAINER` are accepted on both (container-level fees apply equally regardless of cargo type).

### Types
- `lib/types/finance.ts`
  - New `export type CargoType = 'PALLET' | 'CUBE'`
  - `'PER_CBM'` added to `ChargeType`
  - `cargoType?: CargoType` added (optional) on `OriginCharge`, `OceanFreightRate`, `DestinationCharge` — optional to avoid back-filling ~17 mock-data rows that pre-date the change
  - `DestinationChargeItem.chargeType` widened: `'PER_CONTAINER' | 'FIXED' | 'PER_CBM' | 'PER_PALLET'`

### Dialogs (creation entry points)
- `components/admin/finance/create-origin-charge-dialog.tsx`
- `components/admin/finance/create-destination-charge-dialog.tsx`
- `components/admin/finance/create-ocean-freight-dialog.tsx`

All three:
- Added `cargoType: "PALLET" | "CUBE"` to formData (default PALLET).
- Cargo Type `<Select>` rendered conditionally on `salesRateTypeId === "scs"`.
- Rate Type onChange clears cargoType to PALLET when switching to SRS.
- Submit derives `effectiveCargoType = salesRateTypeId === "srs" ? "PALLET" : formData.cargoType` before POSTing.

Ocean freight is a single create-or-edit dialog (no /new page), so the Rate Type + Cargo Type fields also `disabled={isEditMode}` to enforce the lock visually.

### /new pages (origin + destination follow the URL → /new → editor pattern)
- `app/admin/finance/origin-charges/new/page.tsx`
- `app/admin/finance/destination-charges/new/page.tsx`

Both parse `cargoType` from search params; both apply the same derivation rule (SRS → PALLET, SCS → param value defaulting to PALLET).

### /[id] pages (edit-existing)
- `app/admin/finance/origin-charges/[id]/page.tsx`
- `app/admin/finance/destination-charges/[id]/page.tsx`

Both add `cargoType` to the select clause, the initialData object, and widen the line-item `chargeType` type to `"PER_CONTAINER" | "FIXED" | "PER_CBM" | "PER_PALLET"`.

### Editors
- `components/admin/finance/origin-charge-editor.tsx`
  - `isCube = initialData?.cargoType === "CUBE"`
  - `perUnitChargeType: "PER_PALLET" | "PER_CBM" = isCube ? "PER_CBM" : "PER_PALLET"`
  - `containerFactor = isCube ? 67.7 : 20` — drives container-equivalent display
  - `addItem` defaults new rows to `perUnitChargeType`
  - `calculateTotals`, `hasZeroCost`, sell/buy rate cells, and table headers all branch on `isCube`
  - POST body includes `cargoType: initialData?.cargoType ?? "PALLET"`

- `components/admin/finance/destination-charge-editor.tsx`
  - `isCube`, `unitLabel = isCube ? "m³" : "pallet"`, `unitDivisor = isCube ? 67.7 : 20`
  - Per-unit display in totals: `R X / m³` or `R X / pallet` based on cargoType
  - POST body includes cargoType

### Lists (visual passthrough)
- `components/admin/finance/origin-charges-list.tsx`
- `components/admin/finance/destination-charges-list.tsx`
- `components/admin/finance/ocean-freight-grid.tsx`

All three: `cargoType?: "PALLET" | "CUBE" | null` on the row type, and a small purple outline `m³` badge rendered next to the rate-type badge when `cargoType === "CUBE"`. Edit handlers carry `cargoType` through to the dialog's `editData` so the locked field paints correctly.

## Why containerFactor = 67.7 for cube

A 40ft HC reefer has internal volume ≈ 67.7 m³ (matches `container_types.volumeCBM` for the seeded `40ft-reefer-hc` row). When a CUBE card's per-m³ line items are summarised, multiplying by 67.7 gives the "fully-loaded container price" — directly comparable to the PALLET container-equivalent (`× 20 pallets`). This is purely a display convenience in the editor; the actual quote-time math uses `cbmVolume / containerMaxCBM` for the ocean freight share, which is the right cost model for partial loads.

## Why cargoType is optional on the public types

The codebase ships seed/mock rate-card data in several `lib/rates*.ts` files. Making `cargoType` required would force back-filling ~17 mock rows and break type-check immediately. Optional + runtime defaults (`?? "PALLET"`) is a smaller blast radius, and the DB column itself is `NOT NULL DEFAULT 'PALLET'` so no real production row can ever be without one.

## Why ocean freight stays a single dialog (no editor page)

Ocean freight is a small fixed set of fields (freight, BAF, ISPS, RCG, other × USD + buy side) — no line-item editor. Adding the cargoType field to the existing dialog and disabling it in edit mode was sufficient. Origin and destination need full editor pages because they have N line items.

## Verification

- `npx tsc --noEmit` → clean (exit 0).
- No visual regressions on PALLET cards — only the line-item dropdown labels and totals captions are conditional on `isCube`.

## Out of scope for Phase E

- `lib/rates.ts` cargoType filtering: already exists from Phase D (`cargoType` is an input dimension of `/api/rates/quote`).
- Admin UI for line-item chargeType swap on the *destination* editor: destination cards in the wild today are all PER_CONTAINER / FIXED — neither is invalid on a CUBE card. Per-m³ destination line items can be entered via the API for now; a UI swap can ship later if a real use case emerges.
- Migration of existing PALLET cards to CUBE. Forward-only; admins create fresh CUBE cards.

## Next: Phase F — Container creation + admin views

Fleet scheduler picks cargoType when creating a container. Admin bookings grid renders polymorphic Volume column (`{N} pallets` vs `{X.XX} m³`).
