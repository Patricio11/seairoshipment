# Phase B — CBM Helpers + Calculator UI

**Status:** ✅ Done — `tsc --noEmit` clean. Smoke-tested at `/dev/cbm` (throwaway page).

This phase builds the pure CBM helper module and the two visual building blocks the Tools section will compose in Phase C: the `<CBMCalculator>` (input + totals + container fit) and the `<CBM3DViz>` (rotating 3D scene). No backend wiring yet — the calculator is a controlled component the caller wires up.

---

## What's in this phase

### 1. [`lib/cbm.ts`](../../lib/cbm.ts) — pure helpers

Zero React, zero DB. Canonical units: lengths in **millimetres**, weights in **kilograms**, volumes in **cubic metres**. Unit toggles in the UI are display-side only.

**Conversion**
- `toMm(value, unit)` / `fromMm(mm, unit)` — cm / in / m / ft
- `toKg(value, unit)` / `fromKg(kg, unit)` — kg / lb

**CBM math**
- `itemCbm(item)` — single-item volume × quantity
- `totalCbm(items)` — sum across an array
- `totalWeight(items)` — gross weight across all units

**Volumetric weight by mode**
- Industry-standard factors locked in: `sea = 1000 kg/m³`, `air = 167`, `courier = 200`, `road = 333`
- `volumetricWeight(cbm, mode)` plus a `volumetricWeightSea(cbm)` alias for the v1-default path
- `chargeableWeight(actualKg, cbm, mode)` — `max(actualKg, volumetric)` for future chargeable-weight pricing

**Container fit**
- `STANDARD_CONTAINERS` constant: `20ft = 33.2`, `40ft = 67.7`, `40ftHC = 76.4` m³
- `fitInContainer(totalCbm, containerVolumeCbm)` → `{ fits, percentFull, remainingCbm, qtyContainersNeeded }`
- `fitInStandardContainers(totalCbm)` → row per standard size (drives the fit table)
- `smallestFitContainer(totalCbm)` → returns the smallest standard that fits, or null

**Brand-on extras**
- `palletEquivalent(cbm)` — divides by EUR1 pallet volume (1.68 m³); the "≈ X EUR pallets" indicator
- `sustainabilityScore(weightKg, cbm)` → `{ kgCO2eqSea, kgCO2eqAir, percentLessThanAir }` using industry-standard tonne-km factors over a 12,000 km baseline route

**Formatters**
- `formatCbm(n)` → `"12.34 m³"`
- `formatKg(n)` → kg up to 999, then tonnes
- `formatDimensionMm(mm, unit)` → display string

### 2. [`components/cbm/cbm-calculator.tsx`](../../components/cbm/cbm-calculator.tsx)

Fully controlled component. Caller owns the `CargoItem[]` state; the component renders inputs + live totals + the container fit table.

**Props**
```ts
{
  value: CargoItem[]
  onChange: (next: CargoItem[]) => void
  containerVolumeCBM?: number | null   // optional override for the fit panel
  containerLabel?: string
  readOnly?: boolean                   // for share-link views
}
```

**Behaviours**
- Auto-seeds a blank first row so the UI is never empty.
- Single set of unit toggles applies to *all* rows (Dimensions: cm/in/m/ft, Weight: kg/lb). Storage stays in canonical mm/kg.
- Per-row live CBM caption ("Row volume: 0.21 m³") so users get immediate feedback as they type.
- Three stat cards: Total Volume (with pallet equivalent), Total Weight (with sea volumetric), CO₂eq.
- Container fit table with progress bars and per-row "X m³ spare / over". The smallest fitting standard container is highlighted; if a specific container is passed via `containerVolumeCBM` it's pinned at the top.
- Read-only mode hides Add/Remove and disables inputs — used by the public share view in Phase C.

**Validation guardrails**
- `MAX_DIMENSION_MM = 10_000` (10 m) — anything larger is a typo
- `MAX_WEIGHT_KG = 50_000` per unit
- `MAX_QUANTITY = 100_000`
- Negative inputs coerce to 0

