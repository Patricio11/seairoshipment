# SEO Playbook — Drop-in Optimisation for Next.js Sites

A portable, stack-aware playbook to get a new Next.js site **understood, indexed, and ranking** on Google + Bing within the first month. Distilled from the Seairo Cargo rollout — trademark-led B2B site that hit #1 for its brand term within days of indexing.

**Designed for**: Next.js 14+/15+ App Router · TypeScript · deployed on Vercel. The metadata + JSON-LD patterns transfer cleanly to other React frameworks; the file paths (`app/layout.tsx`, `app/sitemap.ts`, etc.) are Next-App-Router-specific.

> **How to use this in another project**: copy this file into the new repo's root, then prompt Claude:
> *"Read SEO_PLAYBOOK.md and execute it end-to-end for this project. Ask me only for the inputs in §2."*
> Claude does the code work; the **§7 Manual Steps** section is what you do yourself in browser tabs.

---

## 1. What you get

After Phase A → C and the manual steps:

- **Branded / trademarked terms ranking #1** within days of indexing (no competition for your exact mark).
- **Indexed sitemap** with every public route auto-discovered by Google + Bing.
- **Rich snippets** in search results (FAQ accordion, knowledge panel, breadcrumb crumbs where applicable).
- **Clean Open Graph + Twitter card** previews on LinkedIn, Slack, X, WhatsApp.
- **Full favicon set** across browsers + iOS/Android.
- **Core Web Vitals tracked** so perf regressions surface before users complain.
- **Search Console + Bing Webmaster verified** through env-driven meta tags (no code changes when tokens rotate).
- **`/robots.txt`** that disallows gated routes so Googlebot doesn't burn crawl budget on `/api/*` or `/admin/*`.

**Out of scope but easy to bolt on**:
- Programmatic SEO landing pages (pSEO) — different rules around content quality + indexing limits, big initiative.
- Multi-locale / hreflang setup — covered loosely via `openGraph.locale` but not the full alt-tag matrix.
- A/B testing of titles / descriptions — high effort, defer until baseline is ranking.
- Backlink outreach / Google Business Profile management — off-platform, the user's job.
- GA4 / Plausible / Fathom — Vercel Analytics covers first-party page views without a cookie banner.

---

## 2. Inputs the playbook needs from you

Fill these in once and Claude (or you) reuses them across every file.

| Input | Example | Notes |
|---|---|---|
| `PRODUCTION_DOMAIN` | `seairo.com` | Bare domain — no `https://`, no trailing slash |
| `BUSINESS_NAME` | `Seairo Cargo` | The legal / displayed brand |
| `LEGAL_NAME` | `Seairo Cargo Solutions (Pty) Ltd` | For footer + Organization JSON-LD `legalName` |
| `TAGLINE_TITLE` | `Shared Reefer Services® for Cold-Chain Exporters` | Goes into `<title>` template + OG titles |
| `META_DESCRIPTION` | one tight sentence, ≤160 chars | Keyword-loaded but reads like a human wrote it |
| `PRIMARY_KEYWORDS` | `shared reefer services`, `seairo cargo` | "Must rank #1" terms (brand + trademark) |
| `SECONDARY_KEYWORDS` | `consolidated reefer shipping cape town`, `cold chain LCL exporter` | Realistic medium-term targets, 5–10 phrases |
| `BUSINESS_ADDRESS` | locality / region / postal / country code | Drives LocalBusiness JSON-LD |
| `BUSINESS_GEO` | latitude, longitude | Pin on Google Maps for the same address |
| `OPENING_HOURS` | `Mo-Fr 08:00-17:00` | LocalBusiness `openingHours` |
| `SUPPORT_EMAIL` / `SUPPORT_PHONE` | `cat@seairocargo.co.za` / `+27-72-261-7325` | ContactPoint schemas |
| `AREAS_SERVED` | ISO country codes: `ZA, NL, GB, DE` | ContactPoint + Service `areaServed` |
| `SOCIAL_PROFILES` (when live) | LinkedIn, X, etc. URLs | Goes into Organization `sameAs` |
| `PUBLIC_ROUTES` | `/`, `/blog`, `/services` | Pages that *should* appear in sitemap |
| `PRIVATE_ROUTE_PREFIXES` | `/admin`, `/dashboard`, `/api`, auth holding pages | Disallowed in `robots.ts` |
| `TRADEMARK_NOTICE` (if any) | `Shared Reefer Services® is a registered trademark of …` | Footer line + first-on-page use |
| `BRAND_COLOR` | `#2563eb` | Used by `theme-color` meta + OG accent |
| `LOCALE` | `en_ZA` | OG locale + `<html lang>` |

