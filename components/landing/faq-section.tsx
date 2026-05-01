'use client'

import { motion } from 'framer-motion'
import { ChevronDown, HelpCircle } from 'lucide-react'
import { useState } from 'react'

interface FAQ {
    q: string
    a: string
}

/**
 * Curated to target the long-tail queries shippers actually search
 * (e.g. "what is shared reefer service", "minimum pallets reefer shipping").
 * Pairs with the FAQPage JSON-LD below so Google can pull these into
 * featured snippets / People-Also-Ask blocks.
 */
const FAQS: FAQ[] = [
    {
        q: "What is Shared Reefer Services®?",
        a: "Shared Reefer Services® is Seairo Cargo's consolidated cold-chain shipping product. Multiple exporters share a single 40ft reefer container, splitting the cost while each pallet stays individually monitored end-to-end. It's perfect for shippers who don't fill a full container on their own but still need temperature-controlled ocean freight.",
    },
    {
        q: "How is Shared Reefer Services different from FCL?",
        a: "FCL (Full Container Load) means you pay for the entire container even if you only fill half. With Shared Reefer Services® you pay per-pallet — typically a minimum of 5 pallets — and we consolidate your cargo with other vetted shippers heading to the same port. You still get full reefer-grade temperature control and individual pallet tracking.",
    },
    {
        q: "What's the minimum order?",
        a: "5 pallets is the standard minimum for a Shared Reefer Services® booking. If a container has fewer than 5 spaces remaining we sometimes accept smaller bookings to fill it — it's worth getting in touch.",
    },
    {
        q: "Which routes do you operate?",
        a: "We run regular reefer consolidations from Cape Town (ZACPT) to Rotterdam, London Gateway, Hamburg, Antwerp, and other major European ports. Other routes are added on demand — if you have a destination in mind, contact us.",
    },
    {
        q: "How is temperature monitored?",
        a: "Every pallet carries a TIVE IoT tracker that streams temperature, humidity, location and shock-events back to our platform in real time. Both you and our team see live data through the dashboard, and breach alerts fire automatically if conditions drift outside spec.",
    },
    {
        q: "Do you handle customs and compliance?",
        a: "Yes. We handle the export documentation, work with your forwarder of choice on the destination side, and our platform automates document checklists per destination so nothing slips through. SAD500, Phytosanitary, COA, BoL — all tracked from the booking dashboard.",
    },
    {
        q: "How do I get started?",
        a: "Sign up at seairo.com — once your company is vetted (typically within one business day) you can book your first shared reefer container directly from the dashboard. We verify every account to make sure the network only carries serious, compliant exporters.",
    },
]

export function FAQSection() {
    const [openIndex, setOpenIndex] = useState<number | null>(0)

    // FAQPage JSON-LD — Google may surface these in rich results
    const faqSchema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: FAQS.map(({ q, a }) => ({
            "@type": "Question",
            name: q,
            acceptedAnswer: {
                "@type": "Answer",
                text: a,
            },
        })),
    }

    return (
        <section id="faq" className="relative bg-white py-24 lg:py-32">
            {/* JSON-LD for SEO */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
            />

            <div className="mx-auto max-w-4xl px-6">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center"
                >
                    <div className="inline-flex items-center gap-2 rounded-full border border-brand-blue/30 bg-brand-blue/10 px-4 py-1.5 text-sm font-semibold text-brand-blue">
                        <HelpCircle className="h-4 w-4" />
                        Frequently Asked Questions
                    </div>
                    <h2 className="mt-6 font-display text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
                        Everything you wanted to know about
                        <br />
                        <span className="text-brand-blue">Shared Reefer Services<sup className="text-[0.5em] ml-1">®</sup></span>
                    </h2>
                    <p className="mt-4 text-lg text-slate-600">
                        Quick answers — if you don&apos;t see yours, the contact form below is open.
                    </p>
                </motion.div>

                {/* Accordion */}
                <div className="mt-12 space-y-3">
                    {FAQS.map((faq, idx) => {
                        const isOpen = openIndex === idx
                        return (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 10 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.05 }}
                                className={`rounded-2xl border transition-colors ${
                                    isOpen
                                        ? 'border-brand-blue/40 bg-blue-50/40 shadow-sm'
                                        : 'border-slate-200 bg-white hover:border-slate-300'
                                }`}
                            >
                                <button
                                    type="button"
                                    onClick={() => setOpenIndex(isOpen ? null : idx)}
                                    className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                                    aria-expanded={isOpen}
                                >
                                    <span className="text-base font-bold text-slate-900 md:text-lg">{faq.q}</span>
                                    <ChevronDown
                                        className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-brand-blue' : ''}`}
                                    />
                                </button>
                                <motion.div
                                    initial={false}
                                    animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
                                    transition={{ duration: 0.25 }}
                                    className="overflow-hidden"
                                >
                                    <p className="px-6 pb-5 text-base leading-relaxed text-slate-600">{faq.a}</p>
                                </motion.div>
                            </motion.div>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
