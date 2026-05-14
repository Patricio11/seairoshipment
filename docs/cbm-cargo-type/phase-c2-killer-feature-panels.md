# Phase C.2 — Killer-Feature Panels (Presets · Live Quote · Smart-Match)

**Status:** ✅ Done — `tsc --noEmit` clean.

The three Tier 1 platform-integration features that none of the generic cargo calculators on the market (pier2pier, CBM3, Freightos) can replicate, because none of them know the user's actual rates or fleet. Wired into the calculator alongside the Phase C.1 foundation.

---

## 1. Cargo item presets — admin-curated + user-saved

### Data (existing schema from Phase A: `cargo_item_presets`)
Admin rows (`isAdmin=true, userId=null`) and personal rows (`isAdmin=false, userId=<id>`) share the table. Linked to `product_categories` so the picker can rank category-matching presets first.

### APIs (new)
- `GET /api/cargo-item-presets?categoryId=?` — public to logged-in users. Returns admin presets + the user's own. Optional `categoryId` ranks category-matching presets first, then category-agnostic (pallet bases), then other categories. User-saved presets always top.
- `POST /api/cargo-item-presets` — user saves a personal preset (name + dimensions + optional weight + optional categoryId). Dimensions validated ≤ 10 m.
- `POST /api/admin/cargo-item-presets/seed` — admin-only, idempotent. Seeds the **14 starter presets**:
  - **Wine & Spirits**: 12-bottle case, 6-bottle case, spirits 12-pack
  - **Fruit**: citrus 15kg carton, grape 4.5kg punnet pack, apple/pear 18kg bin
  - **Hunting Trophies**: standard crate, skull/horn export box
  - **Confectionery**: chocolate 24-bar carton, bulk box
  - **Other Dry Mixed**: standard double-wall carton, industrial 200L drum
  - **Pallet bases** (no category): EUR 1, ISO
- Future admin CRUD UI (Phase E or F) reads/writes the same table directly; the seed is the v1 fast path.

### UI integration ([components/cbm/cbm-calculator.tsx](../../components/cbm/cbm-calculator.tsx))
- New "Quick add from preset" button beside the unit toggles. Opens a searchable Popover + Command list.
- New `categoryId?: string | null` prop on `<CBMCalculator>`. The standalone calculator passes nothing (all presets ranked equally). The booking wizard will pass the chosen container's `categoryId` in Phase D so wine cases bubble to the top when booking a Wine & Spirits container.
- Selecting a preset adds a row with its dimensions + weight + label, qty = 1. If the only existing row is the auto-seeded blank, the preset *replaces* it instead of creating a sibling — keeps the UI clean for first-time use.
- Personal presets show a small purple "Yours" badge so users can tell their own apart from admin-curated.

---

## 2. Live SCS Cube quote — real rate cards

### Engine ([lib/rates.ts](../../lib/rates.ts))
New `calculateCubeQuote(originCode, destinationCode, cbmVolume, salesRateTypeId, containerTypeId)` returns a `CubeCostBreakdown`:

```ts
{
  originPerCBM, oceanPerCBM, destinationPerCBM, totalPerCBM,
  totalCost, depositAmount, balanceAmount,
  cbmVolume, originName, destinationName,
  hasOriginRates, hasOceanRates, hasDestinationRates,
  containerVolumeCBM,
}
```

Rate cards are filtered by `cargoType = 'CUBE'`. Logic per category:
- **Origin**: `PER_CBM` line items multiply by `cbmVolume`. `PER_CONTAINER`/`FIXED` line items split by `1 / containerVolumeCBM`. (PER_PALLET on a CUBE card is ignored — that would be an admin config mistake.)
- **Ocean**: per-container total split proportionally: `totalZAR / containerVolumeCBM`.
- **Destination**: line items either `PER_CBM` (direct multiply) or split by `1 / containerVolumeCBM`.

Container volume is read from `container_types.volumeCBM`; falls back to 67.7 m³ (40ft HC) if not set so the calculator still produces a quote when admin hasn't seeded the volume yet.

### API ([app/api/dashboard/cbm-calculations/[id]/quote/route.ts](../../app/api/dashboard/cbm-calculations/[id]/quote/route.ts))
`GET /api/dashboard/cbm-calculations/[id]/quote?route=ZACPT-NLRTM&containerTypeId=…`

- Ownership-checked.
- `route` is optional — if missing we fall back to the user's most-recently-booked container route.
- `containerTypeId` defaults to `40ft-hc-reefer` (configurable later).
- Returns `{ quote: CubeCostBreakdown }` on success, or `{ quote: null, reason: "no_route" | "rate_unavailable", message }` on graceful degradation.
- Never throws on missing rate cards — calculators don't need to crash when admin hasn't loaded a route's rates yet.

