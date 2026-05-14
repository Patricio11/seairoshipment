# Phase C.1 — Tools Hub + Calculator CRUD Foundation

**Status:** ✅ Done — `tsc --noEmit` clean.

Phase C is being split into three sub-phases for reviewability:

- **C.1 (this doc)** — Tools hub page, CBM calculator pages (list / new / view+edit), calculations CRUD API, sidebar nav entry. Functionally complete: a client can create, name, save, edit, duplicate, and archive a CBM calculation.
- **C.2** — Killer-feature panels: cargo-item presets (admin-curated seed + API + picker integration), Live Quote panel (rate cards), Smart-match Containers panel (open SCS Cube containers).
- **C.3** — Share-by-link flow (public read view, audit), PDF download via `@react-pdf/renderer`, bulk paste / CSV upload, 3D loading playback, cut-off urgency banner, keyboard shortcuts. The `/dev/cbm` smoke page gets deleted at the end of C.3.

This sub-phase is the foundation everything else builds on. Save / load / list works end-to-end.

---

## What's in C.1

### Routes (new)
| Route | Purpose |
|---|---|
| `/dashboard/tools` | Hub. Six tools shown: CBM Calculator (live) + five "Coming soon" cards (chargeable weight, loading planner, ETA, HS-code, incoterms). |
| `/dashboard/tools/cbm-calculator` | Card-grid list of the user's saved calculations, with search and an empty state. |
| `/dashboard/tools/cbm-calculator/new` | Create page. Same editor as `/[id]` with no initial data. |
| `/dashboard/tools/cbm-calculator/[id]` | View + edit. Server component pre-loads the calc with ownership check; renders the shared editor. |

### Components (new)
- [`components/cbm/calculation-editor.tsx`](../../components/cbm/calculation-editor.tsx) — shared form. Name input + `<CBMCalculator>` (Phase B) + `<CBM3DViz>` (Phase B) + Notes + actions. Edit-mode actions: **Save changes, Duplicate, Archive**. Create-mode action: **Save calculation** (redirects to the new `[id]` page on success).

### APIs (new)
- `GET /api/dashboard/cbm-calculations` — lists active calcs for the current user, sorted by `updatedAt desc`.
- `POST /api/dashboard/cbm-calculations` — creates a calc. Server **always recomputes totals** from the items array; client-supplied totals are ignored. Drops items with `lengthMm × widthMm × heightMm × quantity === 0` (the auto-seeded blank rows). Returns the inserted row.
- `GET /api/dashboard/cbm-calculations/[id]` — single calc, ownership-checked. 404 on cross-user.
- `PATCH /api/dashboard/cbm-calculations/[id]` — partial update of name / notes / cargoItems / active. Recomputes totals when items change.
- `DELETE /api/dashboard/cbm-calculations/[id]` — **soft delete** (`active = false`). The row stays so booking allocations that reference it via `calculation_id` can still navigate to the source.

### Nav (modified)
- [`components/dashboard/nav-main.tsx`](../../components/dashboard/nav-main.tsx) — new "Tools" entry between Finance and Settings, `Wrench` icon, `/dashboard/tools`.

---

## Server-side trust

Two patterns enforced across the API:

1. **Totals are server-computed.** The `totalCBM`, `totalWeightKg`, and `volumetricWeightKg` columns are always derived from the items array using `lib/cbm.ts` inside the route handler. A client posting `{ totalCBM: 999 }` would have that value ignored.
2. **Ownership is checked on every endpoint.** `userId` is fetched from the session; cross-user access returns 404 (not 403, so an attacker can't tell the difference between "doesn't exist" and "isn't yours").

Items are normalised on every write:
- Dimensions clamped to ≤ 10 m (10,000 mm)
- Weight clamped to ≤ 50 t per unit
- Quantity clamped to ≤ 100,000
- Negative inputs rejected
- Rows with zero volume × quantity dropped (the auto-seeded blank row gets swept here)

---

## What's deliberately deferred to C.2 / C.3

These are referenced in the [main tracker](../../CBM_CARGO_TYPE.md) but not implemented in C.1:

- **Cargo item presets dropdown** — needs the admin-curated seed table populated first (C.2)
- **Live Quote panel** — depends on rate-card filtering by cargo type (Phase E for the data, C.2 for the UI)
- **Smart-match Containers panel** — needs the open-containers query joined to user routes (C.2)
- **Bulk paste / CSV upload** — UI affordance on the calculator (C.3)
- **Share-by-link** — token table + public route + revoke + access counter (C.3)
- **PDF download** — `@react-pdf/renderer` dynamic import (C.3)
- **3D loading playback** — animation on `<CBM3DViz>` (C.3)
- **Cut-off urgency banner** — reuses dashboard cut-off data (C.3)
- **Keyboard shortcuts** — Ctrl+N row, Enter to add (C.3)

---

## Files touched

```
app/api/dashboard/cbm-calculations/route.ts           new
app/api/dashboard/cbm-calculations/[id]/route.ts      new
app/dashboard/tools/page.tsx                          new (hub)
app/dashboard/tools/cbm-calculator/page.tsx           new (list)
app/dashboard/tools/cbm-calculator/new/page.tsx       new
app/dashboard/tools/cbm-calculator/[id]/page.tsx      new
components/cbm/calculation-editor.tsx                 new
components/dashboard/nav-main.tsx                     modified — Tools entry
```

---

## Manual smoke test

After committing this phase:

1. `npm run dev`
2. Log in as a client; the sidebar now shows **Tools**.
3. Click Tools → "CBM Calculator" tile → "+ New calculation".
4. Type a name ("Wine export Q3"). Add a row: 350 × 300 × 230 mm, 16 kg, 24 qty. Save.
5. You're redirected to `/dashboard/tools/cbm-calculator/[id]`. Total Volume ≈ 0.58 m³. The 3D viz shows 24 small blocks in the back of a 40ft.
6. Edit the qty to 96 (full pallet of cases). Save changes. The viz repaints; total CBM jumps to ~2.32 m³.
7. Click Duplicate. You land on the new `/[id]` page with "Wine export Q3 (copy)" prefilled.
8. Go back to `/dashboard/tools/cbm-calculator`. Both calcs appear in the grid, most-recently-updated first.
9. Open the original. Click Archive. Confirm. You're back on the list with one calc remaining.

---

## Next sub-phase

**C.2 — Killer-feature panels.** Three significant additions:

- **Cargo item presets** — schema seed (14 industry items linked to product categories), admin CRUD UI, public picker integration into `<CBMCalculator>`.
- **Live Quote panel** — endpoint `GET /api/dashboard/cbm-calculations/[id]/quote?route=…` returns a CostBreakdown using `lib/rates.ts` with the new `PER_CBM` charge type.
- **Smart-match Containers panel** — endpoint `GET /api/dashboard/cbm-calculations/[id]/matches?route=…` returns open SCS Cube containers that fit, sorted by next-cut-off.