### 3. [`components/cbm/cbm-3d-viz.tsx`](../../components/cbm/cbm-3d-viz.tsx)

`@react-three/fiber` + `@react-three/drei` scene that mirrors the aesthetic of [`components/booking/container-scene.tsx`](../../components/booking/container-scene.tsx) — same lighting (`Environment preset="city"`), same `ContactShadows`, same wireframe container outline with corner posts.

**How items are placed**
- Each quantity unit becomes a coloured box (`boxGeometry`).
- Colour is hashed from the row's label, so the same item kind shares a colour across re-renders.
- Items are sorted largest-first and laid out in a simple shelf pack along the length axis, starting at the back of the container.
- When a shelf fills, the cursor jumps up to start a new one — until the container's height limit, then placement stops.
- **Cap of 60 visual blocks** to keep the scene snappy. The cap doesn't affect the calculation math; it only limits rendered geometry.
- Auto-rotate on by default at 0.6 speed; OrbitControls let the user drag.

**Container sizing**
- Defaults to 40ft interior dimensions (12.0 × 2.35 × 2.39 m).
- Pass `containerVolumeCBM` to scale the default 40ft proportionally; or pass explicit `interior: { length, width, height }` to override entirely. Phase C will pass interior dims off `container_types.internalLengthMm/WidthMm/HeightMm`.

**On-canvas overlay**
- Two pill chips top-left showing current total volume (m³) and percent full + container dims.

**Explicit non-goals**
- This is not a real 3D bin-packer. Pallet weight distribution, door-side clearance, stacking-strength constraints — none of that. That's the Container Loading Planner future tool (Tier 3).

### 4. Smoke-test page

[`app/dev/cbm/page.tsx`](../../app/dev/cbm/page.tsx) — `/dev/cbm`, not linked. Three buttons: load demo cargo (wine + citrus + chocolate), reset, and the live calculator + viz side-by-side. **Delete after Phase C is fully shipped.**

---

## Files touched

```
lib/cbm.ts                              new
components/cbm/cbm-calculator.tsx       new
components/cbm/cbm-3d-viz.tsx           new
app/dev/cbm/page.tsx                    new (throwaway)
```

---

## Verification

```bash
npx tsc --noEmit
# ✅ clean
```

Manual smoke test:
1. `npm run dev`
2. Visit http://localhost:3000/dev/cbm
3. Click **Load demo cargo** — confirm:
   - 3 rows appear (wine / citrus / chocolate)
   - Total Volume reads ~6.6 m³
   - Pallet equivalent ≈ 3.9
   - Container fit shows 40ft as smallest fit (~10% full)
   - 3D viz renders coloured blocks along the floor with auto-rotate
4. Switch length unit cm → in → m → ft and back; values round-trip correctly.
5. Switch weight unit kg ↔ lb; weight column updates without data loss.
6. Add a 5 m × 5 m × 5 m item — verify it pegs Total Volume well over 40ft and the fit row goes red.
7. Reset; confirm the auto-seeded blank row reappears.

---

## What this phase does NOT do

- No backend (`/api/dashboard/cbm-calculations` lives in Phase C).
- No Tools hub page, no saved calculations list, no PDF download — all Phase C.
- No preset picker, no bulk paste, no live quote, no smart-match — those are the Phase C "killer feature" upgrades that wrap this baseline calculator.
- No 3D loading playback animation — Tier 2 visual upgrade, lands in Phase C.

---

## Next phase

**Phase C — Tools hub + saved calculations + killer features.** New routes under `/dashboard/tools/cbm-calculator`, the calculations API, the share-link flow, the cargo-item presets dropdown, the live-quote panel, the smart-match containers panel, PDF download via `@react-pdf/renderer`, and a sidebar nav entry. The `/dev/cbm` smoke page gets deleted at the end of that phase.