If anything is missing, build everything you can and flag the gap — don't block on placeholders.

---

## 3. Locked decisions (cheat sheet)

Argue these once, write them down, don't relitigate.

| Question | Pick | Why |
|---|---|---|
| Analytics | **Vercel Analytics + Speed Insights** | First-party, no cookie banner, Core Web Vitals included |
| GA4 / Plausible? | **No, unless explicitly asked** | Adds a cookie banner + heavier bundle; Vercel covers what we need |
| Sitemap | **`app/sitemap.ts`** (Next convention) | Runs at build + request time → freshness automatic |
| Robots | **`app/robots.ts`** | Same — no hand-rolled XML |
| Structured data | **JSON-LD `<script>` tags, server-rendered** | Googlebot reads without executing JS |
| Required schemas | **Organization + LocalBusiness + Service + FAQPage** | Covers knowledge panel, local pack, service rich results, PAA carousel |
| OG image | **1200×630 PNG at `/og.png`** | LinkedIn/Slack/X all use this aspect ratio |
| Favicons | **Generated via realfavicongenerator.net** | `favicon.ico` + `icon.svg` + `apple-touch-icon.png` + `site.webmanifest` |
| Verification meta tags | **Env-driven**, not hardcoded | Rotate tokens without code changes |
| Per-page metadata override | **Yes for every public route** | The H1 keyword goes in the `<title>` too |
| Robots disallow | **All auth-gated paths + `/api/*`** | Stops crawl-budget waste on 401/403 |
| Canonical URL pattern | **Bare apex** (`https://DOMAIN`) | Pick one of apex vs `www.`, 301 the other |
| Hardcoded meta descriptions | **Yes — handcraft per route** | ML-generated descriptions tank CTR |
| FAQ count | **5–10 entries** | More dilutes the ranking signal |
| Trademark symbol usage | **First use on page only** (`X®`) | Subsequent uses plain — avoid stuffing |

---

## 4. Mental model — what code can and can't do

**Two layers, only one is code:**

- **Technical + on-page (code, ≈1 day)** — metadata, JSON-LD, sitemap, robots, OG image, keyword-tuned headings, FAQ schema, perf. Without this, Google can index but can't *understand* the page.
- **Off-page authority (months)** — backlinks, Google Business Profile, fresh content, social presence. No code creates this.

**Reality check** (set this expectation explicitly with stakeholders):
- Branded / trademarked terms rank **within days** of indexing — no competition.
- Generic terms ("cold chain logistics", "SaaS analytics") **will not rank in the first quarter** no matter how clean the code. Backlinks + content over time.
- The OG image + favicon set are the single highest-impact items for *human* perception when someone shares the URL. Treat them as launch blockers.

---

## 5. Architecture at a glance

