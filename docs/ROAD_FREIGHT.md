# Refrigerated Road Freight — Progress Tracker

## Goal

Add a **Road Freight consolidation service** alongside the existing Sea Freight platform, per the plan in
[Refrigerated Road Frieght consolidtaions Plan.pdf](Refrigerated%20Road%20Frieght%20consolidtaions%20Plan.pdf).

Clients choose **Sea Freight** or **Road Freight** when starting a booking. Sea keeps working exactly as
today. Road gets its own booking flow ("Refrigerated Road Freight booking") on the same machinery:
trucks are fleet entries, bookings are allocations, invoicing/documents/notifications all reuse the
existing pipeline.

---

## Architecture — one fleet, two modes

The core decision: **a truck is a container row with `transportMode = 'ROAD'`.**

```
containers table                      pallet_allocations             invoices / documents /
┌──────────────────────────┐          ┌───────────────────────┐      notifications / admin grids
│ transportMode: SEA|ROAD  │◄─────────│ (unchanged FK)        │      ─ all reuse the existing
│ SEA: vessel, sailing,    │          │ + deliveryAddresses   │        pipeline with zero changes
│      20/40ft, ports      │          │ + palletDimensions    │        to their schemas
│ ROAD: truck name, road   │          │ + overhang            │
│       route, 28 pallets, │          └───────────────────────┘
│       fileNumber         │
└──────────────────────────┘          road_rates (NEW)
                                      ┌────────────────────────────┐
                                      │ per-customer (nullable     │
                                      │ userId → default fallback) │
                                      │ route + 3 fee lines        │
                                      └────────────────────────────┘
```

Why this wins:
- Allocations, invoices, documents, capacity checks, admin bookings grid, bulk delete, notifications —
  **all keep working without touching their code**.
- The fleet page, booking wizard, and rate management branch on `transportMode` where the flows differ.
- Sea Freight behaviour is untouched — `transportMode` defaults to `SEA` on every existing row.

---

## Decisions — locked in

| Question | Answer |
|---|---|
| Truck modelling | Container row with `transportMode = 'ROAD'`. No separate trucks table. |
| Road routes | Fixed corridor list: `CPT-JNB`, `JNB-CPT`, `JNB-DBN`, `DBN-JNB`, `CPT-DBN`, `DBN-CPT`. Stored in the existing `route` text column. |
| Truck capacity | `maxCapacity` default **28** for ROAD (vs 20 sea). Bookable from 1 pallet. |
| Temperature | **Reuse the existing 4-value enum** — road just relabels: `frozen` = -20/-18 Frozen · `cool` = 0–5 Partly Frozen · `chilled` = 5–7 Chilled · `ambient` = 10–18 Ambient. No schema change. |
| "Vessel" on a truck | The `vessel` column holds the **transporter / truck name**; `etd`/`eta` = departure/arrival date. No sailing link for ROAD. |
| File number | New `fileNumber` column on containers (e.g. `SRS234`) — admin groups multiple customers loading the same truck for finance. |
| Address entry | **Simple text + optional Google Maps pin link** per address. No Places API in v1 (needs key + billing); upgrade path is UI-only. |
| Extra drops | `deliveryAddresses` jsonb array on the allocation (same shape as `collectionAddresses`). More than 1 entry = additional-drop fee applies. |
| Pallet dimensions | jsonb `palletDimensions` `{ lengthCm, widthCm, heightCm }` on the allocation — captured for packing-list verification, not priced. |
| Overhang | `overhang` boolean on the allocation. YES → overhang fee per pallet pulls into the cost sheet. |
| Pricing model | **3 lines**: transport cost per pallet × pallets + additional drop fee (if >1 delivery point) + overhang fee (if yes). |
| Per-customer rates | `road_rates` table with nullable `userId`. Customer-specific row wins; `userId IS NULL` row is the default fallback. Loaded per route. |
| Deposit | **60% upfront / 40% balance** for ROAD (sea keeps its finance-settings split). |
| Consignee step | **Removed** for road — collection + delivery addresses carry the info. |
| Documents at booking | **Packing list only.** POD (proof of delivery) uploaded by admin after the load. |
| T&Cs | Road-specific terms text + viewable **Goods in Transit insurance** document link. |
| External services | NEW **admin Integrations page** (`/admin/integrations`) mirroring the Philasa build: per-provider configure (encrypted credentials) → test connection → enable. v1 providers: **Google Maps** (Places autocomplete + pins), **Resend** (email), **WhatsApp Business** (truck progress messages). Features stay dormant until the admin switches them on. |
| Credentials at rest | AES-256-GCM encrypted JSON blob per provider (`lib/crypto.ts`, key from `SRS_FIELD_KEY` env — base64, 32 bytes). Never plain env vars, never sent to the client. |
| Address entry | Text + maps-link always works; when the `google_maps` integration is enabled the road wizard upgrades to Places autocomplete. |
| WhatsApp truck updates | Built against the `whatsapp` integration — dormant until configured + enabled. |
| Truck GPS pull-through | **Deferred** — needs an agreed data feed from the trucking company. |
| Xero integration | **Deferred** — separate initiative. The `fileNumber` grouping is the finance hook it would build on. |

