# MetaShip Order Tracking — Progress Tracker

## Goal

Give clients and admins a **live, event-driven view** of where each container is
from the moment MetaShip accepts the order to final delivery. No polling — we
subscribe once and receive webhook pushes for every milestone.

- Auto-subscribe the moment `createMetaShipOrder` succeeds on a container
- Webhook receives EQUIPMENT / TRANSPORT / AIS / hold events
- Container status + position + event history kept in our DB
- Clients get a **merged Bookings + Shipments page** with a creative, real-time
  tracking timeline per allocation
- Admin "Live Shipments" tab becomes real (currently mock)
- Email notifications on key milestones (VESSEL_LOADED, DEPARTURE, ARRIVAL, DELIVERED, exceptions)

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│ 1. Admin creates MetaShip Order on a container                    │
│ 2. On success → auto-subscribe container to MetaShip tracking     │
│    POST /public/v2/tracking/subscribe { containerNo, ... }        │
│ 3. Our DB stores subscriptionId on container                      │
│                                                                    │
│ 4. MetaShip pushes events → POST {NEXT_PUBLIC_APP_URL}/api/       │
│    webhooks/metaship/tracking                                      │
│ 5. Our endpoint verifies signature, upserts tracking_events,       │
│    updates container.status + lastPosition, fires email on         │
│    milestone events                                                │
│                                                                    │
│ 6. Admin GET /api/admin/tracking/[containerId] — full event log   │
│    Client GET /api/bookings/[allocationId]/tracking — scoped view │
│                                                                    │
│ 7. Daily reconcile cron: for every active subscription, GET        │
│    /public/v2/tracking/{containerNo} and backfill any missed       │
│    events (safety net in case webhook drops)                       │
└──────────────────────────────────────────────────────────────────┘
```

---

## MetaShip API (from metaShip_API_order_tracking.html)

- **Subscribe:** `POST /public/v2/tracking/subscribe`
  - Scope: `tracking:write`
  - Body: at least one of `containerNo` / `billOfLadingNo` / `bookingNo`; optional `pol`, `pod`, `finalDestination`, `initialETD`, `initialETA`, `scac`, `customerReference`, `ownerReference`, `registrationNo`, `waypoints`
  - Response: `{ message, subscriptionId }`

- **GET snapshot:** `GET /public/v2/tracking/{containerNo}`
  - Scope: `tracking:read`
  - Response: `{ id, containerNo, bookingNo, billOfLadingNo, scac, status, position (GeoJSON Point), positionLastUpdated, positionType, importHolds{...}, events[] }`
  - Event types pushed via webhook:
    - `EQUIPMENT` — gate in/out, loaded/discharged (DCSA)
    - `TRANSPORT` — vessel/vehicle arrival/departure
    - `AIS` — vessel zone/terminal enter/exit from AIS
  - Event fields: `date`, `description`, `eventType`, `typeCode`, `type` (GATE_OUT, VESSEL_ARRIVAL, etc), `location` (UN/LOCODE), `lat`, `lng`, `modeOfTransport` (TRUCK/VESSEL/RAIL/BARGE), `isActual`, `vesselName`, `vesselIMO`, `voyage`, `registrationNo`, `facilityCode`

- **Webhook URL** — configured on MetaShip side for the organisation (not per-subscription). Must be given to MetaShip as:
  `{NEXT_PUBLIC_APP_URL}/api/webhooks/metaship/tracking`

---

## Decisions

| Question | Answer |
|---|---|
| Primary mechanism | Subscribe once → webhook push; GET used only for reconcile + first-open snapshot |
| Subscribe trigger | Auto: fires right after `createMetaShipOrder` succeeds |
| Webhook path | `POST /api/webhooks/metaship/tracking` under `NEXT_PUBLIC_APP_URL` |
| Signature verification | Require a shared secret (`METASHIP_WEBHOOK_SECRET`) — MetaShip signing scheme TBD; fall back to secret in path token if header not provided |
| Deduplication | Unique index on `(containerId, metashipEventId)` or hash of `(eventDate + typeCode + location)` if no id |
| Container status auto-promotion | On `VESSEL_DEPARTURE` → status SAILING; on final `GATE_OUT` at destination or `DELIVERED` event → DELIVERED |
| Email provider | Existing `lib/email.ts` via nodemailer → **Mailtrap** in dev (SMTP vars in `.env.local`), prod SMTP TBD |
| Email cadence | One per-client per-milestone per-allocation. Not every AIS ping. |
| Client page layout | Merge `/dashboard/shipments` into `/dashboard/bookings`; kill the kanban; creative expandable tracking panel per row |
| Reconcile cadence | Daily cron for active subscriptions; also on-demand via admin "Refresh" button |

---

## Phases

### Phase A — Schema + MetaShip API client ✅ DONE

- [ ] New table `tracking_events`:
  - `id` (PK text, `TRK-<nanoid>`)
  - `containerId` (FK → containers.id)
  - `metashipEventId` (text, nullable — if provided in webhook)
  - `eventDate` (timestamp)
  - `eventType` ("EQUIPMENT" | "TRANSPORT" | "AIS" | ...)
  - `typeCode` (GTOT, ARRI, DEPA, ...)
  - `type` (GATE_OUT, VESSEL_ARRIVAL, VESSEL_DEPARTURE, ...)
  - `description` (text)
  - `location` (UN/LOCODE text)
  - `lat`, `lng` (numeric, nullable)
  - `modeOfTransport` (TRUCK | VESSEL | RAIL | BARGE, nullable)
  - `isActual` (boolean)
  - `vesselName`, `vesselIMO`, `voyage`, `registrationNo`, `facilityCode` (all nullable text)
  - `payload` (jsonb — raw event)
  - `createdAt` (timestamp)
  - Unique composite: `(containerId, metashipEventId)` when id present; soft-dedup on hash otherwise
- [ ] New columns on `containers`:
  - `metashipTrackingSubscriptionId` (text, nullable)
  - `trackingStatus` (enum: NONE | SUBSCRIBED | FAILED | UNSUBSCRIBED)
  - `lastPositionLat`, `lastPositionLng`, `lastPositionType` (VESSEL|AIS|TRUCK), `lastPositionAt`
  - `lastEventType`, `lastEventAt`, `lastEventDescription`
- [ ] `lib/metaship.ts` additions:
  - [ ] `subscribeTracking({ containerNo, billOfLadingNo?, bookingNo?, pol?, pod?, finalDestination?, initialETD?, initialETA?, scac?, customerReference?, ownerReference? })` → `{ subscriptionId, message }`
  - [ ] `getTracking(containerNo)` → typed response with events + position + importHolds
  - [ ] `MetaShipTrackingEvent`, `MetaShipTrackingResponse`, `MetaShipSubscribeResponse` interfaces

### Phase B — Webhook endpoint + Refresh button ✅ DONE

- [x] `POST /api/webhooks/metaship/tracking` ([route.ts](app/api/webhooks/metaship/tracking/route.ts))
  - [x] Verifies `x-metaship-signature` (HMAC-SHA256, accepts `sha256=...` prefix) — timingSafeEqual
  - [x] Flexible envelope parser: supports `{ events: [...] }` or `{ event: {...} }` (single push)
  - [x] Container lookup via `findContainerForWebhook`: subscriptionId → containerNo → bookingNo (matched to `containers.metashipReference`)
  - [x] Per-event dedupe by `metashipEventId` OR hash of (eventDate+typeCode+location)
  - [x] Updates `containers.lastEvent*`, `containers.lastPosition*`, captures first `metashipContainerNo`
  - [x] Auto-promote `containers.status`:
    - VESSEL_DEPARTURE (DEPA, modeOfTransport=VESSEL) → SAILING (only if currently OPEN/THRESHOLD/BOOKED)
    - GATE_OUT (GTOT, TRUCK, isEmpty=false) at destination → DELIVERED
  - [ ] Email notifications wired in Phase F
  - [x] Returns 200 with `{ received, inserted, skipped, statusChanged, newContainerNo }`

- [x] Shared event-sync helper [lib/tracking/sync.ts](lib/tracking/sync.ts) — reused by webhook + refresh endpoint
- [x] `POST /api/admin/tracking/[containerId]/refresh` ([route.ts](app/api/admin/tracking/[containerId]/refresh/route.ts))
  - [x] Calls `getTracking(metashipContainerNo)` and merges events
  - [x] Returns 400 with friendly error when `metashipContainerNo` isn't known yet
- [x] "Refresh Tracking" button added in admin container detail dialog next to "Sync Documents"
- [x] New column: `containers.metashipContainerNo` — populated from first webhook event (so Refresh works thereafter)

### Phase C — Auto-subscribe on MetaShip Order creation ✅ DONE

- [x] In the book route ([app/api/admin/containers/[id]/book/route.ts](app/api/admin/containers/[id]/book/route.ts)) after order succeeds:
  - [x] Calls `subscribeTracking({ bookingNo: systemReference, pol, pod, finalDestination, initialETD, initialETA, customerReference: container.id, ownerReference: orderNo })`
  - [x] Persists `subscriptionId`, `metashipContainerNo` (from subscribe response), sets `trackingStatus = SUBSCRIBED`
  - [x] Seeds events immediately via `getTracking` so the UI has data to show
  - [x] Non-fatal: if subscribe throws, order still succeeds; `trackingStatus = FAILED`, retry button surfaces
- [x] Toast now includes tracking summary: "Order #X | N docs uploaded | Tracking: active (N events)"
- [x] Manual retry endpoint: `POST /api/admin/containers/[id]/subscribe-tracking` ([route.ts](app/api/admin/containers/[id]/subscribe-tracking/route.ts))
- [x] Admin UI in container detail dialog:
  - Shows "Active" / "Failed — retry" / "Not subscribed" badge on the Live Tracking row
  - Swaps button between "Subscribe Tracking" and "Refresh Tracking" based on state

### Phase D — Admin Live Shipments rewrite ✅ DONE

- [x] `GET /api/admin/tracking/[containerId]` — returns container + full event log from our DB
- [x] Filter shown in Live Shipments: containers where `trackingStatus ∈ {SUBSCRIBED, FAILED}`
- [x] Per-card: fetches its own tracking data, refreshes on demand via existing `/refresh` endpoint
- [x] Real milestone timeline ([components/tracking/tracking-timeline.tsx](components/tracking/tracking-timeline.tsx)) derived from events:
  - Booked → Gate In → Loaded → Departed POL → Arrived POD → Delivered
  - Reached nodes glow emerald; current node pulses blue; future nodes show ETD/ETA placeholders
- [x] Removed mock data: `MOCK_BOOKINGS`, `SHIPMENT_MILESTONES`, `filteredMockData`, manual Update Status dropdown
- [x] Latest event description + timestamp shown in card header
- [x] Schematic route visualisation ([components/tracking/tracking-route.tsx](components/tracking/tracking-route.tsx)):
  - POL / POD port markers, gradient progress line, pulsing vessel position in-between
  - Shows latest lat/lng, position type, vessel name
  - SVG only — no map library dependency; real-world map can be a follow-up
- [x] Expandable event log per card (all events with mode-of-transport colouring)
- [ ] Import holds panel — deferred; will wire if MetaShip pushes `importHolds` through the webhook payload

### Phase E — Client tracking page ✅ DONE

**Decision reversed mid-phase:** user tried the merged-into-Bookings approach, found it cluttered, asked for a dedicated tracking page instead. Bookings page reverted to its original lifecycle-list design; all tracking lives at `/dashboard/shipments`.

- [x] New `/dashboard/shipments` page ([app/dashboard/shipments/page.tsx](app/dashboard/shipments/page.tsx)) — focused tracking experience:
  - Header with Radar icon + pulsing live dot when any shipment is active
  - Stat pills: Active / Awaiting / Delivered counts
  - Tabbed list (Live / Awaiting / Delivered) with search
  - Per-shipment cards that expand in-place to reveal `ClientTrackingPanel`
  - Auto-opens first live shipment on load
  - Live-time ETA countdown per card (d/h, turns amber inside 48 h)
- [x] Empty states per tab — friendly guidance about where shipments come from
- [x] Client-scoped API: `GET /api/bookings/[allocationId]/tracking` ([route.ts](app/api/bookings/[allocationId]/tracking/route.ts)) returns `{ container, events[] }` with ownership check
- [x] Reusable `ClientTrackingPanel` ([components/tracking/client-tracking-panel.tsx](components/tracking/client-tracking-panel.tsx)) — wraps `TrackingTimeline` + `TrackingRoute` + `TrackingEventLog`
- [x] Nav: "Bookings" + "Live Tracking" (Radar icon) as two separate entries
- [x] Bookings page restored to its original clean lifecycle list — no tracking clutter
- [x] Deleted `LiveCargoStrip` (merged-page artifact, no longer used)
- [ ] Per-booking notifications toggle — deferred to Phase F

### Phase F — Email notifications ⏳ TODO

- [ ] Extend `lib/email.ts` with `sendTrackingMilestoneEmail({ to, allocation, milestone, vessel, eta, location })`
- [ ] Milestones that trigger email:
  - VESSEL_LOADED
  - VESSEL_DEPARTURE (POL)
  - VESSEL_ARRIVAL (POD)
  - GATE_OUT at destination / DELIVERED
  - Exception: import hold placed, ETA slip >2 days, container rolled
- [ ] Per-client fan-out: for a container with N allocations, send N emails (one per client), not 1 email with 10 names
- [ ] Dev: Mailtrap SMTP in `.env.local`; prod: existing SMTP vars (or swap to Resend later)
- [ ] Per-user opt-out flag on `users.trackingEmailsEnabled` (default true)
- [ ] Template re-uses the existing `<div>` style in `lib/email.ts` — keep consistent

### Phase G — Reconcile cron + QA ⏳ TODO

- [ ] `GET /api/cron/tracking-reconcile` (Vercel Cron or similar)
  - For every container with `trackingStatus = SUBSCRIBED` and `status != DELIVERED`:
    - `getTracking(containerNo)` → upsert events (same dedupe path as webhook)
  - Rate-limit: batches of 20 containers per run
- [ ] Admin "Force Refresh" button per shipment
- [ ] QA checklist:
  - Subscribe on order create → confirm `subscriptionId` stored
  - Webhook signature rejection path works (bad secret = 401)
  - Duplicate event id doesn't create duplicate row
  - Container status auto-promotes through SAILING → DELIVERED
  - Email fires once per milestone per client
  - Reconcile fills gap after webhook drop (simulate by pausing endpoint)

---

## Files to touch

### Schema
- `lib/db/schema/containers.ts` — add tracking columns
- `lib/db/schema/tracking-events.ts` — new
- `lib/db/schema/index.ts` — export

### API client
- `lib/metaship.ts` — `subscribeTracking`, `getTracking`, types

### Server routes
- `app/api/webhooks/metaship/tracking/route.ts` — new (public POST, signature-verified)
- `app/api/admin/tracking/[containerId]/route.ts` — new (GET log)
- `app/api/admin/tracking/[containerId]/refresh/route.ts` — new (manual re-sync)
- `app/api/bookings/[allocationId]/tracking/route.ts` — new (client-scoped)
- `app/api/cron/tracking-reconcile/route.ts` — new (Vercel cron)
- `app/api/admin/containers/[id]/create-order/route.ts` — update to call subscribeTracking after order succeeds

### UI
- `components/admin/admin-bookings-grid.tsx` — Live Shipments tab rewrite
- `components/tracking/tracking-timeline.tsx` — new reusable
- `components/tracking/tracking-map.tsx` — new (react-leaflet)
- `app/dashboard/bookings/page.tsx` — merged creative redesign
- Delete: `app/dashboard/shipments/**`, `components/shipments/**`
- Add: redirect from `/dashboard/shipments` → `/dashboard/bookings`

### Email
- `lib/email.ts` — add `sendTrackingMilestoneEmail`
- `lib/db/schema/users.ts` — add `trackingEmailsEnabled`

---

## Open questions

- [ ] MetaShip webhook signing: what header + algorithm? Assume HMAC-SHA256 of raw body with shared secret, verify with them before go-live
- [ ] Is the webhook URL configured per-organisation in MetaShip's portal, or does each `subscribe` call include a callback URL? (Spec doesn't show a callbackUrl field → org-level)
- [ ] Should past-delivered containers retain webhook subscriptions forever, or should we `unsubscribe` after final DELIVERED event to free MetaShip quota?
- [ ] Prod SMTP provider — keep nodemailer + provider SMTP, or switch to Resend API? (Nodemailer works with Resend SMTP too; no urgency)

---

## Env vars

- `NEXT_PUBLIC_APP_URL` ✅ already set (used to build webhook URL)
- `METASHIP_WEBHOOK_SECRET` ✅ generated (HMAC-SHA256 signing secret)
- `SMTP_*` ✅ Mailtrap already wired via `lib/email.ts`
- `METASHIP_CLIENT_ID` / `METASHIP_SECRET_KEY` ✅ need scopes `tracking:read` + `tracking:write`

## Applying schema changes

All schema edits go through drizzle: edit files under `lib/db/schema/` then run `npm run db:push`. **Never raw SQL.**
