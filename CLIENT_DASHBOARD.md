# Client Dashboard — Real Data Wire-Up

## Goal

Replace the placeholder data on the client dashboard (`/dashboard`) with
live queries against the rest of the system, and replace the
"Optional: Load Plan Preview" placeholder with a focused bookings panel.
Make the Key Port Weather widget feel intentional but require near-zero
ongoing maintenance.

---

## Decisions

| Question | Answer |
|---|---|
| One batched API or per-widget fetches? | **One batched** `GET /api/dashboard/overview` — single round-trip, simpler loading state |
| Cut-off time source | Sailings `etd - 48h` (industry default). Swap for a real `cutoffAt` column if MetaShip ever exposes one. |
| Cut-off route preference | Prefer a sailing whose route the client already books on; fall back to next global active sailing so first-time users still see context. |
| "Pending Tasks" definition (v1) | Overdue invoices + invoices due in next 7 days. Missing-docs detection deferred until a per-shipment required-docs concept exists. |
| Avg Transit Time window | Last 90 days vs prior 90, computed `eta - etd` over the user's delivered containers. |
| Monthly Spend window | Current calendar month, paid invoices only. Delta vs prior calendar month. |
| Empty state for bookings panel | Card-style, with a primary CTA that opens the existing `useBookingModal` hook. |
| Weather data source | **Open-Meteo** — free, no API key, commercial-friendly. WMO weather codes mapped to friendly labels + icon kinds. |
| Weather caching | 1h in-memory cache keyed by 2dp-rounded coords; on API failure prefer stale cache over showing nothing. |
| Weather port management | Admin-curated table (`dashboard_weather_ports`) — admin picks which 3–5 ports show, Open-Meteo fills in temps. World-class means "no one has to remember to update it" while still feeling intentional. |
| Lat/lng on the row vs join with `locations` | On the row directly. The list is small + admin-curated; some ports we want to show may not exist in `locations`. |

---

## Phase 1 — Real data on the overview ✅ DONE (commit `fa67889`)

### API
- [x] `GET /api/dashboard/overview` returns one batched payload covering stats + nextCutoff + upcomingBookings ([app/api/dashboard/overview/route.ts](app/api/dashboard/overview/route.ts))

### Stats cards ([components/dashboard/overview/stats-cards.tsx](components/dashboard/overview/stats-cards.tsx))
- [x] **Active Shipments** — count of allocations whose derived status ∈ {PENDING, DEPOSIT_PAID, CONFIRMED, SAILING}. Sub-text "+N this week" from `allocation.createdAt > now - 7d`.
- [x] **Pending Tasks** — composite count: overdue invoices + invoices due in next 7 days. Sub-text shows breakdown ("X overdue · Y due soon"). Color flips emerald when 0.
- [x] **Monthly Spend** — sum of `invoices.amountZAR` where `status='PAID'` AND `paidAt` in current calendar month. Real `±X% vs last month` delta; null-safe when prev = 0.
- [x] **Avg. Transit Time** — `AVG(eta - etd)` over user's delivered containers in last 90 days vs prior 90. "X.Y days faster" / "X.Y days slower" / "Steady" copy. Renders "—" cleanly with no deliveries yet.
- [x] Per-card loading skeleton (Loader2) so cards don't pop in jankily.

### Cut-off widget ([components/dashboard/overview/cutoff-widget.tsx](components/dashboard/overview/cutoff-widget.tsx))
- [x] Real next sailing — prefers client's existing routes, falls back to next global active sailing
- [x] Cut-off computed as `etd - 48h` (industry default; comment in code marks the assumption)
- [x] Urgency colour: emerald (>72h), amber (24–72h), red (<24h or past), with matching pill copy ("On track" / "Closing soon" / "Closing today" / "Closed")
- [x] Progress bar fills as the window closes (168h scale)
- [x] Vessel + voyage line shows port-of-load → port-of-discharge for context
- [x] Subtle "showing next global sailing — book a route to see your cut-off here" footnote when the cut-off isn't on a route the client books

