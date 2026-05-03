import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { Footer } from "@/components/landing/footer"
import { TermsContent, TERMS_EFFECTIVE_LABEL, TERMS_VERSION } from "@/components/legal/terms-content"

export const metadata: Metadata = {
    title: "Terms and Conditions",
    description:
        "Terms and Conditions of Service for the Seairo Shared Reefer Services (SRS) platform. Binding agreement between Seairo Cargo (Pty) Ltd and the Shipper.",
    alternates: { canonical: "/terms" },
    robots: { index: true, follow: true },
}

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
            <header className="border-b border-slate-200 bg-white/80 backdrop-blur sticky top-0 z-30">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <Image
                            src="/seairo-logo.png"
                            alt="Seairo Cargo — Shared Reefer Services"
                            width={120}
                            height={40}
                            className="h-9 w-auto object-contain"
                            priority
                        />
                    </Link>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Legal
                    </span>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-12 sm:py-16">
                <div className="mb-10">
                    <p className="text-xs font-bold uppercase tracking-widest text-brand-blue">
                        Seairo Shared Reefer Services
                    </p>
                    <h1 className="mt-2 text-4xl sm:text-5xl font-black tracking-tight text-slate-900">
                        Terms and Conditions
                    </h1>
                    <p className="mt-3 text-sm text-slate-500">
                        {TERMS_EFFECTIVE_LABEL} · Version {TERMS_VERSION}
                    </p>
                </div>

                <article className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 shadow-sm">
                    <TermsContent />
                </article>

                <div className="mt-8 text-center text-sm text-slate-500">
                    Questions about these terms? Email{" "}
                    <a href="mailto:cat@seairocargo.co.za" className="text-brand-blue hover:underline">
                        cat@seairocargo.co.za
                    </a>
                </div>
            </main>

            <Footer />
        </div>
    )
}
