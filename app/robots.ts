import type { MetadataRoute } from "next"

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://seairo.com"

/**
 * Robots policy. Public landing pages are open; everything behind auth
 * (admin, dashboard, API) is disallowed so Google doesn't waste crawl
 * budget on routes that 401.
 */
export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: "*",
                allow: ["/"],
                disallow: [
                    "/admin",
                    "/admin/",
                    "/dashboard",
                    "/dashboard/",
                    "/api/",
                    "/auth/onboarding",
                    "/auth/verified",
                    "/auth/forgot-password",
                ],
            },
        ],
        sitemap: `${SITE_URL}/sitemap.xml`,
        host: SITE_URL,
    }
}