### UI ([components/cbm/live-quote-panel.tsx](../../components/cbm/live-quote-panel.tsx))
Emerald-bordered panel below the 3D viz. Shows:
- Headline total in ZAR (formatted with k/M shortcuts).
- 3-column breakdown: Origin / Ocean / Destination per-CBM × subtotal, plus a "no rate" flag where data is missing.
- Per-CBM rate and deposit/balance footer.
- "Partial rates" warning when one of the three categories is missing.
- Friendly fallback states for "no route", "no rate card", and loading.

---

## 3. Smart-match Containers — which of *your* containers fits this?

### API ([app/api/dashboard/cbm-calculations/[id]/matches/route.ts](../../app/api/dashboard/cbm-calculations/[id]/matches/route.ts))
`GET /api/dashboard/cbm-calculations/[id]/matches?route=…`

Returns active SCS Cube containers whose `maxCapacityCBM - totalCBM ≥ calc.totalCBM`. Filters:
- `salesRateTypeId = 'scs'`
- `cargoType = 'CUBE'`
- `status NOT IN (SAILING, DELIVERED)` — only bookable containers
- `etd > now` — only future sailings
- Sorted by `etd ASC` so the most-urgent (next to cut) appears first.

Route preference: explicit `?route=` → user's most-recent booked route → all routes. If the route filter returns nothing, the endpoint widens to all routes and sets `fallbackUsed: true` so the UI can label the result as "nearby routes" instead of an exact match.

### UI ([components/cbm/smart-match-panel.tsx](../../components/cbm/smart-match-panel.tsx))
Blue-bordered panel under the live quote. Shows up to 4 matches per panel:
- Vessel + voyage + route + remaining CBM + spare CBM (after this cargo).
- Cut-off urgency pill: green ≥ 72h, amber 24–72h, red ≤ 24h or past.
- Per-row "Book this container" button that deep-links to `/dashboard/bookings/new?calculationId=…&containerId=…` — the booking wizard will handle these query params in Phase D.
- "+ N more" footnote when more matches exist than the panel shows.

---

## Files touched

```
app/api/admin/cargo-item-presets/seed/route.ts                  new
app/api/cargo-item-presets/route.ts                             new
app/api/dashboard/cbm-calculations/[id]/quote/route.ts          new
app/api/dashboard/cbm-calculations/[id]/matches/route.ts        new
lib/rates.ts                                                     modified — calculateCubeQuote()
components/cbm/cbm-calculator.tsx                                modified — preset picker
components/cbm/live-quote-panel.tsx                              new
components/cbm/smart-match-panel.tsx                             new
components/cbm/calculation-editor.tsx                            modified — panels mounted
```

---

## Manual test checklist

After commit:

1. `npm run db:push` (if you haven't already since Phase A — required for the new tables/columns).
2. Seed the cargo-item presets — `POST /api/admin/cargo-item-presets/seed` (admin auth required; easiest via `curl` with a session cookie, or build the admin UI in Phase E/F).
3. Open `/dashboard/tools/cbm-calculator/new`. Click "Quick add from preset" — 14 presets appear, ranked with category-agnostic pallet bases mid-list.
4. Pick "Wine 12-bottle case" — row populates with 350 × 300 × 230 mm, 16 kg, qty 1. Bump qty to 24 (full pallet). Total CBM ≈ 0.58 m³.
5. Save the calc as "Wine UK test". You land on the `[id]` page.
6. The Live Quote panel below the 3D viz tries to fetch a quote. With no Cube rate cards in place yet (Phase E loads them) it shows the "No rate card available" friendly state — exactly what we want for v1 before sales has configured rates.
7. The Smart-match panel below tries to fetch open Cube containers. Without any Cube containers created yet (Phase F adds the create flow) it shows "No open Cube containers fit this cargo".
8. Both panels re-fetch when you save changes — verified via `refreshKey` prop bumping on save.

---

## What this sub-phase does NOT do

- No personal preset save-from-row affordance — the POST endpoint exists; the UI button is a small follow-up.
- No admin UI for editing/adding presets — deferred to Phase E/F. For now the seed endpoint is the way.
- No share-by-link, no PDF download, no bulk paste — those are C.3.
- No booking wizard integration of the "Book this container" deep-link yet — the URL is fine, the wizard will pick it up in Phase D.

---

## Next sub-phase

**C.3** — Share-by-link (token table + public read view + audit), PDF download via `@react-pdf/renderer` (dynamic import), bulk paste / CSV upload into the calculator, 3D loading playback animation, cut-off urgency banner, keyboard shortcuts. The `/dev/cbm` smoke page from Phase B gets deleted at the end of C.3.