---

## Phases

```
A · Schema foundation — transportMode, fileNumber, road allocation fields, road_rates, integrations
B · Admin — trucks in the fleet (create/edit/list) + road rate management (per customer)
C · Client — booking entry choice + Road Freight wizard + road quote API
D · Docs & polish — packing list/POD types, GIT insurance link, road T&Cs, admin grid touches
E · Integrations console — /admin/integrations (Google Maps · Resend · WhatsApp Business):
    configure encrypted credentials → test connection → enable; road wizard + messaging
    light up their upgrades when the relevant provider is switched on
```

A → B → C is the critical path. D closes the loop. E is independent after A and can land in parallel.

---

## Phase A — Schema foundation

**Goal**: All road columns/tables exist; sea rows are untouched (`transportMode` defaults to SEA).

- [ ] `lib/db/schema/containers.ts` — `transportModeEnum('SEA'|'ROAD')`, `transportMode` column (default `SEA`), `fileNumber` text
- [ ] `lib/db/schema/pallet-allocations.ts` — `deliveryAddresses` jsonb, `palletDimensions` jsonb, `overhang` boolean (default false)
- [ ] `lib/db/schema/road-rates.ts` — NEW: `id`, `userId` (nullable FK → user, null = default rate), `route`, `transportCostPerPallet`, `additionalDropFee`, `overhangFeePerPallet`, `active`, timestamps. Unique on `(userId, route)`.
- [ ] `lib/db/schema/integrations.ts` — NEW: `key` PK, `credentialsEnc` (AES-256-GCM blob), `enabled`, `updatedAt`
- [ ] `lib/crypto.ts` — NEW: `encryptField`/`decryptField` (AES-256-GCM, `SRS_FIELD_KEY` env, dev fallback key)
- [ ] `lib/road.ts` — NEW: road corridor list, road temperature labels, shared helpers
- [ ] Export from schema index; `npm run db:push` (user runs)

**Done when**: db:push applies cleanly; existing sea flows behave identically.

## Phase B — Admin: trucks + road rates ✅

**Goal**: Admin can create trucks in the fleet and load per-customer road rates.