```
SOURCES OF SIGNAL
─────────────────
  ┌──────────────────────┐
  │ app/layout.tsx       │   metadata.title.template, description, OG, Twitter, icons,
  │   (root metadata)    │   manifest, theme-color, env-driven verification
  └──────────────────────┘
  ┌──────────────────────┐
  │ app/page.tsx         │   per-page metadata override (landing-specific title +
  │   (per-route)        │   canonical), <StructuredData /> JSON-LD blocks
  └──────────────────────┘
  ┌──────────────────────┐
  │ app/sitemap.ts       │   one row per public route; dynamic routes fetched at runtime
  │ app/robots.ts        │   disallow gated routes; sitemap pointer
  └──────────────────────┘
  ┌──────────────────────┐
  │ components/seo/      │   Organization + LocalBusiness + Service JSON-LD
  │   structured-data    │
  │ components/landing/  │   inline FAQPage JSON-LD next to the accordion UI
  │   faq-section        │
  └──────────────────────┘
  ┌──────────────────────┐
  │ <Analytics />        │   first-party page views (no banner)
  │ <SpeedInsights />    │   Core Web Vitals (LCP, CLS, INP)
  └──────────────────────┘

SERVED CRAWL ENDPOINTS
──────────────────────
  GET /sitemap.xml         ← Next emits this from app/sitemap.ts
  GET /robots.txt          ← Next emits this from app/robots.ts
  GET /og.png              ← 1200×630 PNG you ship in /public
  GET /favicon.ico         ← Next auto-serves from app/ or public/

VERIFICATION + MEASUREMENT (env-driven)
───────────────────────────────────────
  GOOGLE_SITE_VERIFICATION → <meta name="google-site-verification" …>
  BING_SITE_VERIFICATION   → <meta name="msvalidate.01" …>
```

---

## 6. Phased rollout

| Phase | Goal | Time |
|---|---|---|
| **A** | Technical foundations — metadata, sitemap, robots, JSON-LD | ~3–4h |
| **B** | Content + keyword optimisation — H1, FAQ, footer, alt text | ~2–3h |
| **C** | Tracking + verification — Vercel analytics, GSC/Bing env hooks | ~1h |
| **Manual** | OG image, favicon bundle, GSC verification, sitemap submit | ~1h |

Critical path: A unlocks indexing; B unlocks rich snippets; C unlocks measurement.

---

## Phase A — Technical foundations

### A1. Root metadata (`app/layout.tsx`)

```ts
import type { Metadata, Viewport } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://PRODUCTION_DOMAIN";

export const metadata: Metadata = {
    metadataBase: new URL(SITE_URL),
    title: {
        default: "BUSINESS_NAME — TAGLINE_TITLE",
        template: "%s | BUSINESS_NAME",
    },
    description: "META_DESCRIPTION",
    applicationName: "BUSINESS_NAME",
    keywords: [
        "PRIMARY_KEYWORD_1",
        "PRIMARY_KEYWORD_2",
        "SECONDARY_KEYWORD_1",
        // …all keywords from §2
    ],
    authors: [{ name: "BUSINESS_NAME", url: SITE_URL }],
    creator: "BUSINESS_NAME",
    publisher: "BUSINESS_NAME",
    alternates: { canonical: "/" },
    openGraph: {
        type: "website",
        locale: "LOCALE",          // e.g. "en_ZA"
        url: SITE_URL,
        siteName: "BUSINESS_NAME",
        title: "BUSINESS_NAME — TAGLINE_TITLE",
        description: "META_DESCRIPTION",
        images: [{
            url: "/og.png",
            width: 1200,
            height: 630,
            alt: "BUSINESS_NAME — TAGLINE_TITLE",
        }],
    },
    twitter: {
        card: "summary_large_image",
        title: "BUSINESS_NAME — TAGLINE_TITLE",
        description: "META_DESCRIPTION",
        images: ["/og.png"],
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
        },
    },
    icons: {
        icon: [
            { url: "/favicon.ico" },
            { url: "/icon.svg", type: "image/svg+xml" },
        ],
        apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    },
    manifest: "/site.webmanifest",
    category: "INDUSTRY_CATEGORY",   // e.g. "logistics", "fintech"
    verification: {
        google: process.env.GOOGLE_SITE_VERIFICATION,
        ...(process.env.BING_SITE_VERIFICATION
            ? { other: { "msvalidate.01": process.env.BING_SITE_VERIFICATION } }
            : {}),
    },
};

export const viewport: Viewport = {
    themeColor: "BRAND_COLOR",        // e.g. "#2563eb"
    colorScheme: "light dark",
    width: "device-width",
    initialScale: 1,
};
```