### My Bookings widget — replaces "Optional Load Plan Preview" placeholder
- [x] `MyBookingsWidget` ([components/dashboard/overview/my-bookings-widget.tsx](components/dashboard/overview/my-bookings-widget.tsx)) shows next 3 active bookings with status pill, route, vessel, ETD, pallet count
- [x] Each row links to `/dashboard/bookings`; "View all bookings" button at the bottom
- [x] Empty state — Sparkles icon + headline + helper copy + "Book your first shipment" CTA that opens the booking modal via `useBookingModal`

### OverviewGrid ([components/dashboard/overview/overview-grid.tsx](components/dashboard/overview/overview-grid.tsx))
- [x] Now a client component, makes one fetch and passes data slices to children — no per-widget fanning
- [x] Exports the `DashboardOverview` interface so widgets type their props off it

---

## Phase 2 — Admin-curated ports + live Open-Meteo weather ✅ DONE (commit `288f3d2`)

### Schema
- [x] New `dashboard_weather_ports` table ([lib/db/schema/dashboard-weather-ports.ts](lib/db/schema/dashboard-weather-ports.ts)) — id, cityName, optional countryCode, role enum (ORIGIN / DEST / HUB), latitude, longitude, sortOrder, active, timestamps
- [x] Indexes on `sortOrder` and `active`
- [x] Exported from `lib/db/schema/index.ts`

