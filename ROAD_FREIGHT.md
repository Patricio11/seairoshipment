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

## Phase C — Client: Road Freight booking flow

**Goal**: A client books 1–28 pallets onto a truck end-to-end.

- [ ] "New Booking" entry points → **choice screen/tabs**: Sea Freight (existing wizard, unchanged) | Road Freight (new)
- [ ] Road wizard step 1 — route corridor select → collection address (text + optional maps link) → delivery address (same) → optional **additional delivery point**
- [ ] Road wizard step 2 — product (from truck's category), temperature (road labels), **Select your truck** (open ROAD containers on that route), pallet count 1–28 vs remaining capacity, nett weight, pallet dimensions, **overhang YES/NO**
- [ ] Road wizard step 3 — **packing list upload only** (reuses doc upload machinery)
- [ ] Road wizard step 4 — cost breakdown (3 lines) + 60/40 split + PO number + road T&Cs checkbox + GIT insurance link → submit
- [ ] NEW `/api/rates/road-quote` — resolves the customer's rate (fallback to default), returns the 3 lines + totals
- [ ] `/api/bookings` accepts road bookings (delivery addresses, dims, overhang; no consignee); invoice split 60/40 for ROAD
- [ ] Client bookings list + booking detail render road bookings correctly (truck name, route, addresses, no vessel/voyage noise)

**Done when**: end-to-end road booking → admin sees it in the bookings grid → approve → 60% deposit invoice generated.

## Phase D — Docs & polish

- [ ] `POD` document type — admin uploads after the load; client sees it in booking docs
- [ ] Goods in Transit insurance — viewable document link on the road T&Cs step (admin-updatable)
- [ ] Road terms & conditions content
- [ ] Admin bookings grid — addresses, overhang chip, file number surfaced on road rows
- [ ] Tracking page — road bookings show a sensible "no vessel tracking" state (transporter tracking is deferred)

---

## Phase E — Integrations console

**Goal**: `/admin/integrations` — cards grid (category label, Configured chip, enable toggle,
Configure →) exactly like the Philasa reference. Per provider: credentials form (blank secret
keeps the stored one) → **Test connection** → **Enable**.

- [ ] `lib/integrations.ts` — provider catalogue (google_maps / resend / whatsapp) + `getIntegration(key)` server helper (decrypted creds, only when enabled)
- [ ] `/api/admin/integrations` GET (safe statuses) + per-provider POST save / POST test
- [ ] `/admin/integrations` page — cards grid + per-provider config dialogs
- [ ] Google Maps: test = Places API ping; when enabled, road wizard address fields upgrade to autocomplete
- [ ] Resend: test = `GET /domains`; when enabled, `lib/email.ts` routes sends through Resend instead of SMTP
- [ ] WhatsApp Business Cloud API: test = token check against Graph API; when enabled, truck status changes fire WhatsApp messages (booking confirmed → departed → arrived → POD uploaded)

**Done when**: all three providers can be configured, tested, and toggled; features degrade
gracefully when off.

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
