# Phase G - Display Surfaces (Client Side)

**Status**: ✅ DONE
**Date completed**: 2026-05-14
**Tracker**: [CBM_CARGO_TYPE.md](../../CBM_CARGO_TYPE.md)

## Goal

Every place on the client dashboard that previously said *"N pallets"* now branches on `cargoType`:
- PALLET allocation → `{palletCount}` (unchanged)
- CUBE allocation → `{cbmVolume.toFixed(2)} m³`

This is the read-side counterpart to Phase F (admin) - same polymorphic display, but on the screens the client logs in to look at every day. Without this, a client who booked Cube would still see "N pallets" everywhere and the new mode would feel half-finished.

## What changed (UX)

### Recent Shipments table (dashboard home)
- "Pallets" column → renamed "Volume".
- Cells render `{palletCount}` for PALLET, `{X.XX} m³` for CUBE.

### My Bookings widget (dashboard home)
- The little "N pallets" line under each ETD now branches: `X.XX m³` for CUBE bookings.

### Bookings list page (`/dashboard/bookings`)
- Per-row volume cell shows either `{palletCount} Pallets` or `{X.XX} m³` based on `booking.cargoType`.

### Booking detail dialog
- Cargo Details panel: "Pallets" label flips to "Volume" for CUBE; value renders as `X.XX m³`.

### Invoice view dialog
- Route header chip shows `X.XX m³` instead of `N Pallets` for CUBE invoices.
- Line-item table:
  - Column header "Pallets" → "Qty (m³)" for CUBE
  - Column header "Per Pallet" → "Per m³" for CUBE
  - Per-unit divisor uses `cbmVolume` instead of `palletCount` for CUBE
  - Each row's quantity cell shows the m³ value with the cargoType-aware label
- Maths reconciles either way: the per-unit column × the quantity column = the amount column, regardless of cargo type.

## What changed (data flow)

The display layer can only branch if the API supplies `cargoType` + `cbmVolume`. Three endpoints needed extending:

```
[GET /api/bookings]           → adds cargoType + cbmVolume to each row
[GET /api/dashboard/overview] → adds cargoType + cbmVolume to upcomingBookings
[GET /api/invoices]           → admin select clause includes cargoType + cbmVolume
                                 (client select clause didn't need touching - invoice
                                 IDs route into the same admin payload, which now
                                 carries both fields)
```

The schema already stored both fields from Phase A. No new DB columns or migration.

## Files touched

### APIs
- `app/api/dashboard/overview/route.ts` - `upcomingBookings.map()` now copies `cargoType` and `cbmVolume` from the allocation row.
- `app/api/bookings/route.ts` - booking payload includes `cargoType` and `cbmVolume`.
- `app/api/invoices/route.ts` - admin GET select adds `cargoType: invoices.cargoType` and `cbmVolume: invoices.cbmVolume` (the column already exists from Phase A's invoices schema change).

### Types
- `types/index.ts` - `ClientBooking` and `Invoice` interfaces gain optional `cargoType?: "PALLET" | "CUBE" | null` and `cbmVolume?: string | null`.
- `components/dashboard/overview/overview-grid.tsx` - `DashboardOverview.upcomingBookings[]` inline type gains the two optional fields.

### Components
- `components/dashboard/overview/recent-shipments.tsx` - `volumeLabel = isCube ? "X.XX m³" : String(palletCount)`; column header renamed.
- `components/dashboard/overview/my-bookings-widget.tsx` - per-row volume line branches on `b.cargoType === "CUBE"`.
- `app/dashboard/bookings/page.tsx` - pallet cell renders m³ for CUBE.
- `components/booking/booking-detail-dialog.tsx` - Cargo Details "Pallets" panel branches.
- `components/finance/invoice-view-dialog.tsx` - `isCube`, `quantity`, `quantityLabel`, `unitHeader`, `perUnitHeader`, `originPerUnit / oceanPerUnit / destPerUnit` derived once and used across the line-item table and route header.

## Why not also touch the resubmit dialog

`components/booking/resubmit-booking-dialog.tsx` is a PALLET-only flow - Cube bookings don't have an editable `palletCount` (their volume comes from the snapshotted calculation). When/if Cube resubmissions become a thing they'll need their own flow (re-pick a calculation), not a polymorphic shim on the existing form. Out of scope for Phase G.

## Why the documents vault didn't need updating

The vault list shows `bookingRef, route, vessel, ETD, ETA, doc count` - no volume column at all. Pallet vs Cube isn't visible there, so no branching needed.

## Verification

- `npx tsc --noEmit` → exit 0.
- The optional `?` on `cargoType` / `cbmVolume` was deliberate: existing PALLET rows that pre-date the migration may not have the field hydrated in every API path yet (mock data, edge case clients), and the display layer falls back to PALLET behaviour when both fields are missing - i.e., a row without `cargoType` is treated as PALLET, which is the correct legacy behaviour.

## Out of scope for Phase G

- Polymorphic admin invoice line items: admin views invoices through the same `<InvoiceViewDialog>` component used here, so this work covers both surfaces.
- Cube booking PDF receipts: the existing `html2canvas`-driven PDF in the invoice dialog renders the same updated DOM, so it inherits the m³ display for free. No separate PDF template needed.
- Resubmit-booking flow for Cube allocations (see above).

## Next: Phase H - Polish + tracker updates

Final pass: empty-state copy, tooltips around new fields, and updating [CLIENT_DASHBOARD.md](../../CLIENT_DASHBOARD.md) / [SCS_SRS_RULES.md](../../SCS_SRS_RULES.md) / [SEO_PLAYBOOK.md](../../SEO_PLAYBOOK.md) to reference the new Cube mode where they currently describe pallet-only behaviour.