- [x] Fleet page ([components/admin/fleet-scheduler.tsx](components/admin/fleet-scheduler.tsx)) — All/Sea/Road mode filter pills; create dialog gains a **Sea Freight Container / Road Freight Truck** toggle (locked after creation) that flips the form: road corridor dropdown, transporter/truck name, file number, departure + arrival dates, pallet spaces (default 28), SRS category + temperature with road labels
- [x] Truck cards — Truck icon (emerald), corridor label ("Cape Town → Johannesburg"), Road badge, file number chip, "Departs/Arrives" instead of ETD/ETA, MetaShip actions hidden for ROAD
- [x] `/api/admin/containers` POST/PUT — ROAD branch: corridor + truck name + temperature validation against the SRS category; capacity guard on edit (can't drop below booked pallets); sea branch untouched
- [x] NEW `/admin/finance/road-rates` + sidebar link — search, per-row edit/delete, active toggle, bulk-delete bar; create dialog with customer picker ("Default — all customers" + approved clients), corridor select, the 3 fee lines (NumericInput)
- [x] NEW `/api/admin/road-rates` GET/POST + `[id]` PUT/DELETE + bulk-delete. POST guards duplicate (customer, route) pairs incl. the NULL-default case

**Done**: a truck with file number SRS234 can be created on CPT-JNB, default + per-customer rates load, and the sea fleet view is unchanged.

## Phase C — Client: Road Freight booking flow ✅

**Goal**: A client books 1–28 pallets onto a truck end-to-end.

- [x] "New Booking" → **choice screen**: Sea Freight (existing wizard, unchanged) | Road Freight (new). Prefill deep-links (e.g. "book this container") skip straight to sea.
- [x] [components/booking/road-booking-wizard.tsx](components/booking/road-booking-wizard.tsx) — 4-step wizard:
  1. Route corridor → collection address (text + optional maps-pin link) → delivery address (same) → optional **additional delivery point** (amber card, warns about the drop fee)
  2. Product (union of truck categories on the corridor) → temperature (road band labels) → **Select your truck** cards (name, departs/arrives, spaces left) → pallet count (1 → remaining) → nett weight → pallet dimensions L×W×H cm → **overhang YES/NO** (warns about the fee)
  3. **Packing list upload only** (required, ≤10MB) — uploaded via the existing server-side upload route after the booking POST
  4. Booking summary + live 3-line cost sheet from `/api/road/quote` + 60/40 split + PO number + road T&Cs checkbox
- [x] NEW [lib/road-pricing.ts](lib/road-pricing.ts) — `resolveRoadRate` (customer card → default fallback) + `calculateRoadQuote` (3 lines, 60/40)
- [x] NEW `/api/road/options` — open trucks on the corridor (capacity nets off pending requests) + products from their categories
- [x] NEW `/api/road/quote` — session-scoped live quote
- [x] `/api/bookings` POST — ROAD branch: validates truck/category/capacity/dims/addresses, creates the allocation (no consignee — addresses carry it) + DEPOSIT (60%) / BALANCE (40%) invoices. Invoice columns map: originCharges=transport, oceanFreight=drop fee, destinationCharges=overhang.
- [x] `/api/bookings` GET returns `transportMode`, `deliveryAddresses`, `palletDimensions`, `overhang`; ClientBooking type extended; bookings list shows a truck icon for road rows
- [x] Approve endpoint: road trucks skip the 15-pallet THRESHOLD_REACHED / MetaShip notification (sea-only concept)

**Done**: end-to-end road booking → admin sees it in the bookings grid → approve → 60% deposit invoice ready.

## Phase D — Docs & polish ✅

- [x] `POD` document type — added to the `document_type` enum + document-type labels + both upload routes + the admin upload dialog ("Proof of Delivery (POD)"). Admin uploads it after the load from the booking's upload dialog; client sees it in the booking docs.
- [x] Goods in Transit insurance — the road T&Cs checkbox links to `/documents/goods-in-transit-insurance.pdf` (drop the PDF in `public/documents/` — manual step)
- [x] Road terms — new §16 "Refrigerated Road Freight Consolidations" in [components/legal/terms-content.tsx](components/legal/terms-content.tsx) (from-1-pallet, dimension verification vs packing list, 3-line pricing, 60% upfront, access/standing time, temperature set-points, POD as prima facie evidence, GIT responsibility). TERMS_VERSION bumped to 2.1.
- [x] Admin review dialog — road requests show delivery points (with "+ drop fee" chip when >1), maps-pin links, pallet dimensions, overhang YES/NO, "Target Truck" heading + file-number chip
- [x] Client booking detail — delivery points, pallet dims, overhang shown on road bookings; bookings list shows the truck icon

---

## Phase E — Integrations console ✅ (wire-ups partially deferred)

**Goal**: `/admin/integrations` — cards grid (category label, Configured chip, enable toggle,
Configure →) exactly like the Philasa reference. Per provider: credentials form (blank secret
keeps the stored one) → **Test connection** → **Enable**.

- [x] [lib/integrations.ts](lib/integrations.ts) — provider catalogue (google_maps / resend / whatsapp with per-provider credential field definitions) + [lib/integrations-server.ts](lib/integrations-server.ts) — `getIntegration` / `getEnabledIntegration` / `getIntegrationStatus` / `saveIntegration` (AES-256-GCM at rest, creds never reach the browser)
- [x] `/api/admin/integrations` GET (safe statuses) + `[key]` POST save (blank secret keeps stored value; enabling requires all fields) + `[key]/test` POST
- [x] `/admin/integrations` page + sidebar link — cards grid with enable toggles (toggling an unconfigured provider opens its config dialog), Configured chip, per-provider config dialog with **Test connection** → **Save**
- [x] Google Maps test — Geocoding API probe (OK / REQUEST_DENIED handling)
- [x] Resend test — `GET /domains`; **wired**: `sendEmail` in [lib/email.ts](lib/email.ts) routes through Resend when configured + enabled, with automatic SMTP fallback on any Resend failure
- [x] WhatsApp Business Cloud API test — Graph API phone-number probe (returns the verified business name + number)
- [ ] *Deferred wire-ups*: road wizard Places autocomplete when google_maps is on; WhatsApp truck-progress messages (booking confirmed → departed → arrived → POD uploaded). Credentials + enable switches are ready; these light up in a follow-up phase.

**Done**: all three providers can be configured, tested, and toggled; email actually routes through Resend when on; everything else stays dormant until wired.

---

## Out of scope (v1)

- **Transporter GPS pull-through** — needs an agreed data feed from the trucking company.
- **Xero integration** — separate initiative; `fileNumber` is the grouping hook it will use.
- **Sea + Road combined bookings** — PDF notes eventual collaboration of the two; v1 keeps them parallel.

---

## Manual steps

- After Phase A lands: `npm run db:push`
- Set `SRS_FIELD_KEY` in production env (base64, 32 bytes — `openssl rand -base64 32`); dev falls back to an ephemeral key
- Phase D: supply the Goods in Transit insurance PDF + road T&Cs wording
- Phase E: supply Google Maps API key / Resend API key / WhatsApp Business credentials when ready — everything stays dormant until entered

---

# AMENDMENTS — client feedback round 1 (Aug 2026)

Source: [Amendments to Road Freight portal .pdf](../Amendments%20to%20Road%20Freight%20portal%20.pdf).
Feedback digested into phases F–L below. Each closes with its own commit(s).

## Decisions from the feedback

| Topic | Decision |
|---|---|
| Cargo mixing | Trucks have **dual-temp units** — no product/category limitation. Product dropdown shows **ALL products**. |
| Truck category | **Removed** from truck create/edit (a truck carries "all food types"). Existing trucks keep whatever category is stored but it no longer restricts anything. |
| Road temperatures | **3 bands only**: Frozen (-18°C) · Chilled (+5–7°C) · Ambient (+15–18°C). All 3 always selectable on the booking regardless of the truck ("cool / partly frozen" retired from road labels; enum value stays for sea). |
| Truck fill visual | Pallet-grid visual (28 spaces) in the road wizard, like the sea freight container visual — fills up as the client picks pallet count. Trucks physically take 30 but 2 are held back for bad packing → capacity stays 28. |
| Rates | Per the Britos example card in the PDF: per-customer rate lines are **pallet-count bands per route** (e.g. 1 / 2–3 / 4–6 / 7–9 / 10–12 / 13–14 / 15+), each band carrying its own **per-pallet price**, **number of drops included** (1–3), and **additional-drop rate** (R850/R750/R550…). Resolver picks the band matching the booked count; drop fee = (delivery points − drops included) × band's drop rate, floored at 0. Flat "Dedicated truck" pricing (14t/30p columns) noted but **deferred** pending confirmation — the booking flow books pallet counts, dedicated trucks are a different product. |
| Payment terms | Per-customer field chosen at vetting/approval (and editable later): **60/40 split on booking** (default, current behaviour) · **30 days from statement** · **7 days from delivery**. Drives invoice generation + due dates and shows on pricing. |
| Road sub-admin roles | Two new roles: **Road Manager** (full access to road freight only: rates, packing lists, confirm loads, invoices, amend/add loads, WhatsApp, PODs) and **Road Operations** (confirm loads + WhatsApp + upload PODs ONLY — no rates, no invoicing, no amendments). |
| Admin-created customers | Admin can create an existing customer's account with a password (pre-verified, approved, payment terms set); the customer can change the password later. |
| Dashboard split | Admin bookings gets a **Containers / Trucks** top-level switch (like the fleet pills). Road-role users see road only. |
| Packing list upload | Reported not working — investigate client wizard + add admin upload at the pending-review stage (Management wants "add packing list"). |
| Truck GPS tracking | Answer to the question: possible once the trucking company names their telematics provider + API access. Deferred until then. |

## Phase F — Cargo & truck simplification + fill visual ✅

- [x] Truck create/edit: category section replaced with a static **"All food types - trucks mix products freely"** note; temperature now **optional** (3 road bands, click again to clear) since trucks run dual-temp compartments
- [x] `/api/admin/containers` ROAD branches: category always null for trucks, temperature optional, no SRS-category/temperature-in-category validation
- [x] `/api/road/options`: returns ALL active products; trucks carry `booked` + `remaining`; no category/temperature coupling
- [x] Road wizard: product dropdown = all products; temperature = always the 3 road bands (booking-level, independent of the truck); truck list unfiltered
- [x] `lib/road.ts`: `ROAD_TEMPS` (frozen/chilled/ambient) + labels per the amendment (-18 / +5–7 / +15–18); "cool / partly frozen" retired from road (enum value remains for sea)
- [x] **Truck fill visual**: trailer-outline 2-row pallet grid in wizard step 2 — grey = booked (incl. pending), emerald = your pallets, dashed = open; updates live with the count; legend + n/28 counter
- [x] Packing-list upload: client-side route verified working; root cause of the report = **no admin upload at the pending-review stage** — the review dialog now embeds the admin upload dialog (with "Proof of Delivery (POD)" + "Packing List" types), refreshing the doc list after upload
- [x] Bookings POST: product-category mismatch check removed for road (any product on any truck)

## Phase G — Tiered rates (pallet bands, per the Britos card) ✅

- [x] `road_rates` band columns: `minPallets` / `maxPallets` (existing rows default 1–28 so pre-amendment cards keep working), `dropsIncluded` (default 1); the additional-drop fee is now **per band**; unique is (userId, route, minPallets) with API-level range-overlap guards on create AND edit
- [x] Rates manager: band lines per (customer, route) — "Pallets from/to" + "Drops included" inputs in the dialog, band + drops columns in the table, sorted route → default-first → customer → band start
- [x] `resolveRoadRate(userId, route, palletCount)` matches the band covering the count (customer lines → default lines); drop fee = max(0, deliveryPoints − dropsIncluded) × band's rate
- [x] Wizard cost sheet: "N delivery points included in this rate" + "Additional drops · n × R x" lines
- [ ] *Deferred pending confirmation*: flat **Dedicated truck** pricing (14t / 30p columns in the example) — different product from pallet-count booking
- [x] `npm run db:push` required (band columns + unique-constraint change)

## Phase H — Payment terms per customer ✅

- [x] `user.paymentTerms` enum: `SPLIT_60_40` (default) · `NET_30_STATEMENT` · `NET_7_DELIVERY` + [lib/payment-terms.ts](../lib/payment-terms.ts) labels
- [x] Review modal: emerald Payment Terms card — shown while approving (terms travel with the approve PATCH) and on APPROVED accounts (select + Save via new `PATCH /api/admin/users/[id]/payment-terms`); vetting GET returns the field
- [x] Road invoice generation branches by terms: 60/40 split (deposit +7d, balance departure −2d) · NET_30 single 100% invoice due +30d · NET_7_DELIVERY single 100% invoice due arrival +7d (fallback +30d when no arrival date)
- [x] `/api/road/quote` returns the customer's terms; wizard cost sheet shows the split lines OR "invoiced in full on your terms" + terms-aware confirmation note
- [x] Sea invoices unchanged (terms apply to road in v1)
- [x] `npm run db:push` required (payment_terms enum + user column)

## Phase I — Road roles (Management / Operations)

- [ ] `role` enum + `road_manager` + `road_ops`
- [ ] Capability helpers (server): road-only access; ops = confirm loads / WhatsApp / PODs only
- [ ] Admin layout + sidebar: road roles see road-only nav (Bookings→Trucks, Road Rates for manager only, Integrations hidden, etc.)
- [ ] API guards: rates + invoices + amendments blocked for ops; everything sea-side blocked for both
- [ ] Admin can create road-role users

## Phase J — Admin-created customer accounts

- [ ] "Create customer" admin action: name, email, company, temp password, payment terms → Better Auth server-side signup, pre-verified + APPROVED
- [ ] Customer can change the password later (wire the real change-password flow in Settings → Security — currently a mock form)

## Phase K — Sea/Road dashboard split

- [ ] Admin bookings grid: Containers | Trucks switcher (like fleet's pills) filtering every tab (containers, requests, cancelled, shipments)
- [ ] Road-role users land on Trucks and cannot switch to Sea

## Phase L — Answers / deferred

- [ ] Truck GPS tracking: needs the transporter's telematics provider + API credentials — question back to the trucking company
- [ ] WhatsApp messaging from the portal: WhatsApp Business integration exists in the console (Phase E); actual send-flows land with the roles that use them (Phases I) or as their own follow-up
