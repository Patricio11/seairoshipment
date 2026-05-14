# Phase D — Booking Wizard Integration

**Status:** ✅ Done — `tsc --noEmit` clean.

The booking wizard now understands Cargo Type. SCS bookings can be either Pallet (existing flow, unchanged) or Cube (new — uses a saved CBM calculation). The Smart-match panel from Phase C.2 deep-links into the wizard with a calculation + container already chosen.

After Phase D the full Cube booking lifecycle is closed: a client creates a calculation in Tools → sees matching containers in Smart-match → clicks "Book this container" → wizard opens prefilled → confirms → invoice + allocation are created with the calc snapshotted in.

---

## What's in this phase

### 1. Types ([types/index.ts](../../types/index.ts))

- `BookingFormData` gains: `cargoType`, `calculationId`, `cbmVolume`, `volumetricWeightKg`, `cargoItems`.
- `ContainerSlot` gains: `cargoType`, `totalCBM`, `maxCapacityCBM` so the wizard can render CBM-aware containers and the cube fit-check has the data it needs.
- `CostBreakdown` is now polymorphic — discriminated by `cargoType`. Pallet-mode rows carry `originPerPallet` etc. and `palletCount`; cube-mode rows carry `originPerCBM` etc. and `cbmVolume`. The step-cost-breakdown UI picks the right accessor without inferring.

### 2. Modal hook ([hooks/use-booking-modal.ts](../../hooks/use-booking-modal.ts))

New `BookingPrefill` interface (`cargoType`, `calculationId`, `containerId`) + `onOpenWithPrefill()` action. The store now publishes a third subscription for prefill data so anyone listening (the modal, the wizard) gets the prefilled payload alongside the open signal. `onOpen()` and `onClose()` clear the prefill so a normal open doesn't carry stale Cube state from a previous Smart-match flow.

### 3. APIs

**POST /api/bookings** ([app/api/bookings/route.ts](../../app/api/bookings/route.ts))
- Branches by `cargoType`:
  - **Pallet** path is unchanged.
  - **Cube** path: fetches the referenced calculation, verifies ownership, **recomputes** `totalCBM` + `volumetricWeightKg` server-side from the items (client values ignored — same trust pattern as the Tools save endpoint), snapshots the items + totals onto the allocation row.
- Container.cargoType match is now enforced — a Cube allocation can't sit on a Pallet container or vice-versa. Mismatched submissions are rejected with a clear message.
- Cube capacity check uses CBM: `containers.maxCapacityCBM - (totalCBM + pending CBM) ≥ cbmRequired`.
- Cube bookings can't auto-find a container — explicit `containerId` is required (the user picked one from Smart-match or the container list).
- Invoice generation branches: Pallet uses `calculateQuote()` (per-pallet); Cube uses `calculateCubeQuote()` (per-CBM). Both write `cargoType` + `cbmVolume` / `palletCount` on the invoice row so the finance side can render the right unit.
- Success payload now returns `cargoType`, `totalPallets`, `totalCBM` so the wizard toast can use the right unit copy.

**GET /api/containers** ([app/api/containers/route.ts](../../app/api/containers/route.ts))
- New `cargoType` query filter (`PALLET` | `CUBE`). Mismatched containers fall into the `excluded` array with a clear reason.
- Capacity check branches: pallet containers use `maxCapacity - totalPallets ≥ 1`; cube containers use `maxCapacityCBM - totalCBM > 0`.
- Slot response now carries `cargoType`, `totalCBM`, `maxCapacityCBM`.

**GET /api/bookings/options** ([app/api/bookings/options/route.ts](../../app/api/bookings/options/route.ts))
- New `cargoType` query param. Cascading options only include containers that match the cargo type. SQL capacity check switches between the pallet and CBM column based on the type.