**Why each piece matters** — keep these comments in the code so future contributors don't strip them:
- `metadataBase` lets relative URLs in OG/Twitter resolve correctly.
- `title.template` auto-suffixes every child page (`%s | Business Name`).
- `googleBot` directives unlock larger image / snippet sizes in search results.
- `verification.google` is **env-driven** so you can verify post-deploy without a code change.

### A2. Per-route metadata override

Promote the trademarked / hero phrase to the SERP title for the landing only:

```ts
// app/page.tsx
export const metadata: Metadata = {
    title: "TRADEMARKED_PHRASE® | TAGLINE",
    description: "More marketing-y description that mentions the trademark and what you do.",
    alternates: { canonical: "/" },
};
```

Repeat per public route (`/services`, `/blog/[slug]`, etc.) — each gets its own keyword-tuned title and description. **Never let `title.template` carry the H1 keyword by itself** — the per-route override is what makes the SERP title compelling.

### A3. Sitemap (`app/sitemap.ts`)

```ts
import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://PRODUCTION_DOMAIN";

export default function sitemap(): MetadataRoute.Sitemap {
    const now = new Date();
    return [
        { url: SITE_URL, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
        // Add a row per public route. priority drops 0.1–0.2 per level of depth.
    ];
}
```

For dynamic routes (blog posts, etc.), `await` your DB/CMS query inside this function — it runs at build time *and* at request time on Vercel, so freshness is automatic.

### A4. Robots (`app/robots.ts`)

```ts
import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://PRODUCTION_DOMAIN";

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [{
            userAgent: "*",
            allow: ["/"],
            disallow: [
                "/admin", "/admin/",
                "/dashboard", "/dashboard/",
                "/api/",
                // any auth holding routes:
                "/auth/onboarding", "/auth/verified", "/auth/forgot-password",
                "/auth/2fa", "/auth/setup-2fa", "/auth/reset-password", "/auth/check-email",
            ],
        }],
        sitemap: `${SITE_URL}/sitemap.xml`,
        host: SITE_URL,
    };
}
```

**Critical** — disallow gated routes so Googlebot doesn't burn crawl budget on 401/403 responses. Replace the example list with whatever's behind login in your project.

### A5. JSON-LD structured data

`components/seo/structured-data.tsx` — three schemas, server-rendered:

```tsx
export function StructuredData() {
    const organization = {
        "@context": "https://schema.org",
        "@type": "Organization",
        "@id": `${SITE_URL}#organization`,
        name: "BUSINESS_NAME",
        legalName: "LEGAL_NAME",
        url: SITE_URL,
        logo: `${SITE_URL}/logo.png`,
        sameAs: [/* SOCIAL_PROFILES */],
        contactPoint: {
            "@type": "ContactPoint",
            email: "SUPPORT_EMAIL",
            telephone: "SUPPORT_PHONE",
            contactType: "customer support",
            areaServed: [/* AREAS_SERVED */],
        },
    };

    const localBusiness = {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        "@id": `${SITE_URL}#local`,
        name: "BUSINESS_NAME",
        address: {
            "@type": "PostalAddress",
            streetAddress: "STREET",
            addressLocality: "CITY",
            addressRegion: "REGION",
            postalCode: "POSTAL",
            addressCountry: "COUNTRY_CODE",
        },
        geo: {
            "@type": "GeoCoordinates",
            latitude: LATITUDE,
            longitude: LONGITUDE,
        },
        openingHoursSpecification: [{
            "@type": "OpeningHoursSpecification",
            dayOfWeek: ["Monday","Tuesday","Wednesday","Thursday","Friday"],
            opens: "08:00",
            closes: "17:00",
        }],
    };

    const service = {
        "@context": "https://schema.org",
        "@type": "Service",
        name: "TRADEMARKED_PHRASE®",
        provider: { "@id": `${SITE_URL}#organization` },
        areaServed: [/* AREAS_SERVED */],
        description: "META_DESCRIPTION",
    };

    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }} />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusiness) }} />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(service) }} />
        </>
    );
}
```

Wire it into the landing page:

```tsx
// app/page.tsx
import { StructuredData } from "@/components/seo/structured-data";

