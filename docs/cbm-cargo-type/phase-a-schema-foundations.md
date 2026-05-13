# Phase A — Schema Foundations (CBM / Cargo Type)

**Status:** ✅ Done — `tsc --noEmit` clean, awaiting `npm run db:push`.

This phase adds the cargo-type discriminator across the existing schema and lays in three new tables for saved CBM calculations, item presets, and share tokens. Nothing visible to users yet; every change is additive and nullable where it can be.

---

## What's in this phase

### 1. Shared `cargo_type` enum

A single Postgres enum (`PALLET | CUBE`) defined once in [containers.ts](../../lib/db/schema/containers.ts) and imported by every table that needs it. Mirrors the pattern the codebase already uses for `temperatureEnum`.

### 2. Existing tables — additive columns

| Table | New columns | Defaults / Nullability |
|---|---|---|
| `containers` | `cargo_type`, `total_cbm`, `max_capacity_cbm` | `cargo_type` defaults to `PALLET` (NOT NULL); `total_cbm` defaults to `0` (NOT NULL); `max_capacity_cbm` nullable (set from `container_types.volumeCBM` at creation) |
| `container_types` | `volume_cbm`, `internal_length_mm`, `internal_width_mm`, `internal_height_mm` | All nullable so existing rows survive; admin fills these in via the seed and edit UIs |
| `pallet_allocations` | `cargo_type`, `cbm_volume`, `volumetric_weight_kg`, `cargo_items` (JSONB), `calculation_id` | `cargo_type` defaults to `PALLET` (NOT NULL); the four Cube fields are nullable — only Cube allocations populate them |
| `rate_tables.origin_charges` | `cargo_type` | Defaults to `PALLET` (NOT NULL) |
| `rate_tables.ocean_freight_rates` | `cargo_type` | Defaults to `PALLET` (NOT NULL) |
| `rate_tables.destination_charges` | `cargo_type` | Defaults to `PALLET` (NOT NULL) |
| `rate_tables.charge_type` enum | New value: `PER_CBM` | Only valid on Cube rate cards |
| `invoices` | `cargo_type`, `cbm_volume` | `cargo_type` defaults to `PALLET` (NOT NULL); `cbm_volume` nullable for Pallet rows |

**Why the NOT NULL defaults?** They give us automatic back-fill on existing rows during `db:push` without writing a separate migration script. New SCS-Cube containers explicitly set `cargo_type = 'CUBE'` at creation.

### 3. New tables

#### [`cargo_calculations`](../../lib/db/schema/cargo-calculations.ts)
User-saved CBM calculations. Drives the Tools section.
- `id, userId (FK), name, cargoType (CUBE default — open for future calc kinds), cargoItems (JSONB), totalCBM, volumetricWeightKg, totalWeightKg, notes, active, createdAt, updatedAt`
- Indexes on `userId` and `active` (the two most common query paths).
- Server recomputes totals on every save from the items themselves — client-supplied totals are not trusted.

#### [`cargo_item_presets`](../../lib/db/schema/cargo-item-presets.ts)
The preset library shown beside the "Add row" button in the calculator.
- `id, name, categoryId (FK to product_categories, nullable), lengthMm, widthMm, heightMm, weightKg, isAdmin, userId (nullable), active, timestamps`
- Admin-curated rows: `isAdmin=true, userId=null` — seeded for each category (Wine cases under Wine & Spirits, etc.).
- User-saved rows: `isAdmin=false, userId=<id>` — items the client keeps for reuse.
- Indexed on `categoryId`, `userId`, `active`.

#### [`cargo_calculation_shares`](../../lib/db/schema/cargo-calculation-shares.ts)
Token-gated public read access to a saved calc.
- `token (PK, long random), calculationId (FK), expiresAt (nullable), revokedAt (nullable), accessCount, lastAccessedAt, createdAt`
- The token is the URL slug (`/share/cbm/[token]`). Long random strings — not guessable.
- Access checks: reject if `revokedAt IS NOT NULL` or `expiresAt < now()`.

### 4. Snapshot semantics — the key idea

A Cube booking copies the calculation's items into `pallet_allocations.cargo_items` **at booking time**. The allocation also stores `calculation_id` as a soft reference (plain text column, not a strict FK — handled at the API layer to avoid a circular import between the two schema files). Editing or deleting the source calculation later **does not** mutate already-booked allocations.

This is why `cargo_items` lives on both the calculation row and the allocation row — they look identical but serve different purposes:
- **Calculation**: the editable working document (the user can iterate on dimensions, save new versions).
- **Allocation**: the frozen record of what was booked.

---

## Files touched

```
lib/db/schema/containers.ts                      modified — added cargoTypeEnum + 3 columns
lib/db/schema/container-types.ts                 modified — added volumeCBM + internal dimensions
lib/db/schema/pallet-allocations.ts              modified — added cargoType + 4 Cube fields + CargoItem type
lib/db/schema/rate-tables.ts                     modified — added cargoType to all 3 header tables; PER_CBM enum
lib/db/schema/invoices.ts                        modified — added cargoType + cbmVolume
lib/db/schema/cargo-calculations.ts              new
lib/db/schema/cargo-item-presets.ts              new
lib/db/schema/cargo-calculation-shares.ts        new
lib/db/schema/index.ts                           modified — export 3 new schemas
```

---

## Verification

```bash
npx tsc --noEmit
# ✅ clean
```

---

## Manual step (you run this)

```bash
npm run db:push
```

This applies the new columns and tables to your Postgres. The `NOT NULL DEFAULT 'PALLET'` columns are added safely: Postgres uses the default for existing rows automatically. The three new tables are empty; they'll be populated as users save calculations, presets, and shares.

After `db:push` succeeds:
- Existing containers continue to work exactly as before — they're all `cargoType = PALLET` now.
- Existing allocations / rate cards / invoices: same — back-filled to PALLET.
- Existing `container_types` rows have `volume_cbm = NULL` until you set them. The admin Container Types page will let you fill these in during Phase F (or you can run the one-line UPDATE manually: `UPDATE container_types SET volume_cbm = 33.2 WHERE size = '20ft'` and so on).

---

## What this phase does NOT do

- No UI exposes any of the new fields yet.
- No API knows about cargoType yet.
- No back-fill of `volumeCBM` on existing container_types rows — that happens in Phase F when the admin edits them, or via the seed in Phase E.
- No data migration for existing SCS containers to switch to Cube — they stay Pallet by default; admin creates new Cube containers explicitly in Phase F.

---

## Next phase

**Phase B — CBM helpers + calculator UI.** Build the pure unit-conversion module (`lib/cbm.ts`), the controlled `<CBMCalculator>` component, and the `<CBM3DViz>` scene. No backend wiring — Phase C does that.
