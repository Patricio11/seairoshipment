/**
 * JSON-LD structured data for the landing page.
 * Renders Organization + LocalBusiness + Service schemas so Google can
 * surface a knowledge panel, business address, and rich-result service entry.
 *
 * Lives as a server component so the JSON is in the initial HTML — Googlebot
 * doesn't need to execute JS to read it.
 */

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://seairo.com";

const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: "Seairo Cargo",
    legalName: "Seairo Cargo",
    url: SITE_URL,
    logo: `${SITE_URL}/icon.svg`,
    description:
        "Cold-chain logistics platform offering Shared Reefer Services® consolidation from Cape Town to global destinations.",
    foundingDate: "2024",
    contactPoint: [
        {
            "@type": "ContactPoint",
            contactType: "customer service",
            email: "cat@seairocargo.co.za",
            telephone: "+27-72-261-7325",
            areaServed: ["ZA", "NL", "GB", "DE", "IE", "FR", "BE"],
            availableLanguage: ["English"],
        },
        {
            "@type": "ContactPoint",
            contactType: "sales",
            email: "cat@seairocargo.co.za",
            areaServed: ["ZA"],
        },
    ],
    sameAs: [
        // Fill these in once social profiles are live
        // "https://www.linkedin.com/company/seairo-cargo",
        // "https://twitter.com/seairocargo",
    ],
}

const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${SITE_URL}/#localbusiness`,
    name: "Seairo Cargo",
    image: `${SITE_URL}/og.png`,
    url: SITE_URL,
    telephone: "+27-72-261-7325",
    priceRange: "$$",
    address: {
        "@type": "PostalAddress",
        addressLocality: "Cape Town",
        addressRegion: "Western Cape",
        postalCode: "8001",
        addressCountry: "ZA",
    },
    geo: {
        "@type": "GeoCoordinates",
        latitude: -33.9249,
        longitude: 18.4241,
    },
    openingHoursSpecification: [
        {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
            opens: "08:00",
            closes: "17:00",
        },
    ],
}

const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${SITE_URL}/#service-srs`,
    name: "Shared Reefer Services®",
    serviceType: "Cold-chain ocean freight consolidation",
    provider: { "@id": `${SITE_URL}/#organization` },
    areaServed: {
        "@type": "Country",
        name: "South Africa",
    },
    audience: {
        "@type": "BusinessAudience",
        audienceType: "Perishable and FMCG exporters",
    },
    description:
        "Shared Reefer Services® lets multiple shippers consolidate temperature-controlled cargo into a single 40ft reefer container. Each pallet is monitored end-to-end with TIVE IoT trackers, and clients see live ocean tracking, customs status, and document downloads from one dashboard.",
    offers: {
        "@type": "AggregateOffer",
        priceCurrency: "ZAR",
        availability: "https://schema.org/InStock",
    },
}

export function StructuredData() {
    const blocks = [organizationSchema, localBusinessSchema, serviceSchema]
    return (
        <>
            {blocks.map((block, i) => (
                <script
                    key={i}
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(block) }}
                />
            ))}
        </>
    )
}