export default function HomePage() {
    return (
        <>
            <StructuredData />
            {/* ...rest of page */}
        </>
    );
}
```

Validate post-deploy with [Schema.org Validator](https://validator.schema.org) and [Google's Rich Results Test](https://search.google.com/test/rich-results).

**Skip LocalBusiness** if it's a pure online business — using LocalBusiness without a real physical address you can actually visit will hurt you in Google's local manual review.

---

## Phase B — Content / on-page keyword optimisation

Trade abbreviations + clever-sounding copy for **the words customers actually type into Google**.

### B1. Hero H1

The H1 is the single most-weighted on-page signal. It must contain your primary keyword phrase.

- Lead with the trademarked / branded term, in full, on first use of the page.
- Use `<sup>®</sup>` for the symbol so it doesn't dominate visually.
- Subhead reinforces the full phrase rather than an abbreviation. Don't write "SRS consolidation" if the keyword is "Shared Reefer Services consolidation".

### B2. FAQ section + FAQPage JSON-LD

Long-tail conversational queries (what is X, how does X work, minimum order, vs alternative, etc.). Inline `FAQPage` JSON-LD next to the rendered HTML so Google can pull entries into:
- Rich results / "People Also Ask" carousel
- Featured snippets

```tsx
const FAQS = [
    { q: "Question phrased like a real search query?", a: "Answer that's a complete, standalone paragraph." },
    // 5–10 questions
];

const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map(({ q, a }) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: a },
    })),
};

