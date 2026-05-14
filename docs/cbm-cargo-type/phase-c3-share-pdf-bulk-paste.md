# Phase C.3 — Share-by-link · PDF download · Bulk paste · Cleanup

**Status:** ✅ Done — `tsc --noEmit` clean. Phase C is complete.

The final C sub-phase closes the Tools section by adding three high-leverage UX features and clearing out the Phase B smoke page.

---

## 1. Share-by-link (token-gated, revocable, audit-trailed)

### APIs (new)

**Authenticated, owner-only** ([app/api/dashboard/cbm-calculations/[id]/share/route.ts](../../app/api/dashboard/cbm-calculations/[id]/share/route.ts))
- `GET` — list active (non-revoked) share tokens for this calc
- `POST` — generate a new token with optional `expiresInDays` (capped at 365). Token = 32 chars URL-safe random (`randomBytes(24).toString("base64url")` via Node crypto).
- `DELETE ?token=…` — revoke a specific token (sets `revokedAt = now`)

**Public, unauthenticated** ([app/api/share/cbm/[token]/route.ts](../../app/api/share/cbm/[token]/route.ts))
- `GET /api/share/cbm/[token]` — returns the calc payload (name, items, totals) for a valid token. Refuses revoked / expired tokens with HTTP 410.
- Deliberately **omits** owner email, userId, notes — viewers see dimensions only.
- Bumps `accessCount` + `lastAccessedAt` on every successful read so the owner can see basic engagement stats from the share modal.

### Public page ([app/share/cbm/[token]/page.tsx](../../app/share/cbm/[token]/page.tsx))
Read-only view that reuses `<CBMCalculator readOnly>` + `<CBM3DViz>` so consignees see exactly the same calc the owner does, minus the action buttons. Branded header / footer matching the rest of the public site.

### Share modal ([components/cbm/share-link-button.tsx](../../components/cbm/share-link-button.tsx))
Mounted in the calc editor as a "Share" button. Dialog lets the owner:
- Generate a new link with expiry presets (7 / 30 / 90 days / never)
- Auto-copies the new URL to clipboard on creation
- See active links with copy + revoke + access count
- See "Expired" / "Revoked" pills inline

### Robots
[app/robots.ts](../../app/robots.ts) gains `/share/` to the disallow list. Share links are intentionally public to anyone with the URL, but they're private business documents — we don't want them indexed.

---

## 2. PDF download

[components/cbm/download-pdf-button.tsx](../../components/cbm/download-pdf-button.tsx). Click "Download PDF" → dynamic-imports `jspdf` (already installed; ~80 KB chunk) → generates an A4 document:

- Header: calc name + timestamp + Seairo branding
- Totals strip: Total volume, Total weight, Volumetric (sea), Pallet equivalent
- Sustainability italic line below: `~XX kg CO₂eq via ocean SCS — ~95% less than air for this volume`
- Items table: Label · L / W / H mm · Weight · Qty · Volume
- Container fit table: 20ft / 40ft / 40ft HC capacity / % full / remaining
- Footer disclaimer about quotes being estimates

**Why text-first**: html2canvas is unreliable for WebGL captures across browsers without `preserveDrawingBuffer: true`, which has its own perf cost. A clean text PDF is what consignees and customs brokers actually print and pass on. Adding a 3D screenshot is a small follow-up later if anyone misses it.

**Bundle hygiene**: `import("jspdf")` only runs on button click, so the dashboard's main bundle stays the same size for users who never download.

---

## 3. Bulk paste from packing list

[components/cbm/bulk-paste-button.tsx](../../components/cbm/bulk-paste-button.tsx). Mounted in the calculator beside the preset picker. Modal lets the user:

- Paste rows from Excel / email / CSV (tab-, comma- or multi-space-separated)
- Pick the unit for dimensions + weight in the paste (cm / in / m / ft × kg / lb)
- See a **live preview** of parsed rows with a green ✓ / red ✗ per line + first-30-chars of the raw text on errors

### Parser heuristics
The parser handles three column orders:
- `Label, Qty, L, W, H, Weight`
- `Qty, L, W, H, Weight`
- `L, W, H, Qty`

Detection:
- First field non-numeric → label
- Then: if the leading remaining number is ≤ 999 and smaller than the trailing number → `Qty, L, W, H, Weight`
- Else: `L, W, H, Weight, Qty`
- 4-field row → `L, W, H, Qty` (no weight)

