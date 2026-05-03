import type { MetadataRoute } from "next"

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://seairo.com"

/**
 * Public sitemap. Only public-facing routes go here — `/admin/*`, `/dashboard/*`
 * and the API are gated and live behind login, so they're explicitly disallowed
 * in robots.ts and excluded from this list.
 */
export default function sitemap(): MetadataRoute.Sitemap {
    const now = new Date()

    return [
        {
            url: SITE_URL,
            lastModified: now,
            changeFrequency: "weekly",
            priority: 1.0,
        },
        {
            url: `${SITE_URL}/terms`,
            lastModified: now,
            changeFrequency: "yearly",
            priority: 0.3,
        },
    ]
}
