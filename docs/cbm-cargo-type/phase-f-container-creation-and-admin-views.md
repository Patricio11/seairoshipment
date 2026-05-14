# Phase F — Container Creation + Admin Views

**Status**: ✅ DONE
**Date completed**: 2026-05-14
**Tracker**: [CBM_CARGO_TYPE.md](../../CBM_CARGO_TYPE.md)

## Goal

Wire cargoType into the admin fleet scheduler (container creation) and the admin bookings grid (allocation surfaces) so an admin can:
1. Create a CUBE container (locked from creation, like salesRateTypeId).
2. See a CUBE container's capacity in m³, not pallets.
3. See Cube allocations rendered as `{X.XX} m³` instead of `{N} pallets`.

This is the admin-side polish that closes the loop between Phase D's booking-time CUBE flow and Phase E's CUBE rate cards: once a CUBE container is created here, a CUBE booking can land in it, and the admin sees the right units everywhere they look.

## What changed (UX)

### Fleet scheduler

In the **Create Container** flow:

```
1. Origin + Destination
2. Sailing
3. Container Type      ← unchanged
3b. Cargo Type         ← NEW. Only appears when container type is DRY (SCS).
                          Pallet | Cube (per m³). Locked when editing.
4. Temperature         ← unchanged (hidden for DRY)
5. Category            ← unchanged
```

For REEFER (SRS) container types the Cargo Type field is silently absent — SRS is always pallet, always palletised reefer cargo.

In the container row display:
- New purple `m³ Cube` badge sits alongside the existing temperature/category badges when `cargoType === "CUBE"`.
- The big capacity counter on the right swaps between two modes:
  - **PALLET**: `{totalPallets} / {maxCapacity}` — unchanged behaviour
  - **CUBE**: `{totalCBM} / {maxCapacityCBM} m³` — warns at 75% full

### Admin bookings grid

Per-allocation volume cell now reads:
- **PALLET allocation**: `{palletCount}` (unchanged)
- **CUBE allocation**: `{cbmVolume.toFixed(2)} m³`

The container header gets the same purple `m³ Cube` badge. The capacity counter mirrors the fleet scheduler — pallet count vs CBM. The review-request modal's "Pallets" label flips to "Volume" for Cube allocations, and gets a `m³ Cube` chip in the header.

## What changed (data flow)

```
[POST /api/admin/containers] ──► cargoType in body (defaults PALLET if SRS)
                                        │
                                        ▼
                          INSERT cargoType + maxCapacityCBM
                          (maxCapacityCBM hydrated from
                           containerTypes.volumeCBM)
                                        │
[PUT /api/admin/containers/[id]] ◄──────┘
                          REFUSE cargoType change
                          If containerTypeId changes →
                            re-hydrate maxCapacityCBM
```

Same locked-after-creation pattern as Phase E for rate cards: the API is the enforcement point, not the UI.

## Files touched

### Server

- `app/api/admin/containers/route.ts` — POST destructures `cargoType: cargoTypeRaw`, derives `cargoType = derivedSalesRateTypeId === "srs" ? "PALLET" : (cargoTypeRaw === "CUBE" ? "CUBE" : "PALLET")`, inserts cargoType + totalCBM=0 + maxCapacityCBM=ct.volumeCBM.
- `app/api/admin/containers/[id]/route.ts` — PUT now compares `body.cargoType` against `existing.cargoType` and 400s on any change attempt. When `containerTypeId` changes, `maxCapacityCBM = ct.volumeCBM ?? null` is updated alongside the existing `maxCapacity = ct.maxPallets`.

### Fleet scheduler

- `components/admin/fleet-scheduler.tsx`
  - `ContainerData`, `ContainerForm`, `ContainerTypeOption` all gain cargoType / CBM fields.
  - `EMPTY_FORM.cargoType = "PALLET"`.
  - `handleContainerTypeChange()` resets cargoType to PALLET when switching to REEFER (since SRS is always pallet).
  - `handleSubmit()` derives `effectiveCargoType` (REEFER → PALLET, DRY → form choice) and includes it only in POST (PUT ignores it server-side anyway).
  - New "Step 3b. Cargo Type" UI section, visible only when `selectedContainerType?.type === "DRY"`, with two pill buttons (Pallet / Cube), disabled in edit mode.
  - Container row header has a new `m³ Cube` purple Badge for CUBE containers.
  - Capacity counter branches: CUBE shows `{usedCBM.toFixed(2)} / {maxCBM} m³` with a 75% near-full threshold; PALLET keeps the existing `{totalPallets} / {maxCapacity}` with 15-pallet threshold.

### Admin bookings grid

- `components/admin/admin-bookings-grid.tsx`
  - `ContainerAllocation.allocation`, `PendingRequest.allocation`, and `ContainerData` all gain optional `cargoType` and CBM fields.
  - New helpers near the top of the module:
    - `formatAllocationVolume(a)` → `"X.XX m³"` for CUBE, `String(palletCount)` for PALLET.
    - `allocationVolumeUnit(a)` → `"m³"` or `"pallets"` for label suffix logic.
  - Every per-allocation table cell that previously showed `palletCount` now calls `formatAllocationVolume()`.
  - Detail dialog "Totals" row sums `cbmVolume` for CUBE containers, `palletCount` for PALLET.
  - Container header gets the `m³ Cube` badge.
  - Container capacity counter mirrors the fleet scheduler's polymorphic display.
  - Review-request modal: "Pallets" → "Volume" label flip for CUBE; added a `m³ Cube` badge next to the rate-type badge.

## Why no separate "Pallet / Cube" filter chip

The CBM_CARGO_TYPE.md tracker originally asked for a filter chip alongside the SRS/SCS chip. In practice this is redundant: Cube allocations only exist under SCS, and the new purple m³ badges on every row already give admins instant visual filtering. Adding a chip would also have to live in a third filter slot that crowds the search bar. If we hear from admins that they want it, it's a 10-line addition.

## Why volumeCBM lives on the container type, not the container

`containerTypes.volumeCBM` is a property of the *equipment*: a 40ft HC reefer has ~67.7 m³, a 20ft has ~33 m³, etc. The container instance just inherits that value. Keeping the source of truth on the type means:
- One place to fix if seed numbers are wrong.
- New container types automatically get correct CBM when added.
- The POST/PUT routes can re-hydrate `maxCapacityCBM` from the type as needed — no drift.

## Verification

- `npx tsc --noEmit` → exit 0.
- Type-check covers both the API changes and the deep ContainerAllocation type ripples in admin-bookings-grid.

## Out of scope for Phase F

- Migrating existing pallet containers to cube. Forward-only.
- A separate Cargo Type filter chip on admin-bookings-grid (see "Why no separate filter chip" above).
- Cargo-items snapshot display on the review modal (the JSONB items list per allocation). The Cube booking flow already snapshots items into the allocation; the admin's review modal currently shows aggregate volume, which is the operational number that matters at approval time. Itemised display can ship later with a dedicated "view source calculation" link.

## Next: Phase G — Display surfaces (client side)

Recent shipments widget, my-bookings widget, invoice line items — all the client-side "N pallets" strings need the same polymorphic treatment.