Invalid rows are kept in the preview with their reason ("Negative or non-numeric value", "Dimensions out of range (0 < x ≤ 10 m)", "Couldn't parse columns") so the user can see what went wrong and fix the source.

Import button reads as "Import N rows" with the live count, disabled when no valid rows exist. Skipped rows don't block the import; the user can re-paste the rejects later.

**Download example CSV**: a button inside the modal generates a client-side CSV with realistic SCS cargo rows (wine cases, citrus, chocolate, trophy crates, mixed dry boxes) plus inline `#` comments explaining the columns. Filename: `seairo-cbm-bulk-import-example.csv`. The parser ignores `#` lines so the file can be pasted back as-is to verify the format works. Picks up the user's current unit selection — switching to inches before downloading gives them an inch-headered example.

---

## 4. Cleanup

- **Deleted**: [app/dev/cbm/page.tsx](app/dev/cbm/page.tsx) — the Phase B smoke-test page. The same component is now exercised through the real `/dashboard/tools/cbm-calculator/new` page, so the throwaway is no longer needed.

---

## What this sub-phase does NOT do

Tier 2 features explicitly carried in the master tracker as v1 scope still pending:

- **Cut-off urgency banner on the calculator** — already shown inside the Smart-match panel per match. The standalone in-calculator banner (when no specific container is picked) is deferred to a smaller Phase D follow-up alongside the booking-wizard cargo-type gate.
- **3D loading playback animation** — the 3D viz is static for now. The animation is a small visual upgrade that can land any time; not a blocker for booking flow integration.
- **Keyboard shortcuts** (Ctrl+N row, Enter to add) — quality-of-life, can ship in any future polish pass.

These deliberately don't block the rest of the rollout — Phase D (booking wizard integration) is the next critical-path piece.

---

## Files touched

```
app/api/dashboard/cbm-calculations/[id]/share/route.ts          new
app/api/share/cbm/[token]/route.ts                              new
app/share/cbm/[token]/page.tsx                                  new
app/robots.ts                                                   modified — disallow /share/
components/cbm/share-link-button.tsx                            new
components/cbm/download-pdf-button.tsx                          new
components/cbm/bulk-paste-button.tsx                            new
components/cbm/cbm-calculator.tsx                               modified — bulk-paste mount
components/cbm/calculation-editor.tsx                           modified — Share + Download mount
app/dev/cbm/page.tsx                                            deleted (smoke page)
```

---

## Manual smoke test

After commit + `npm run db:push`:

1. Open `/dashboard/tools/cbm-calculator/new`. The header row now has **Paste from packing list** + **Quick add from preset** buttons.
2. Click **Paste from packing list**. Paste this into the textarea (Excel-style, tabs):
   ```
   Wine 12-bottle case	24	35	30	23	16
   Citrus 15kg carton	36	40	30	27	15
   Chocolate bulk box	12	50	40	30	12
   ```
   Should show 3 valid rows in the preview. Click "Import 3 rows". The calculator loads with 3 rows, total ~7.0 m³.
3. Save the calc as "Mixed export Q3 test".
4. On the saved-calc page: top-right action row now shows **Share** · **Download PDF** · Duplicate · Archive · Save changes.
5. Click **Download PDF** — a `mixed-export-q3-test.pdf` downloads with the totals, sustainability line, items table, and fit grid.
6. Click **Share** → pick "30 days" → "Generate new link". A URL appears, copied to clipboard automatically. Paste it into an incognito window — you see the read-only public view at `/share/cbm/[token]`.
7. Back in the dashboard, in the same Share modal, click the trash icon on the active link → confirm. Reload the incognito tab → "Share link revoked" message.

---

## Phase C — complete

```
A · Schema foundations            ✅
B · CBM helpers + calculator UI   ✅
C · Tools hub + saved calcs       ✅ (C.1 + C.2 + C.3 all merged)
D · Booking wizard integration    ← NEXT
E · Admin rate cards
F · Container creation + admin views
G · Display surfaces
H · Polish + tracker updates
```

**Next**: Phase D wires the Tools section into the booking flow. The "Book this container" deep-links generated by the Smart-match panel land in the booking wizard with `?calculationId=…&containerId=…` query params; the wizard reads them, pre-fills cargoType=CUBE, snapshots the calc's items into the allocation, and submits.