**GET /api/rates/quote** ([app/api/rates/quote/route.ts](../../app/api/rates/quote/route.ts))
- New `cargoType` + `cbmVolume` query params. Cube mode calls `calculateCubeQuote()` and prepends `cargoType: "CUBE"` to the response. Pallet path is unchanged. Falls back to the container's `cargoType` column when the param is absent.

### 4. UI changes

**Step 2 ([components/booking/step-2-cargo.tsx](../../components/booking/step-2-cargo.tsx))**
- New **Cargo Type chooser** — appears only for SCS (SRS is always pallet). Two tiles (Pallet / Cube), with a small helper line under the Cube tile linking to Tools when picked.
- Cargo Type changes invalidate the container pick — different cargo types live on different containers.
- `fetchOptions()` and `/api/containers` calls now pass the cargo type, so the container list filters correctly.
- **Adjustment stage** branches:
  - Pallet: existing slider + weight inputs + share bar (unchanged).
  - Cube: new `<CubeCalcPicker>` dropdown of saved calculations, with non-fitting calcs greyed-out + reason. Selected calc shows green "Fits" / red "Doesn't fit" pill with spare/over CBM. The 3D viz swaps to `<CBM3DViz>` rendering the calc's actual items inside the container scaled to `maxCapacityCBM`.
- A "Create a new calculation" link opens `/dashboard/tools/cbm-calculator/new` in a new tab so the wizard state isn't lost.

**Step Cost Breakdown ([components/booking/step-cost-breakdown.tsx](../../components/booking/step-cost-breakdown.tsx))**
- Polymorphic render driven by the response's `cargoType` discriminator. Cube quotes display per-m³ rates and the volume × cost multiplication; Pallet quotes are unchanged. Container badge label flips to "40ft HC Cube" when relevant.

**Booking wizard ([components/booking/booking-wizard.tsx](../../components/booking/booking-wizard.tsx))**
- Takes a new `prefill` prop. On mount it fetches the referenced calc and seeds `cargoType`, `calculationId`, `cbmVolume`, `cargoItems`, `volumetricWeightKg`, `grossWeight` — so a Smart-match deep-link drops the user into step 1 with everything filled in except contact + docs.
- Step 1 → Step 2 validation branches: Cube requires `calculationId + cbmVolume`; Pallet requires `palletCount ≥ 1`.
- Submit payload carries `cargoType + calculationId` for Cube; `palletCount` for Pallet. Both go to the same endpoint.
- Success toast uses mode-aware copy: `12.50 m³` vs `5 pallet(s)`.

**Booking modal** + **dashboard layout** — thread the `prefill` from the hook through `<BookingModal>` to `<BookingWizard>`. One-line plumbing each.

### 5. Smart-match deep-link ([components/cbm/smart-match-panel.tsx](../../components/cbm/smart-match-panel.tsx))

The per-row "Book this container" button no longer navigates to a fake `/dashboard/bookings/new` URL. It now calls `bookingModalStore.onOpenWithPrefill({ cargoType: "CUBE", calculationId, containerId })` directly. The modal opens with the right state, no page navigation, no flash.

### 6. CubeCalcPicker ([components/booking/cube-calc-picker.tsx](../../components/booking/cube-calc-picker.tsx)) — new

Standalone component owned by the booking wizard. Fetches `/api/dashboard/cbm-calculations`, renders a Popover + Command searchable dropdown with each calc's name + total CBM + fit indicator. Calculations whose CBM exceeds the container's remaining capacity are disabled with an inline reason. Has a friendly empty state with a "Create your first calculation" CTA that opens the Tools page in a new tab. When a calc is selected the parent receives `{ id, cbmVolume, weightKg, cargoItems }` and the form data + 3D viz update live.

---

## Files touched

