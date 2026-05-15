# Post-CBM-rollout fixes & polish

**Period**: May 2026, after the CBM Cargo-Type rollout (Phases A–H, ending at commit `9fd2012`)

This doc is a curated changelog of everything that landed between the close of the CBM rollout and `2026-05-15`. Bug fixes from production use, UX polish flagged on screenshots, and a handful of small feature follow-ups. Linked to commit shas so each entry can be opened with `git show <sha>`.

For the share-link collaboration feature specifically (approve + edit + activity timeline), see [docs/cbm-cargo-type/share-collaboration.md](cbm-cargo-type/share-collaboration.md).

---

## Marketing surface

- **`68a9aad` — Landing CBM calculator showcase section.** New non-interactive teaser on `/` between the Process Timeline and Stats sections. Auto-cycles every 5 s through four real cargo presets (wine, citrus, hunting trophies, mixed industrial) and renders live stats (CBM, pallet equivalent, container-fit bars, CO₂e) for each. CTA opens the existing AuthPanel signup modal. Designed to show value without giving the calculator away for free.

---

## Booking-flow correctness

- **`2742f19` — React setState-during-render in `Step3Docs`.** The doc-upload step's `addFileForCode` / `removeFile` called `syncToFormData` from inside `setFiles(prev => …)`. React flagged it as "Cannot update a component (BookingWizard) while rendering a different component (Step3Docs)". Fix: compute `next` outside the updater, then call `setFiles` and `syncToFormData` sequentially in the event handler.
- **`96aee93` — White-screen on Back in the booking wizard.** `AnimatePresence mode="wait"` requires every direct child to be a `motion` component so it can listen for the exit-complete callback. Two of the three steps were `motion.div` roots; the middle one (cost breakdown) was a plain `<Card>`. The wait callback never fired and Back deadlocked. Fix: wrap every step in a parent-level `motion.div` so AnimatePresence sees a uniform set of children.
- **`eb1235e` — UI showed wrong remaining capacity.** `GET /api/containers` returned `preFilled = container.totalPallets`, which only counts CONFIRMED allocations. The booking POST enforced `maxCapacity − confirmed − pending`. With pending allocations present, the slider's max was inflated and the server bounced submissions. Fix: aggregate PENDING per container in one query, bake into `preFilled` / `totalCBM` before returning. Same fix for CUBE.
- **`eb1235e` — Deleting a pending booking corrupted the container counter.** The admin allocation-delete route was unconditionally subtracting `palletCount` from `containers.totalPallets`, but that counter is only ever incremented on approve. Deleting a PENDING allocation made the counter negative-clamped-to-0. Fix: only decrement when `allocation.status === "CONFIRMED"`.
- **`2e6f605` — SCS booking flow dead-ended at step 2.** `formData.temperature` is `null` for SCS by design (SCS = Dry, no temperature regime per [SCS_SRS_RULES.md](../SCS_SRS_RULES.md)). The sailing block checked `!formData.temperature` and showed "Pick a product and temperature first" — always true for SCS. Fix: derive a `temperatureReady` flag that's `true` whenever rate type is SCS OR a temperature has been picked. Updated three downstream callers (`showNoSailingsForTemp`, `showNoTempsForProduct`, and the sailing block).
- **`17b7f3c` — Container API rejected SCS/Dry containers.** `POST /api/admin/containers` required `temperature` to be one of `frozen`/`chilled`/`ambient`, but SCS/Dry uses `null`. Fix: branch by container type — REEFER must pick one of the three temps, DRY always writes `null`. Same fix on PUT.
- **`17b7f3c` — Create-container modal didn't scroll.** Added `max-h-[90vh] overflow-y-auto` to the dialog content so the full form fits on short screens.

---

## Documents & uploads