### Admin CRUD APIs
- [x] `GET /api/admin/dashboard-weather-ports` — list ordered by sortOrder
- [x] `POST /api/admin/dashboard-weather-ports` — create with auto sortOrder + range-validated lat/lng
- [x] `PATCH /api/admin/dashboard-weather-ports/[id]` — partial update (cityName, countryCode, role, lat, lng, active, sortOrder), re-validates lat/lng on each change
- [x] `DELETE /api/admin/dashboard-weather-ports/[id]` — hard delete (it's a curated config table; soft-delete adds no value)

### Admin UI
- [x] Page at `/admin/dashboard-weather` ([app/admin/dashboard-weather/page.tsx](app/admin/dashboard-weather/page.tsx)) with Mission-Control styling, "How this works" callout
- [x] [components/admin/dashboard-weather-ports-table.tsx](components/admin/dashboard-weather-ports-table.tsx) — list with role pills, lat/lng + OpenStreetMap link, role quick-toggle, hide/show, delete
- [x] Reusable `<PortForm>` component used for **both create and edit** — single source of truth for fields + validation, submit handler branches on mode for POST vs PATCH
- [x] Edit affordance on each row: Pencil icon, opens form prefilled with the row's values, row gets a brand-blue ring + "Editing" pill while open. Toggle off by clicking Edit again.
- [x] Empty state with single CTA when no ports exist
- [x] Deleting the row currently being edited closes the form automatically
- [x] Discoverable via the admin sidebar (CloudSun icon)

### Public weather API
- [x] `GET /api/dashboard/weather` ([app/api/dashboard/weather/route.ts](app/api/dashboard/weather/route.ts)) — auth-gated, reads active rows, fans out to Open-Meteo, joins WMO codes to friendly labels + icon kinds
- [x] **Caching** — in-memory `Map` keyed by 2dp-rounded coords (so co-located ports share a slot), 1h TTL. Next.js fetch dedupe layered on top via `next: { revalidate: 3600 }`.
- [x] **Failure mode** — if Open-Meteo errors and we have stale cache, serve it. Only return null temps when there's literally nothing.
- [x] WMO code mapping (`describeWeatherCode`) covers clear / cloudy / fog / drizzle / rain / snow / showers / thunderstorm / unknown — each maps to a `kind` the UI uses to pick an icon

### Client widget
- [x] `WeatherWidget` ([components/dashboard/overview/weather-widget.tsx](components/dashboard/overview/weather-widget.tsx)) reads `/api/dashboard/weather`, picks an icon (Sun, Cloudy, CloudRain, CloudSnow, CloudLightning, CloudFog, CloudSun) per `conditionKind`, renders "—" gracefully when temp is null
- [x] Role label rendered inline with condition ("Origin · Partly cloudy")

---

## Files touched

### Phase 1
- `app/api/dashboard/overview/route.ts` — new (batched stats + cut-off + bookings)
- `components/dashboard/overview/overview-grid.tsx` — turned client + does the single fetch
- `components/dashboard/overview/stats-cards.tsx` — props-driven, real numbers
- `components/dashboard/overview/cutoff-widget.tsx` — props-driven, urgency colour
- `components/dashboard/overview/my-bookings-widget.tsx` — new

### Phase 2
- `lib/db/schema/dashboard-weather-ports.ts` — new
- `lib/db/schema/index.ts` — export
- `app/api/admin/dashboard-weather-ports/route.ts` — new (list + create)
- `app/api/admin/dashboard-weather-ports/[id]/route.ts` — new (patch + delete)
- `app/api/dashboard/weather/route.ts` — new (Open-Meteo + cache)
- `app/admin/dashboard-weather/page.tsx` — new
- `components/admin/dashboard-weather-ports-table.tsx` — new (list + reusable form)
- `components/admin/admin-sidebar.tsx` — CloudSun nav entry
- `components/dashboard/overview/weather-widget.tsx` — live data

---

## Manual steps for you

1. Run `npm run db:push` to create the `dashboard_weather_ports` table.
2. Open `/admin/dashboard-weather` and add 3–5 ports relevant to current routes. Useful seed values:
   - **Cape Town** (origin) — `-33.9249, 18.4241`, ZA
   - **London Gateway** (dest) — `51.5022, 0.4869`, GB
   - **Rotterdam** (dest) — `51.9244, 4.4777`, NL
   - **Hamburg** (dest) — `53.5511, 9.9937`, DE
   - **Antwerp** (dest) — `51.2194, 4.4025`, BE
   - **Ashdod** (dest) — `31.7986, 34.6442`, IL
3. Right-click in Google Maps → click coords to copy if you want different ports. 4 decimal places ≈ 11m precision; plenty.
4. The first dashboard load after adding ports may take ~1–2s while Open-Meteo populates the cache. Subsequent loads are instant (cache TTL 1h).

---

## Reality check / deferred items

- **Cut-off accuracy** — `etd - 48h` is industry-typical but not authoritative. If MetaShip exposes a real `cutoffAt`, swap [app/api/dashboard/overview/route.ts:cutoffFromEtd](app/api/dashboard/overview/route.ts) for that field.
- **Pending Tasks v2** — once a per-shipment required-docs concept exists (e.g. "phytosanitary uploaded? COA uploaded?"), surface missing docs alongside invoices. The card's `breakdown` object already has room for it.
- **Drag-to-reorder** on the weather ports admin — currently sortOrder is auto-assigned. If admin needs to reorder, port over the `@dnd-kit` setup from `components/admin/onboarding-requirements-table.tsx`. Skipped on first pass because 3–5 entries don't normally need reordering.
- **Per-port forecast detail** — clicking a weather row could open a 5-day forecast modal. Open-Meteo supports it for free. Defer until someone asks.
- **Delivery-on-time stat card** — natural fifth card, but the grid is `lg:grid-cols-4` and the layout is balanced; revisit when the user actually wants it.

---

## Open questions

- [ ] Should the cut-off widget show *the user's specific* next cut-off when they have multiple active routes (e.g. earliest among their routes), or the network's next? Current behaviour: earliest among the user's routes; fall back to network if zero.
- [ ] Do we want to expose the weather widget on `/dashboard/shipments` (live tracking) too? Same `/api/dashboard/weather` endpoint — would just plug in.
- [ ] If a port goes inactive, should historical bookings still show its weather? Current: no (the widget filters by `active=true`). That feels right for a forward-looking dashboard.
