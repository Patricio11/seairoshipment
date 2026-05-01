import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://seairo.com";

export const metadata: Metadata = {
    metadataBase: new URL(SITE_URL),
    title: {
        default: "Seairo Cargo — Shared Reefer Services® for Cold-Chain Exporters",
        template: "%s | Seairo Cargo",
    },
    description:
        "Shared Reefer Services® from Cape Town to the world. IoT-monitored cold-chain consolidation for perishable and FMCG exporters. Real-time temperature tracking, automated compliance, transparent pricing.",
    applicationName: "Seairo Cargo",
    keywords: [
        "Shared Reefer Services",
        "shared reefer container",
        "cold chain logistics",
        "consolidated reefer shipping",
        "cape town reefer consolidation",
        "perishable exports south africa",
        "IoT temperature tracking",
        "FMCG exporter",
        "Seairo Cargo",
    ],
    authors: [{ name: "Seairo Cargo", url: SITE_URL }],
    creator: "Seairo Cargo",
    publisher: "Seairo Cargo",
    alternates: {
        canonical: "/",
    },
    openGraph: {
        type: "website",
        locale: "en_ZA",
        url: SITE_URL,
        siteName: "Seairo Cargo",
        title: "Seairo Cargo — Shared Reefer Services® for Cold-Chain Exporters",
        description:
            "IoT-monitored Shared Reefer Services® from Cape Town to the world. Consolidated cold-chain logistics for perishable and FMCG exporters.",
        images: [
            {
                url: "/og.png",
                width: 1200,
                height: 630,
                alt: "Seairo Cargo — Shared Reefer Services®",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: "Seairo Cargo — Shared Reefer Services® for Cold-Chain Exporters",
        description:
            "IoT-monitored cold-chain consolidation from Cape Town. Real-time tracking, automated compliance.",
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
        apple: [
            { url: "/apple-touch-icon.png", sizes: "180x180" },
        ],
    },
    manifest: "/site.webmanifest",
    category: "logistics",
    // Search Console verification — fill once you've verified the property
    verification: {
        google: process.env.GOOGLE_SITE_VERIFICATION,
        // Bing / Yandex / etc. → metadata.verification.other = { 'msvalidate.01': '...' }
        ...(process.env.BING_SITE_VERIFICATION
            ? { other: { "msvalidate.01": process.env.BING_SITE_VERIFICATION } }
            : {}),
    },
};

export const viewport: Viewport = {
    themeColor: "#2563eb",
    colorScheme: "light dark",
    width: "device-width",
    initialScale: 1,
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body
                className={`${inter.variable} ${outfit.variable} antialiased`}
                suppressHydrationWarning
            >
                {children}
                <Toaster position="top-right" richColors />
                <Analytics />
                <SpeedInsights />
            </body>
        </html>
    );
}