- **`f186807` — Doc uploads failed silently on special filename characters.** Server-side upload helper bypassed `generateUniqueFileName` when a `customFileName` was passed. Spaces, parens, accents went straight into the Supabase storage key — rejected by the key validator with a cryptic message. Same call path failed with "resource already exists" on retry because `upsert: false`. Fix: always sanitise + uniquify, even when a custom name is supplied. The custom name becomes a "preferred base" that gets a timestamp + random suffix.
- **`20d586e` — Doc uploads hit storage RLS.** Browser-side Supabase client uploaded with the anon key, no auth session attached. The `srs-documents` bucket's RLS policy rejected the INSERT with `new row violates row-level security policy`. Fix: moved all three doc-upload paths (booking wizard, resubmit dialog, docs vault upload-dialog) to a single server-side route at `/api/bookings/[allocationId]/upload` that uses `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS). Bonus: sequential uploads with a `Uploading 3/6…` progress indicator on the wizard's Confirm button.
- **`d3b30db` → `008746a` — env-config robustness.** Hardened the upload routes to refuse the silent anon fallback (so a missing `SUPABASE_SERVICE_ROLE_KEY` returns a clear 500 instead of a misleading RLS rejection), then later softened it back so projects that already have a permissive bucket policy don't have to set the service-role key.
- **`246f65e` — Admin can upload documents to a client's booking.** New action in the admin bookings dialog. Picks a document type from a dropdown, drags/drops a file, hits Upload. Server route `/api/admin/allocations/[id]/upload` mirrors the client one but uses `requireAdmin`, tags the docs row with `source: "ADMIN_UPLOAD"`, and writes the file under the client's `userId` so it appears in their vault automatically. New `ADMIN_UPLOAD` value added to `documentSourceEnum`. Client-side surfaces an "Uploaded by Seairo" section + a `Seairo` lock badge on the doc card.
- **`68ec876` — CBM PDF: drop non-WinAnsi chars.** jsPDF's default Helvetica is WinAnsi-encoded; characters outside that set (`≈` U+2248, `₂` U+2082) came out as garbled byte sequences spanning multiple chars. Swapped to ASCII fallbacks (`~`, `CO2eq`). `m³` and `·` are in WinAnsi and render fine.

---

## Locations

- **`7e68cab` — Same code can be both ORIGIN and DESTINATION.** Cape Town exports today and will import tomorrow. The old schema had `locations.code` globally unique, so `(ZACPT, DESTINATION)` couldn't coexist with `(ZACPT, ORIGIN)`. Fix: dropped the code-only unique, added composite unique on `(code, type)`. POST + PUT routes do a friendly duplicate check before insert/update and return a clean 400 instead of a DB-level 500.
- **`0863420` — Pin location lookups to the expected type.** Six queries elsewhere in the codebase (rates.ts and the MetaShip book route) looked up locations by `code` alone. With the composite unique allowing duplicates by code, those queries became ambiguous — `.limit(1)` would return whichever row Postgres found first, so a quote's displayed origin name could flip silently. Fix: pin each lookup to the type implied by context (origin lookups → `type=ORIGIN`, destination lookups → `type=DESTINATION`).

---

## Admin destructive actions

- **`c6dea8f` — Admin can delete a booking from Fleet & Containers.** Each allocation row in the fleet view now has a small trash icon at the far right. Click opens an AlertDialog naming the client + pallet count + what cascades. New `DELETE /api/admin/allocations/[id]`: refuses if any linked invoice is PAID, then cascade-deletes documents → invoices → the allocation row. Decrements `container.totalPallets` (or `totalCBM` for CUBE) — but only if the deleted allocation was CONFIRMED, since PENDING never bumped the counter (see `eb1235e` above). Reverts `THRESHOLD_REACHED` → `OPEN` when pallets drop below 15.
- **`4d32400` — Admin container delete works at any status.** Previously disabled whenever `status !== "OPEN"`. Now allowed for any status with a stronger confirm dialog calling out non-OPEN status + the MetaShip order number if applicable. DELETE route relaxed: refuses only if a linked invoice is PAID; otherwise cascades through allocations → docs → invoices → container in one server-side step. Also added the same trash-icon affordance to allocation rows in `admin-bookings-grid`.

---

## Rate management — correctness

- **`3df270e` — Origin charges list totals were always R 0,00 on Cube cards.** The list's `calculateTotal` only branched on `PER_CONTAINER` and `PER_PALLET`. `PER_CBM` items contributed nothing. Fix: added the PER_CBM branch; the per-unit divisor now reads from `cargoType`.
- **`3df270e` — Editor copy was reefer-only.** Totals row read "Equivalent Cost per Pallet · 40ft HC Reefer (20 pallets)" regardless of cargo type. Now flips to "Equivalent Cost per m³ · 40ft HC Cube (67.7 m³)" on Cube cards.
- **`c8188de` — Editors + lists use real container dimensions.** Both rate editors and the origin-charges list hardcoded 40ft HC defaults (67.7 m³ / 20 pallets). A 20ft Dry rate card inflated its totals by the size delta. Fix: API joins `container_types`, returns `volumeCBM` + `maxPallets` per row, `[id]` and `/new` pages pass these to the editors, editors use the props with a 40ft HC fallback only when the join returns nothing.
- **`fdf2c60` — Buy Rate disappeared on edit.** The save path wrote `buyUnitCost` / `buyContainerCost` correctly. The bug was the `[id]` page mapping items from DB → `initialData` — it was *dropping* those fields, so the editor loaded them as `undefined` and the Buy column rendered empty. Fix: added the missing fields to both rate types' page mappings. Same fix for destination's `buyAmountZAR` and `buyExchangeRateToZAR`.
- **`9d4fc95` — `calculateQuote` (PALLET path) didn't filter by `cargoType`.** Audit of the rate-card lookups across the 4 entry points (booking step-2 quote, booking POST, `/api/rates/quote`, CBM calculator live quote) found 3/4 paths correctly filtered both `salesRateTypeId` AND `cargoType`. The holdout was `lib/rates.ts::calculateQuote()` — its three queries filtered `salesRateTypeId` only, so a Cube card could win the `.orderBy(effectiveFrom)` race for a Pallet booking. Pinned all three queries to `cargoType=PALLET`. Audit verdict: now 4/4.

