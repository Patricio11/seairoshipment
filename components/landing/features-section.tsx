'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Package, Thermometer, FileCheck, Zap, Shield, DollarSign } from 'lucide-react'

const features = [
    {
        icon: Package,
        title: 'SRS Pallet Consolidation',
        description: 'Ship 5-20 pallets without paying for a full 40ft container. We consolidate perishable and FMCG exports from multiple shippers for maximum cost efficiency.',
        benefit: 'Save up to 40% vs FCL',
        industry: 'Ideal for seafood & perishables',
    },
    {
        icon: Thermometer,
        title: 'TIVE IoT Sensors',
        description: 'Every pallet gets a TIVE temperature tracker. Real-time alerts if temperature breaches -18°C during ocean transit.',
        benefit: '99.9% cold chain integrity',
        industry: 'Mandatory for frozen fish exports',
    },
    {
        icon: FileCheck,
        title: 'Automated Document Compliance',
        description: 'House Bill of Lading (HBL), Certificate of Analysis (CoA), and veterinary certificates. Blockchain-verified, auto-generated.',
        benefit: '100% customs compliance',
        industry: 'Required for EU/UK markets',
    },
    {
        icon: Zap,
        title: '3-Minute Booking',
        description: 'No phone calls. No emails. Select your route, date (21+ days), and pallet count. Instant price quote.',
        benefit: 'Book in under 3 minutes',
        industry: 'Replaces 2-hour manual process',
    },
    {
        icon: Shield,
        title: 'Pre-Departure Inspection',
        description: 'Our warehouse team inspects every pallet before loading. Photos sent to your dashboard. TIVE sensor activated on-site.',
        benefit: 'Zero damaged goods',
        industry: 'ISO 9001 certified facility',
    },
    {
        icon: DollarSign,
        title: 'Split Payment Options',
        description: '60% deposit on booking confirmation. Balance due on cargo arrival at destination port. Bank-grade encryption.',
        benefit: 'Cash flow friendly',
        industry: 'Industry-standard terms',
    },
]

export function IndustryFeatures() {
    const ref = useRef(null)
    const isInView = useInView(ref, { once: true, amount: 0.2 })

    return (
        <section id="features" ref={ref} className="relative overflow-hidden bg-white py-24 lg:py-32">
            {/* Subtle Pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-50" />

            <div className="relative z-10 mx-auto max-w-7xl px-6">
                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6 }}
                    className="text-center"
                >
                    <div className="mb-4 inline-block rounded-full bg-brand-blue/10 px-4 py-2 text-sm font-bold text-brand-blue">
                        Platform Capabilities
                    </div>
                    <h2 className="font-display text-4xl font-bold tracking-tight text-slate-900 lg:text-5xl">
                        Built for Perishable Exports
                    </h2>
                    <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
                        Purpose built for Perishable and FMCG exporters shipping to Europe, UK, Middle East and the world
                    </p>
                </motion.div>

                {/* Features Grid */}
                <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                    {features.map((feature, index) => (
                        <motion.div
                            key={feature.title}
                            initial={{ opacity: 0, y: 30 }}
                            animate={isInView ? { opacity: 1, y: 0 } : {}}
                            transition={{ duration: 0.6, delay: index * 0.1 }}
                            className="group relative"
                        >
                            <div className="relative h-full rounded-2xl border-2 border-slate-100 bg-white p-8 shadow-sm transition-all duration-300 hover:border-blue-200 hover:shadow-xl">
                                {/* Icon */}
                                <div className="mb-5 inline-flex items-center justify-center rounded-xl bg-gradient-to-br from-brand-blue to-brand-green p-3 shadow-lg shadow-brand-blue/20">
                                    <feature.icon className="h-6 w-6 text-white" strokeWidth={2.5} />
                                </div>

                                {/* Title */}
                                <h3 className="font-display text-xl font-bold text-slate-900">
                                    {feature.title}
                                </h3>

                                {/* Description */}
                                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                                    {feature.description}
                                </p>

                                {/* Benefit Tag */}
                                <div className="mt-4 inline-block rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                                    ✓ {feature.benefit}
                                </div>

                                {/* Industry Context */}
                                <p className="mt-3 text-xs font-semibold text-slate-400">
                                    {feature.industry}
                                </p>

                                {/* Hover Border Effect */}
                                <div className="absolute inset-0 rounded-2xl opacity-0 ring-2 ring-inset ring-blue-400 transition-opacity duration-300 group-hover:opacity-100" />
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Bottom CTA */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6, delay: 0.8 }}
                    className="mt-16 text-center"
                >
                    <p className="text-sm font-semibold text-slate-500">
                        Integrated with leading carriers
                    </p>
                    <div className="mt-6 flex flex-wrap items-center justify-center gap-8">
                        {['MSC', 'Maersk', 'CMA CGM', 'TIVE', 'Savino'].map((partner) => (
                            <div
                                key={partner}
                                className="font-display text-xl font-bold text-slate-300 transition-colors hover:text-blue-600"
                            >
                                {partner}
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </section>
    )
}
