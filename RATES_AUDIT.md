# Rates Management Audit — Progress Tracker

## Goal

Fix the rates management pipeline so that:
- Origin Charges / Ocean Freight / Destination Charges all work end-to-end for **both** rate types (SRS Shared Reefer Services, SCS Shared Container Service)
- Container Type (Equipment on rates = `containerTypeId`) actually flows through the quote engine — today it's hardcoded to `40ft-reefer-hc`
- Admins can create destination / origin rates without losing track and accidentally creating duplicates

---

## Problems identified

### Problem A — Container type is hardcoded in the quote resolver
[lib/rates.ts](lib/rates.ts) queries all three rate buckets with `eq(<table>.containerId, "40ft-reefer-hc")`. Any rate configured for a different container type is invisible to the booking flow. Fixes container-type selection end-to-end.

### Problem B — Silent `"srs"` fallbacks on mutation paths
Three spots collapse a missing `salesRateTypeId` to `"srs"` silently:
- [app/api/admin/ocean-freight/route.ts:112](app/api/admin/ocean-freight/route.ts#L112)
- [app/api/admin/destination-charges/route.ts:88](app/api/admin/destination-charges/route.ts#L88)
- [app/api/rates/quote/route.ts:26](app/api/rates/quote/route.ts#L26) and [lib/rates.ts:44](lib/rates.ts#L44) (default arg)

In practice the dialogs pre-fill `"srs"` so this usually doesn't corrupt data — but any future caller that forgets the field silently gets SRS.

### Problem C — List doesn't refresh reliably after save → duplicates
The destination-charge create flow is:
1. List page → "Create" dialog → dialog navigates to `/new` editor page
2. Editor POSTs → calls `router.push("/admin/finance/destination-charges")`
3. List re-mounts → `useEffect` runs `fetchCharges`

But three small issues combine to break this:
- Editor's Save button is NOT disabled during save → double-click creates duplicate rows
- Editor navigates back without `router.refresh()` → Next's router cache can serve a stale list page for a tick
- List's `useEffect` wraps `fetchCharges` in `setTimeout(..., 0)` → another tick of delay
- Fetch calls don't set `cache: "no-store"` → Next fetch cache can also serve stale

Result: user saves, sees an empty/stale list on arrival, assumes it failed, clicks Save again → duplicate row. Then the list eventually refreshes and both show up.

**Same pattern exists on Origin Charges list** (same editor flow).

**Ocean Freight grid** uses inline-create (dialog POSTs directly, calls `onSuccess`) — safer, but still has the `setTimeout(..., 0)` on its useEffect and Save button isn't gated.

### Problem D — Destination editor doesn't let admin change rate type on edit
Minor: PUT body omits `salesRateTypeId`, so changing an existing rate's type from SRS→SCS is impossible via the edit page.

---

## Phases

### Phase C — Smooth list-refresh for all three rate lists ✅ DONE

**Editor fixes (destination + origin):**
- [x] Disable Save button while `saving`; show "Saving…" + spinner. Prevents double-click duplicates
- [x] After successful save, call `router.refresh()` *before* `router.push(listPage)` so Next drops the route cache

**List fixes (all three):**
- [x] Removed `setTimeout(fetchX, 0)` wrapper in useEffect — call directly
- [x] Added `cache: "no-store"` to all list fetches (destination, origin × 3 endpoints, ocean)
- [x] Ocean freight dialog already gates Save button against double-submit — verified, no change needed

**Scope check:**
- [x] Searched for other `setTimeout(fetch*, 0)` patterns in admin/finance — only the three lists above used it

### Phase A — Container type flows through the quote ✅ DONE

- [x] `calculateQuote` signature now takes required `salesRateTypeId` + `containerTypeId`; throws if missing
- [x] `/api/rates/quote` GET accepts `containerId` (container-instance id), looks up the container's `containerTypeId` server-side and passes it through; 400 on missing fields, 404 if container missing, 422 if container has no type assigned
- [x] `step-cost-breakdown.tsx` sends `containerId` in the quote URL and re-fires on `salesRateTypeId` / `containerId` change
- [x] All three `"40ft-reefer-hc"` hardcodes in `lib/rates.ts` replaced with the passed `containerTypeId`
- [x] `/api/bookings` POST now resolves `container.containerTypeId` before calling `calculateQuote` — no silent "srs" fallback for pricing

**Fall-through strategy:** no fuzzy fallback — if no rate exists for `(route, rate type, container type)`, the quote returns `hasXRates: false` for that bucket. UI already handles this: shows "—" for the missing bucket; if *all three* are missing, full-page "No rates available" message. This is the correct behaviour (no silent wrong quotes) and doesn't need further changes.

### Phase B — Remove silent SRS defaults ✅ DONE

- [x] `/api/admin/ocean-freight` POST: 400 if `salesRateTypeId` missing; no longer falls back to "srs"
- [x] `/api/admin/destination-charges` POST: same
- [x] `/api/rates/quote` GET: 400 if `salesRateTypeId` missing
- [x] `calculateQuote`: `salesRateTypeId` now required — throws if missing

### Phase D — Allow changing rate type on edit — Not a bug ✅ CLOSED

Verified against current UI: rate cards are **intentionally immutable** on their identity fields (`salesRateTypeId`, location, `containerId`, effective dates). The editor only lets admins change line items, currency, exchange rate, and active flag. To switch a rate's service type or container type, admin creates a new card.

Both `destination-charge-editor.tsx` and `origin-charge-editor.tsx` follow this pattern. No fix needed — this is design intent, not a bug.

---

## Files to touch

### Phase C
- `components/admin/finance/destination-charges-list.tsx`
- `components/admin/finance/origin-charges-list.tsx`
- `components/admin/finance/ocean-freight-grid.tsx`
- `components/admin/finance/destination-charge-editor.tsx`
- `components/admin/finance/origin-charge-editor.tsx`

### Phase A
- `lib/rates.ts`
- `app/api/rates/quote/route.ts`
- `components/booking/step-cost-breakdown.tsx`

### Phase B
- `app/api/admin/ocean-freight/route.ts`
- `app/api/admin/destination-charges/route.ts`
- `app/api/rates/quote/route.ts`
- `lib/rates.ts`

### Phase D
- `components/admin/finance/destination-charge-editor.tsx`

---

## Open questions

- [ ] Phase A fallback: when no rate exists for a specific `(route, rate type, container type)` combo, should the quote return 0 or try to fall back to the default 40ft container type? Ask user before implementing.
- [ ] Phase D scope: do we also want to let admins change `containerTypeId` on edit, or only rate type?