---

## Rate management — styling

- **`27ca8ec` — Restyle admin rate-management pages.** Origin Charges, Destination Charges, and Ocean Freight rendered their `<Card>` wrappers with the light-theme default surface (white panel, grey header strip) which clashed with the slate-950 admin chrome. Country accordions on Ocean Freight were the worst — each country sat as a white panel against the dark page. Aligned all three pages with the dark slate aesthetic: `Card → bg-slate-900 border-slate-800`, table header row → `bg-slate-950`, `text-slate-400` uppercase tracking-wider labels, hover `slate-950/60`, numeric cells bumped from 600- to 400-shade text so they read on dark.
- **`fdf2c60` — Restyle the editor pages.** Same treatment for the wrapping Card, the "Additional Services" header banner, table header row, data rows, and the leftover light gradient on the destination totals strip.

---

## CBM 3D viz packing algorithm

A four-commit iteration on how cargo boxes are arranged inside the container preview, after the user kept flagging visual oddities:

- **`5a0ccb0` — Spread across width + height, not stacked centrally.** Old code placed every box at `x: 0`. Switched to a 3-axis shelf-pack (length first, then width, then height).
- **`cb71aed` — Width-first packing.** User wanted side-by-side first; reordered to X → Y → Z.
- **`8722ea0` — Virtual rotation + tighter gap.** Each box's three dimensions sort to (smallest → width, middle → height, largest → length) so they tile cleanly. Gap dropped from 2 cm to 1 cm so the boundary check doesn't push the last box into a new row.
- **`77ad295` — Heightmap-based Y placement.** Small boxes were floating above shorter neighbours because `rowMaxHeight` lifted *every* new-row box to the tallest one's level. Replaced with a per-slice heightmap: each box's bottom is the max top-Y of whatever overlaps its XZ footprint. Boxes rest on their actual neighbours, valleys get filled first.

---

## Calculator presets

- **`6af3d32` — `npm run seed:cargo-presets`.** Mirrors `POST /api/admin/cargo-item-presets/seed` but runs from the terminal without an admin session. 14 industry-typical presets (wine cases, citrus, trophies, chocolate, drums, pallet bases). Idempotent on `(name, isAdmin=true, userId=null)`. Defensive on missing categories — falls back to `null` if `cat-confectionery` / `cat-dry-mixed` aren't seeded yet.

---

## Container types — the SCS/Cube discovery bug

The bug that closed out the session, with three commits:

- **`f0252e4` — Populate `volumeCBM` on container_types.** Original `lib/db/seed.ts` seeded the six container_type rows without `volumeCBM`. The admin POST `/api/admin/containers` route hydrates `maxCapacityCBM: ct.volumeCBM ?? null`, so every container in the DB had `maxCapacityCBM = NULL`. The booking-options query's CUBE capacity check evaluated `COALESCE(NULL, 0) - 0 > 0` = false and silently excluded the container from the results. Clients saw "No products available on this route".

  Fixes in one commit:
  1. Updated `lib/db/seed.ts` to include realistic interior CBM per type (20ft Reefer 28.30, 20ft Dry 33.20, 40ft Reefer 58.10, 40ft HC Reefer 67.00, 40ft Dry 67.50, 40ft HC Dry 76.40 m³).
  2. New script `scripts/backfill-container-volumes.ts` (run via `npm run backfill:container-volumes`) that UPDATEs each container_type's volumeCBM and re-hydrates `maxCapacityCBM` on every existing `containers` row from its type.
  3. Admin container-types POST + PUT now accept a `volumeCBM` field for future edits.

  User had to run `npm run backfill:container-volumes` once after pulling. Output confirmed `6/6` types updated, `6` containers updated.

---

## Schema migrations summary

Schema changes shipped in this period (each requires `npm run db:push`):

| Commit | Change |
|---|---|
| `7e68cab` | `locations`: drop code-only unique, add composite unique on `(code, type)` |
| `246f65e` | Add `ADMIN_UPLOAD` to `documentSourceEnum` |
| `34ac1db` | `cargo_calculation_shares`: add `allow_approve` + `allow_edit`. New table `cargo_calculation_share_actions` + `share_action_type` enum. Add `CBM_SHARE_APPROVED` + `CBM_SHARE_EDITED` to `clientNotificationTypeEnum`. |

One-off backfill that's NOT schema but needed once on existing data:

```
npm run backfill:container-volumes
```

---

## Verification

`npx tsc --noEmit` clean at every commit. No type regressions across the whole period.
