# SCS / SRS Rules — Container Type vs Temperature Regime

## Goal

Tighten the conceptual model so **container type** (Dry vs Reefer) and
**temperature regime** (Frozen / Chilled / Ambient) are clean,
orthogonal concepts:

- **SCS** = *Shared Container Service* — **Dry** container. No
  temperature regime applies. Period.
- **SRS** = *Shared Reefer Services* — Reefer container. Can be set to
  **Frozen (-18°C)**, **Chilled (+5°C)**, **OR Ambient (+18°C)** depending
  on cargo. Ambient on a reefer is a real use-case (e.g. chocolate /
  confectionery that needs controlled-but-not-chilled conditions).

### Cargo type (Pallet vs Cube)

A second dimension was added in the CBM rollout. See [CBM_CARGO_TYPE.md](CBM_CARGO_TYPE.md) for the full story.

- **SRS** is **always Pallet** — reefer cargo is always palletised, so SRS containers, rate cards, and bookings all force `cargoType: "PALLET"`.
- **SCS** can be either **Pallet** OR **Cube**. Cargo type is **locked at creation** on the container, the rate card, and the booking — same lock pattern as `salesRateTypeId`. Once an SCS container is created as Cube, all allocations on it are m³-priced and the calculator-driven booking flow applies; once created as Pallet, it behaves like a traditional pallet-counted SCS container.
- The booking wizard only asks the Pallet/Cube question when SCS *and* the chosen route has both modes open; if only one mode is available, the wizard auto-selects it.

Before this change SCS was treated as "ambient-only" and SRS was
explicitly *blocked from* ambient — which conflated the container type
with a temperature regime and made chocolate-style products unbookable.

---

## Decisions

