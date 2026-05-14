# Phase H — Polish + Doc Updates

**Status**: ✅ DONE
**Date completed**: 2026-05-14
**Tracker**: [CBM_CARGO_TYPE.md](../../CBM_CARGO_TYPE.md)

## Goal

Close out the CBM rollout. The implementation phases (A–G) shipped the
schema, the calculator, the tools hub, the booking integration, admin
rate cards, fleet scheduler updates, and the polymorphic client display.
Phase H is the *non-code* tail: cross-doc updates so future readers of
the related docs find Cube where they expect it, plus a final audit of
the empty-state copy that lives in user-facing surfaces.

## What changed

### `SCS_SRS_RULES.md`
A new "Cargo type (Pallet vs Cube)" subsection sits directly under the
existing temperature-regime model. It states:
- SRS is always Pallet (reefer cargo is always palletised).
- SCS can be Pallet OR Cube; the choice is locked at creation on the
  container, the rate card, and the booking — same lock pattern as
  `salesRateTypeId`.
- The booking wizard only asks the Pallet/Cube question when SCS *and*
  the chosen route has both modes open.

### `CLIENT_DASHBOARD.md`
A new "Phase 3 — Tools section + Cube booking path" section was added
alongside the existing Phase 1 (overview) and Phase 2 (weather) sections.
It documents:
- The new `/dashboard/tools` hub and CBM Calculator surface (with the
  list of Tier 1 features that shipped).
- The booking wizard's Pallet/Cube branch.
- The polymorphic display rollout (Recent Shipments / My Bookings /
  bookings list / booking detail dialog / invoice view dialog).

### `SEO_PLAYBOOK.md`
A new §7b "Future SEO target — public CBM Calculator landing" was added
before §8. It captures:
- Target queries: `cbm calculator south africa`, `shared container cbm`,
  `lcl cbm calculator`, `cargo volume calculator south africa`,
  `chargeable weight calculator sea freight`,
  `cube vs pallet container loading`.
- Why a public version is worth doing (the differentiator — live carrier
  rates + actual containers — is currently hidden behind sign-in).
- Scope when we get to it (new public route at `/tools/cbm-calculator`,
  localStorage save, sign-in CTAs, FAQPage JSON-LD, sitemap entry).
- Out of scope (bulk paste / CSV upload / share-link / saved library).

This is **flagged for later**, not part of any current execution.

### Empty-state / tooltip audit
Nothing new shipped — the audit confirmed earlier phases already covered
the bases:

- **Calculator first-time empty state** ([app/dashboard/tools/cbm-calculator/page.tsx](../../app/dashboard/tools/cbm-calculator/page.tsx)) — Sparkles icon, "No saved calculations yet", helper copy ("Measure your cargo once, reuse it everywhere"), and a "Create your first calculation" primary CTA. Shipped in Phase C.1.
- **Cube calc picker in the booking wizard** ([components/booking/cube-calc-picker.tsx](../../components/booking/cube-calc-picker.tsx)) — empty state shows "Create your first calculation" with `target="_blank"` so wizard state survives. Shipped in Phase D.
- **Booking wizard cargo-type chooser** ([components/booking/step-2-cargo.tsx](../../components/booking/step-2-cargo.tsx)) — each tile already carries descriptive copy ("Set per-pallet quantity (standard SCS)" vs "Cargo measured in m³ (loose cartons, drums, mixed sizes)"). For CUBE-selected state there's also an inline "Cube bookings use a saved CBM calculation. Create one under Tools → CBM Calculator" hint with an external-tab link.
- **Admin fleet scheduler Cargo Type step** ([components/admin/fleet-scheduler.tsx](../../components/admin/fleet-scheduler.tsx)) — small helper "Pallet: per-pallet counting. Cube: m³-based booking with a CBM calculator." Sub-text flips to "Cargo type is locked after creation." in edit mode.

## What is explicitly NOT done

- **Public marketing CBM calculator landing page**. Filed in `SEO_PLAYBOOK.md` §7b. Separate phase whenever it gets prioritised.
- **Migration of pre-existing PALLET bookings to CUBE**. Forward-only by decision in the tracker.
- **A dedicated Pallet/Cube filter chip** on `admin-bookings-grid`. The purple m³ chip on each row + the existing SRS/SCS filter is enough (see Phase F doc for the trade-off).
- **A "view source calculation" link from a Cube allocation in the admin review modal**. The aggregate volume is what an admin needs at approval time; itemised drill-down can land later if it actually gets asked for.
- **3D loading playback** ("Play loading" button on the calculator's 3D viz) — was a Tier 2 nice-to-have. The static 3D viz shipped; the playback animation slipped to a follow-up.

## Verification

- All four files (`CBM_CARGO_TYPE.md`, `SCS_SRS_RULES.md`, `CLIENT_DASHBOARD.md`, `SEO_PLAYBOOK.md`) are coherent with the shipped code.
- No code changes in this phase, so no `tsc --noEmit` run needed beyond what Phase G already verified.

## The CBM rollout is complete

Phases A–H all marked ✅ in [CBM_CARGO_TYPE.md](../../CBM_CARGO_TYPE.md).
A client can now: open the dashboard → use the CBM Calculator under
Tools → save a calculation → use it to book a Cube container on the SRS
network → see the booking, the cost breakdown, the invoice, and the
admin's view of it all render in m³ instead of pallets, end-to-end.
