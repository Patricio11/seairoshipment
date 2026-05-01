# SEO Optimization — Progress Tracker

## Goal

Get **seairo.com** found on Google, especially for the registered trademark
**Shared Reefer Services®**, plus the long-tail queries real customers search
for (consolidated reefer shipping, cold-chain LCL exporter, Cape Town reefer
consolidation, etc.).

Two layers — only one is code:

- **Technical + on-page** (code-side, ~1 day): metadata, structured data,
  sitemap, robots, OG image, keyword-tuned headings, FAQ schema, performance.
  Without this, Google can index but can't *understand* the page.
- **Off-page authority** (months, not code): backlinks, Google Business
  Profile, fresh content. We can't write code that creates this — but we can
  set up the verification + analytics so we can measure progress.

---

## Decisions

| Question | Answer |
|---|---|
| Production domain | **seairo.com** |
| Trademark mark | **Shared Reefer Services®** (registered) |
| First use of mark on a page | `Shared Reefer Services®` (with ®) |
| Subsequent uses | `Shared Reefer Services` (plain) — avoid stuffing the symbol |
| Footer trademark line | "Shared Reefer Services® is a registered trademark of Seairo Cargo." |
| Canonical URL pattern | `https://seairo.com{pathname}` |
| OG image dimensions | 1200×630, served from `/og.png` |

---

## Target keywords

Primary (must rank #1 — easy because it's our mark):
- `shared reefer services`
- `seairo cargo`

Secondary (medium, achievable in months):
- `shared reefer container`
- `consolidated reefer shipping cape town`
- `cold chain LCL exporter`
- `reefer consolidation south africa`

Long-tail (FAQ schema captures these):
- "what is a shared reefer service"
- "how does cold chain consolidation work"
- "minimum pallets for reefer shipping"
- "iot temperature monitoring shipping"

---

## Phases

### Phase A — Technical foundations ✅ DONE (assets pending)

- [x] `app/layout.tsx` — full Metadata: `metadataBase`, title template, description, keyword list, OG (en_ZA, image, alt), Twitter (`summary_large_image`), robots directives, canonical, icons map, manifest, themeColor via `viewport`, GSC verification env-driven
- [x] `app/page.tsx` — landing-specific metadata override + canonical `/`
- [x] `app/sitemap.ts` — only public landing for now (`/`)
- [x] `app/robots.ts` — `/` allowed; `/admin`, `/dashboard`, `/api`, auth holding routes disallowed; sitemap pointer
- [x] `components/seo/structured-data.tsx` — Organization, LocalBusiness (Cape Town address + geo), Service ("Shared Reefer Services®"), wired into landing page as JSON-LD
- [ ] **Asset task:** OG image at `public/og.png` (1200×630) — placeholder OK for v1, replace with branded design before launch. Without it, social shares (LinkedIn/Slack/Twitter) get an empty preview.
- [ ] **Asset task:** Full favicon set — `public/icon.svg` (vector logo), `public/apple-touch-icon.png` (180×180), `public/site.webmanifest` (icon manifest). Next auto-serves `app/favicon.ico` already so the basic browser tab favicon works. The icon + manifest references stay in `app/layout.tsx` — once the assets are dropped in `/public` and deployed, the 404s disappear automatically. Use [realfavicongenerator.net](https://realfavicongenerator.net) to generate the whole set from your logo.

### Phase B — Content keyword optimization ✅ DONE

- [x] Hero H1 rewritten to lead with **Shared Reefer Services®** for Cold-Chain Exporters. The trademark symbol uses superscript styling so it doesn't dominate visually but still registers as the canonical mark on first use.
- [x] Hero subhead now uses "Shared Reefer Services consolidation" instead of the abbreviation "SRS consolidation"
- [x] **FAQ section** ([components/landing/faq-section.tsx](components/landing/faq-section.tsx)) — 7 questions targeting long-tail queries (what is SRS, vs FCL, minimum order, routes, IoT monitoring, customs, how to start). Accordion UI, expand/collapse, FAQPage JSON-LD inlined so Google can pull these into rich snippets / People-Also-Ask
- [x] FAQ wired into the landing page between Testimonials and Contact
- [x] Footer brand description rewritten to lead with the trademarked term + ®
- [x] Footer bottom-bar trademark notice: "Shared Reefer Services® is a registered trademark of Seairo Cargo Solutions"
- [x] Footer copyright year auto-updates via `new Date().getFullYear()`
- [x] Footer logo alt text expanded from "Seairo" → "Seairo Cargo — Shared Reefer Services"
- [x] Internal link to FAQ added to the footer's Product column

### Phase C — Tracking + verification ✅ DONE (manual setup steps below)

**Code-side**
- [x] `metadata.verification.google` reads from `GOOGLE_SITE_VERIFICATION` env — set in Vercel and the `<meta>` tag is automatically rendered into `<head>`
- [x] `metadata.verification.other['msvalidate.01']` reads from `BING_SITE_VERIFICATION` env — same pattern
- [x] **Vercel Analytics** (`@vercel/analytics`) mounted via `<Analytics />` in root layout — captures page views, no cookie banner needed (privacy-first)
- [x] **Vercel Speed Insights** (`@vercel/speed-insights`) mounted via `<SpeedInsights />` — Core Web Vitals (LCP / CLS / INP) reported back so we can spot perf regressions
- [x] No GA4, no Plausible — Vercel covers what we need without cookie-banner overhead

**Manual setup steps for the user** (one-time)
- [ ] Visit [Google Search Console](https://search.google.com/search-console), add `seairo.com`, choose the **HTML tag** verification method, copy the `content` value, set as `GOOGLE_SITE_VERIFICATION` env in Vercel, redeploy, then click Verify in Search Console
- [ ] In Search Console → Sitemaps, submit `https://seairo.com/sitemap.xml`
- [ ] Visit [Bing Webmaster Tools](https://www.bing.com/webmasters), import from GSC (one-click) OR add the property manually + use the `BING_SITE_VERIFICATION` env hook to verify
- [ ] Enable Vercel Analytics in the project's Analytics tab in the Vercel dashboard (data won't appear until that's flipped on)

---

## Files to touch

### Phase A
- `app/layout.tsx` — root metadata
- `app/page.tsx` — landing-specific metadata override
- `app/sitemap.ts` — new
- `app/robots.ts` — new
- `components/seo/structured-data.tsx` — new (JSON-LD blocks)
- `public/og.png` — manual graphic-design task (placeholder fine for v1)

### Phase B
- `components/landing/hero-section.tsx` — H1 + subhead
- `components/landing/faq-section.tsx` — new
- `components/landing/footer.tsx` — trademark line
- Various — alt text audit

### Phase C
- `app/layout.tsx` — verification meta tags + analytics script
- `package.json` — add `@vercel/analytics` (or chosen alternative)

---

## Reality check

- "Shared Reefer Services®" should rank #1 within days of indexing — it's a
  registered trademark with no competition. Verify in Search Console once live.
- General terms ("cold chain logistics", "reefer shipping") will not rank in
  the first quarter no matter how clean the code. Those need backlinks +
  content over time.
- The OG image and favicon set are the single highest-impact items for *human*
  perception when someone shares your URL. Worth treating as a launch blocker.