| Question | Answer |
|---|---|
| How is SCS modelled now? | `allowedTemperatures: []` on the category; `containers.temperature = null`; `pallet_allocations.temperature = null`. The null is the canonical "dry / no regime" sentinel — *not* `"ambient"`. |
| Can SRS now select ambient? | Yes. Reefer at +18°C is a valid setting for confectionery, dry-but-heat-sensitive goods, etc. |
| Should two ambient cargo paths confuse clients? | The category description is the disambiguator. SCS-Dry goes in dry boxes (e.g. wine, hunting trophies); SRS-Ambient goes in a reefer at +18°C (e.g. chocolate). Admin writes the guidance in each category's description. |
| UI label for SCS | "Shared Container (**Dry**)". The word "ambient" is reserved for the temperature regime, not for SCS. |
| UI label for SRS ambient | "+18°C Ambient" inside the temperature picker — same scale as Frozen and Chilled. |
| Schema migration needed? | No. `containers.temperature` and `pallet_allocations.temperature` are already nullable; existing SCS rows with `temperature: "ambient"` are harmless and back-compat (they just won't be displayed as "Dry" until updated). New rows go in cleanly. |
| Existing SCS categories with `allowedTemperatures: ["ambient"]` | Left as-is in production data. The UI hides the temperature section entirely for SCS so the array is unread. New seeds and saves write `[]`. |

---

## What was built

### Schema & validation
- [x] `containers.temperature` and `pallet_allocations.temperature` confirmed nullable — no migration.
- [x] `POST /api/admin/product-categories` — SCS coerces `allowedTemperatures` to `[]` server-side; SRS requires ≥ 1 valid temp; `"ambient"` is now allowed for SRS.
- [x] `PATCH /api/admin/product-categories/[id]` — same rules; PATCH for an SCS row force-sets `[]` regardless of what the client sent.

### Seed
- [x] `POST /api/admin/product-categories/seed` — the 3 SCS rows (Hunting Trophies / Wine & Spirits / Other Dry Mixed) now seed with `allowedTemperatures: []`.
- [x] Added a new SRS demo: **"Confectionery & Chocolate"** (`cat-confectionery`) with `allowedTemperatures: ["ambient"]` so the new SRS+ambient combination is visible from day one.

### Admin — Categories manager ([components/admin/categories-manager.tsx](components/admin/categories-manager.tsx))
- [x] Service-type button labels: "Shared Reefer (frozen/chilled)" → **"Shared Reefer (frozen / chilled / ambient)"**, and "Shared Container (ambient)" → **"Shared Container (Dry)"**.
- [x] When SCS is picked the entire "Allowed Temperatures" section is replaced with a "Dry container — no temperature regime" callout.
- [x] When SRS is picked all three temperatures are selectable (no more disabled ambient).
- [x] Save validation: SRS still needs ≥ 1 temp; SCS skipped entirely.
- [x] Detail view spec block: shows a "Dry" pill for SCS instead of an empty allowed-temps section.
- [x] List-row "Allowed Temps" column: shows a "dry" badge for SCS rows.

### Admin — Fleet scheduler ([components/admin/fleet-scheduler.tsx](components/admin/fleet-scheduler.tsx))
- [x] Step 4 (Temperature) shows a "Dry — no temperature regime" callout when the selected container type is DRY, otherwise the 3-button grid (frozen / chilled / ambient).
- [x] `containerTypeTemps` for DRY → `[]` (was `["ambient"]`); for REEFER → `["frozen", "chilled", "ambient"]` (was `["frozen", "chilled"]`).
- [x] Save validation: temperature requirement is skipped for DRY.
- [x] POST/PUT body sends `temperature: null` for DRY containers.
- [x] Container row badge: shows a "Dry" badge for rows where `temperature` is null.

### Admin — Bookings grid ([components/admin/admin-bookings-grid.tsx](components/admin/admin-bookings-grid.tsx))
- [x] Temperature cells now render four cases instead of three: Frozen / Chilled / Ambient / Dry — null shows "Dry" with a slate colour; previously rendered as a dash.
- [x] Client-dialog detail panel: same — adds Ambient (+18°C) case and the Dry fallback.

### Booking wizard — step 2 ([components/booking/step-2-cargo.tsx](components/booking/step-2-cargo.tsx))
- [x] Picking SCS sets `formData.temperature = null` (was `"ambient"`).
- [x] Route / destination / product change handlers preserve `null` for SCS instead of clobbering to `""`.
- [x] `isInitialComplete` no longer requires a temperature for SCS.
- [x] Locked-pill copy: "Dry · no temperature · Locked · SCS" (was "Dry · Locked · SCS").

### Booking POST ([app/api/bookings/route.ts](app/api/bookings/route.ts))
- [x] On insert: `temperature` is forced to `null` when `salesRateTypeId === "scs"`, regardless of what the client sent. Stops stale wizard state from leaking an ambient string into a dry-container allocation.

### Types
- [x] `BookingFormData.temperature` widened from `string` to `string | null` so the SCS no-temp state is representable. `null` is the canonical sentinel; `""` still means "SRS user hasn't picked yet".

---

## Files touched

| File | Why |
|---|---|
| `lib/db/schema/...` | No changes — already nullable |
| `app/api/admin/product-categories/route.ts` | POST validation |
| `app/api/admin/product-categories/[id]/route.ts` | PATCH validation |
| `app/api/admin/product-categories/seed/route.ts` | SCS seeds → `[]`; new Confectionery seed |
| `app/api/bookings/route.ts` | Force `temperature: null` on SCS allocations |
| `components/admin/categories-manager.tsx` | Form behaviour, labels, detail/list display |
| `components/admin/fleet-scheduler.tsx` | Hide temp section for DRY; allow ambient for REEFER |
| `components/admin/admin-bookings-grid.tsx` | Render "Dry" + "+18°C Ambient" cases |
| `components/booking/step-2-cargo.tsx` | SCS no-temp flow + null sentinel |
| `types/index.ts` | `BookingFormData.temperature` accepts null |

---

## Manual steps for you

1. Run the seed if you want the new Confectionery category to appear:
   open `/admin/categories` and click the Seed button. The 3 existing SCS rows are skipped (they're already in the DB); the new Confectionery row is added.
2. Optional cleanup of pre-existing data: any old SCS containers with `temperature = "ambient"` will keep working. If you'd like them to read as "Dry" everywhere, set their temperature to NULL — single SQL update on those rows. Not needed for forward-going behaviour.

---

## Reality check / deferred items

- **Existing pre-change SCS allocations** keep their `temperature: "ambient"` value. They render correctly in the admin grid (still shows +18°C Ambient with amber), but the conceptually-correct value is null/Dry. Migration is a one-off `UPDATE pallet_allocations SET temperature = NULL WHERE ...` — leave it unless / until the discrepancy bothers anyone.
- **Public-site copy** ([components/landing/](components/landing/)) doesn't yet reflect the new SRS-can-be-ambient story. No-op until you want to talk about chocolate / confectionery clients on the site.
- **Rate tables** under `lib/mock-data/` and the finance pages still use the legacy SRS=reefer / SCS=ambient assumption when slotting rates. The booking flow doesn't break because the rate-type-id is still the same, but new SRS-ambient rate lines may need an explicit cost-table entry depending on how your sales team prices it. Out of scope here.

---

## Open questions

- [ ] Should there be a soft-warning at signup time if an admin marks an SCS category with `required: true` for a phytosanitary doc that only makes sense for chilled cargo? Cross-validation of doc requirements against the container regime is a future affordance.
- [ ] Does a single SRS reefer ever run *mixed* regimes within one sailing (some pallets frozen, some chilled, some ambient), or is each container always one regime? The current model assumes one regime per container; revisit if multi-regime sharing ever becomes a real ask.