// In JSX, beside the accordion UI:
<script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
```

**FAQ writing rules**:
- 5–10 entries. More than that dilutes ranking signal.
- Phrase questions exactly how a customer would type them — "what is", "how does", "do you", "what's the minimum".
- Answers are 2–4 sentences, complete on their own, naturally use the primary keyword once or twice.
- No marketing speak ("seamless", "best-in-class"). Plain English wins both with humans and with Google.

### B3. Footer audit

- Brand description rewritten to lead with the trademarked phrase.
- Trademark notice line: *"X® is a registered trademark of Y."*
- Copyright year auto-updates: `© {BUSINESS_NAME} · {LOCATION} · {new Date().getFullYear()}`.
- Logo `alt` text expanded from "X" → "X — TAGLINE" so it gets picked up in image search.
- At least one internal anchor link to the FAQ (`href="#faq"`) — internal linking helps the FAQ section accumulate authority.

### B4. Alt-text audit

Replace generic `alt="hero"` with descriptive alt text that includes a keyword where natural. Don't keyword-stuff — describe the image truthfully.

---

## Phase C — Tracking + verification

### C1. Env-driven verification meta tags

Already wired in §A1 via `metadata.verification`. The flow:

1. You go through manual GSC/Bing verification (see §7) and copy the verification token.
2. Set `GOOGLE_SITE_VERIFICATION` / `BING_SITE_VERIFICATION` in Vercel env vars.
3. Redeploy. Next renders the meta tag. Click "Verify" in the search console.

No code change needed when the token rotates — just update the env var.

### C2. Vercel Analytics + Speed Insights

```bash
npm install @vercel/analytics @vercel/speed-insights
```

In `app/layout.tsx`, mount the components in `<body>`:

```tsx
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body suppressHydrationWarning>
                {children}
                <Analytics />
                <SpeedInsights />
            </body>
        </html>
    );
}
```

- **Analytics** — page views, referrers, top pages. No cookies → no banner needed.
- **Speed Insights** — Core Web Vitals (LCP, CLS, INP) reported back per route. The signal that catches perf regressions before users complain.

Enable both in the Vercel dashboard's Analytics tab — until that toggle is on, no data shows even with the components mounted.

### C3. (Optional) GA4 / Plausible / Fathom

Skip unless explicitly asked. Vercel's first-party analytics covers what most sites need without a cookie banner. Adding GA4 means consent UX, more compliance work, and a heavier client bundle.

---

## 7. Manual steps (Claude can't do these)

### One-time, before launch

1. **Google Search Console** — visit [search.google.com/search-console](https://search.google.com/search-console), add the bare domain, choose **HTML tag** verification, copy the `content` value, set as `GOOGLE_SITE_VERIFICATION` in Vercel env, redeploy, click **Verify**.
2. **Submit sitemap in GSC** — Sitemaps → enter `sitemap.xml` → Submit. Google fetches `https://DOMAIN/sitemap.xml`.
3. **Bing Webmaster Tools** — [bing.com/webmasters](https://www.bing.com/webmasters). Easiest path: **Import from GSC** (one click). Otherwise manual meta-tag verification via the `BING_SITE_VERIFICATION` env hook.
4. **Vercel Analytics + Speed Insights** — Project → Analytics tab → enable both.
5. **OG image** at `public/og.png` — 1200×630 PNG. Placeholder fine for v1; ship a branded design before the public launch. Without it, LinkedIn/Slack/X share previews are blank.
6. **Favicon set** — use [realfavicongenerator.net](https://realfavicongenerator.net), upload your logo, download the bundle, drop these in `public/`:
   - `favicon.ico` (Next auto-serves this)
   - `icon.svg` (vector, retina-friendly)
   - `apple-touch-icon.png` (180×180)
   - `site.webmanifest`
   The `icons` map in `metadata` already references these — once the files exist, the 404s in DevTools disappear automatically.
7. **Google Business Profile** (if local) — [business.google.com](https://business.google.com). Verify the address. The address + geo in your LocalBusiness JSON-LD must match exactly.
8. **Canonical domain in Vercel** — mark either the bare apex or `www.` as primary so the other 301s to it. Mixed canonicals tank rankings.

### Ongoing (no code involved)

9. **LinkedIn company page** — fill it in, post once a week minimum. Becomes a `sameAs` link in Organization schema + a strong ranking signal.
10. **Backlinks** — get listed in industry directories, partner with niche publications for guest posts. Generic terms only rank with backlinks.
11. **Quarterly content** — one substantial blog/case study per quarter, targeting one secondary keyword each. Add the slug to the sitemap.
12. **Quarterly audit** — run a [Lighthouse](https://pagespeed.web.dev) report on the landing page. SEO score should stay ≥95. Vercel Speed Insights surfaces regressions in between audits.

---

## 8. Files Claude creates / modifies

| File | New? | Purpose |
|---|---|---|
| `app/layout.tsx` | modify | root metadata + viewport + Analytics mount |
| `app/page.tsx` | modify | landing-specific metadata override + StructuredData wiring |
| `app/sitemap.ts` | new | sitemap generator |
| `app/robots.ts` | new | robots policy |
| `components/seo/structured-data.tsx` | new | Organization + LocalBusiness + Service JSON-LD |
| `components/landing/faq-section.tsx` | new | FAQ accordion + FAQPage JSON-LD |
| `components/landing/footer.tsx` | modify | trademark notice + alt-text + auto-year + FAQ anchor |
| `components/landing/hero-section.tsx` (or whatever your H1 lives in) | modify | keyword-led H1 |
| `package.json` | modify | adds `@vercel/analytics` + `@vercel/speed-insights` |
| `public/og.png` | manual | the user supplies this (1200×630) |
| `public/icon.svg`, `apple-touch-icon.png`, `site.webmanifest` | manual | favicon set |

---

## 9. Env vars

| Var | Required? | Purpose |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | yes | Used by metadata `metadataBase` + canonical URL |
| `GOOGLE_SITE_VERIFICATION` | yes for GSC | Renders the meta tag for GSC verification. Unset → tag is omitted. |
| `BING_SITE_VERIFICATION` | yes for Bing | Same pattern for `msvalidate.01`. Unset → tag is omitted. |

That's it. Everything else is hardcoded in the metadata block or comes from `public/` assets.

---

## 10. Risk areas — read before shipping

### 1. Vercel preview deployments leaking into search results

Vercel auto-generates preview URLs like `your-project-git-feature-branch.vercel.app`. Without intervention, Googlebot can crawl + index them — confusing duplicate content for your production domain.

**Mitigation**: in `app/layout.tsx`, set robots `noindex` for non-production hosts:

```ts
const isProduction = process.env.VERCEL_ENV === "production";
robots: isProduction
    ? { index: true, follow: true, googleBot: { ... } }
    : { index: false, follow: false },
```

### 2. Verification meta tag missing in production

If you forget to set `GOOGLE_SITE_VERIFICATION` in **Production** env vars (not just Preview), the meta tag won't render and GSC verification fails with no error. Check the env scope every time.

### 3. Sitemap returning 200 but empty

If your sitemap generator throws server-side, Next returns a 200 with `<urlset></urlset>` (empty). Search Console accepts it but you get nothing indexed. **Test locally** via `curl http://localhost:3000/sitemap.xml` after every change to the generator.

### 4. JSON-LD parse errors

A single trailing comma or wrong `@type` makes the entire block invalid. Google silently ignores it — you lose all rich results but see no error. **Always** validate post-deploy via [Schema.org Validator](https://validator.schema.org) and [Rich Results Test](https://search.google.com/test/rich-results).

### 5. Mixed canonical (`www.` + apex)

If both `https://domain.com` and `https://www.domain.com` resolve and return 200, Google sees two sites with identical content. Ranking gets split between them. Pick one in Vercel Domains → mark as primary → the other 301s.

### 6. OG image 404s

A broken `/og.png` makes LinkedIn previews silently empty and Twitter cards fall back to the URL bar. Check DevTools → Network on the live URL: `/og.png` must return 200 (not 404, not 200-but-tiny-placeholder).

### 7. Manual penalty from over-optimisation

Stuffing keywords (the same phrase 15× on one page), hidden text, doorway pages, etc. → Google applies a manual penalty that takes months to lift. The playbook's *one* trademark symbol per page + 5–10 FAQs + natural language rules exist to keep you under the radar.

### 8. Sitemap declared in robots.txt but inaccessible

If `robots.txt` says `Sitemap: https://domain.com/sitemap.xml` and that URL 404s or 500s, Google logs a crawl error against the whole site (not just the sitemap). The Next convention prevents this if you use `app/sitemap.ts`, but worth a `curl` check before launch.

### 9. Indexing latency reality

First indexing after sitemap submit takes **1–7 days**. The "Coverage" report in GSC only updates daily. Don't panic when you don't see results in hour 1. Use **URL Inspection** in GSC to manually request indexing for the home page if you need to demo to a stakeholder fast.

### 10. Hardcoded production URL drift

If you hardcode `https://yourdomain.com` in OG tags, JSON-LD, sitemap, etc., changing domains later means a multi-file find-replace. **Always** use `process.env.NEXT_PUBLIC_APP_URL` (or `SITE_URL` constant derived from it) so a domain change is one env-var update.

---

## 11. Smoke test (after deploy + manual steps)

Walk this list in order. Each item is 30s to check.

1. **Sitemap**: `https://DOMAIN/sitemap.xml` → returns valid XML with every public route.
2. **Robots**: `https://DOMAIN/robots.txt` → shows disallow rules + sitemap pointer.
3. **JSON-LD blocks present**: `view-source:https://DOMAIN` → search for `application/ld+json` → at least three blocks (Organization, LocalBusiness, Service, FAQPage).
4. **Schema validates**: paste home URL into [validator.schema.org](https://validator.schema.org) → zero errors.
5. **Rich results detected**: paste home URL into [Rich Results Test](https://search.google.com/test/rich-results) → at least FAQ rich result detected.
6. **Lighthouse SEO ≥ 95**: run [pagespeed.web.dev](https://pagespeed.web.dev) on the home page → SEO score ≥ 95.
7. **OG preview**: paste URL into [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/) → image + title + description show correctly. Also test as a draft post on LinkedIn / WhatsApp / Slack for sanity.
8. **No favicon 404s**: open DevTools → Network on the home page → `/og.png`, `/favicon.ico`, `/icon.svg`, `/apple-touch-icon.png`, `/site.webmanifest` all return 200.
9. **GSC verified**: Search Console shows your domain as verified.
10. **Sitemap submitted in GSC**: Sitemaps tab shows your sitemap with `Last read` populated (within 24h).
11. **Indexed**: GSC Coverage report shows home URL as **Indexed** (takes 1–7 days post-sitemap-submit).
12. **Branded search wins**: search the trademarked term in Google → your site is #1 (takes a few days post-indexing).

---

## 12. Future SEO target — public CBM Calculator landing (project-specific example)

Below is a worked example of a follow-up phase for a logistics-style site, kept here as a pattern for "high-intent calculator → conversion funnel".

**Target queries** (high-intent, low-competition in a single region):
- `cbm calculator south africa`
- `shared container cbm`
- `lcl cbm calculator`
- `cargo volume calculator south africa`
- `chargeable weight calculator sea freight`
- `cube vs pallet container loading`

**Why this is worth doing**:
- The calculator is *the* gateway tool exporters reach for. Bring them to it for free, then convert via "Quote this on the network" + "Sign up to save calculations".
- Generic calculators on the web outrank you for the volume-only queries because they have the topical authority. Your differentiator — live carrier rates + actual containers on the client's lane — only shows up *after* sign-in. A public version surfaces that differentiator earlier.

**Scope when you get to it** (separate phase, not part of this playbook's core execution):
- New public route at `/tools/cbm-calculator` (server component) reusing the authed calculator in read-only-savings mode (calculation persists to localStorage, not the DB).
- Inline "Sign in to save this" + "Get a real quote" CTAs at strong scroll positions.
- Page-level metadata + FAQPage JSON-LD targeting the queries above.
- Sitemap entry; expected indexable within a week of launch.
- No paywalled features below the fold — Google will deprioritise a page that locks the substance behind auth.

**Out of scope for this future phase**:
- Bulk paste / CSV upload (auth-only — they leave PII traces).
- Saved-calculation library (auth-only by design).
- Sharing-by-link from the public page.

Adapt the same pattern to any "calculator / estimator / configurator" tool: high search intent + clear path-to-conversion + free utility above the fold.

---

## 13. What this playbook deliberately does NOT do

- **No GA4 / Plausible / Fathom integration** — Vercel Analytics covers it without a cookie banner.
- **No automated meta-description generation per page** — handcraft these. ML-generated descriptions tank CTR.
- **No prebuilding hundreds of programmatic SEO landing pages (pSEO)** — separate, much larger initiative with different rules.
- **No backlink outreach automation** — lives off-platform.
- **No A/B testing of titles / descriptions** — high effort, defer until baseline is ranking.
- **No hreflang multi-locale setup** — covered loosely via `openGraph.locale` but full hreflang matrices need their own phase.
- **No image lazy-loading audit** — Next handles this for `next/image`; if you're using `<img>`, that's a separate perf pass.

If you ask for any of these later, plan them as separate phases — don't fold into the playbook execution.

---

## 14. What I'd change next time

- **Add a `noindex` toggle for preview deployments** as the default, not an afterthought. Catch it before a preview URL accidentally outranks production.
- **Ship the OG image generator as code** (`@vercel/og`) for project-specific dynamic OG images per route — title text overlaid on a branded background. Removes the "design a static PNG" step entirely.
- **Add Server-Side Tracking** via a thin Vercel Analytics wrapper if conversion attribution becomes a real question (currently Vercel Analytics is page-views only; conversion events need GA4 or a custom event pipeline).
- **Build the public CBM-calculator-style landing earlier** — high-intent tools beat blog posts for SEO ROI in the first 90 days.
- **Track `Indexed` count over time** as a Vercel metric — if it drops, something broke in the sitemap or robots; you want an alert, not a quarterly check.

---

## License

Use this freely in your projects. No attribution required.