```
types/index.ts                                            modified
hooks/use-booking-modal.ts                                modified (prefill)
app/api/bookings/route.ts                                 modified (cube branch + snapshot + invoices)
app/api/containers/route.ts                               modified (cargoType filter + cbm fields)
app/api/bookings/options/route.ts                         modified (cargoType filter)
app/api/rates/quote/route.ts                              modified (cube branch)
components/booking/booking-wizard.tsx                     modified (prefill effect + submit)
components/booking/booking-modal.tsx                      modified (prefill prop)
components/booking/step-2-cargo.tsx                       modified (cargo-type gate + Cube branch)
components/booking/step-cost-breakdown.tsx                modified (per-m³ render)
components/booking/cube-calc-picker.tsx                   new
components/cbm/smart-match-panel.tsx                      modified (direct modal open)
app/dashboard/layout.client.tsx                           modified (thread prefill)
```

---

## End-to-end flow (with the live data path)

```
1. Client logs in → Tools → CBM Calculator → New
2. Builds a calculation with the new bulk-paste affordance OR cargo-item presets
3. Saves it. LiveQuote and Smart-match panels appear under the 3D viz
4. Smart-match shows "MSC Maersk Voy 42 · 8.5 m³ available · cut-off in 2d 14h"
5. Client clicks "Book this container"
6. Booking modal opens — prefill flows through the store. Wizard fetches
   the calc, seeds cargoType=CUBE + calculationId + container + items +
   totals + weight
7. Step 1 already shows: route, sailing, cargo type=CUBE, container picked,
   calc picked, 3D viz mirrors the calc + container
8. Client clicks Next → step-cost-breakdown fetches /api/rates/quote with
   cargoType=CUBE + cbmVolume, renders per-m³ pricing
9. Client clicks Next → step 3 docs + terms
10. Confirm → POST /api/bookings with cargoType=CUBE + calculationId.
    Server fetches the calc, recomputes totals, snapshots items into the
    allocation row, creates Cube-priced invoices, returns
    { cargoType: "CUBE", totalCBM, bookingReference }
11. Success toast: "Reference: SRS-X8K9LM | 6.23 m³"
```

---

## Manual test checklist

After `npm run db:push`:

1. **Pallet booking (regression check)**: open the wizard from the dashboard → SCS or SRS → pick a pallet container → pallet slider works → cost breakdown shows per-pallet → submit. Allocation has `cargoType=PALLET`, invoices have `palletCount > 0`.
2. **Cube booking from Tools**: create a CBM calc → click "Book this container" on a Smart-match row → wizard opens prefilled → confirm container + calc → next step shows cube pricing in m³ → submit. Allocation has `cargoType=CUBE`, `cargoItems` is the snapshot, `palletCount=0`, `cbmVolume` set.
3. **Cargo-type mismatch guard**: try to POST to `/api/bookings` with `cargoType=CUBE` but a pallet `containerId` (via curl/devtools) → server rejects with a clear message.
4. **Cube without rate cards**: book a cube allocation on a route with no Cube rate card → booking succeeds, invoices created with zero amounts (admin adjusts).
5. **Cube over-capacity guard**: pick a calc whose CBM exceeds the container's remaining → picker shows it disabled with "Doesn't fit" reason. If somehow the user pushes through, server rejects on submit.

---

## Out of scope for this phase

- **Per-row "Save as preset"** in the calculator (small follow-up). The POST endpoint is already there.
- **3D loading playback animation** — Tier 2 visual polish, can land any time.
- **Cut-off urgency banner inside the calculator** (when no specific container is picked) — partially redundant with Smart-match panel; revisit if asked.
- **Keyboard shortcuts** on the calculator — quality-of-life follow-up.

---

## Phase D — complete

```
A · Schema foundations            ✅
B · CBM helpers + calculator UI   ✅
C · Tools hub + saved calcs       ✅
D · Booking wizard integration    ✅ ← THIS PHASE
E · Admin rate cards              ← NEXT
F · Container creation + admin views
G · Display surfaces
H · Polish + tracker updates
```

**Next**: Phase E. Admin gets the ability to create **Cube** rate cards (PER_CBM line items) for origin / ocean freight / destination so the Live Quote and the booking invoices stop returning zeros. Once Phase E ships, end-to-end Cube pricing is live.
