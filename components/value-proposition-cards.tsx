'use client'

import { motion } from 'framer-motion'
import { Layers, Thermometer, ShieldCheck, ArrowRight } from 'lucide-react'

const features = [
    {
        icon: Layers,
        title: 'SRS Consolidation',
        description: 'Optimize costs with intelligent pallet-level groupage. Full container efficiency, SRS flexibility.',
        gradient: 'from-blue-500 to-cyan-500',
    },
    {
        icon: Thermometer,
        title: 'IoT Temperature Tracking',
        description: 'Real-time TIVE sensor monitoring. Never lose product integrity. Live alerts on every degree.',
        gradient: 'from-cyan-500 to-teal-500',
    },
    {
        icon: ShieldCheck,
        title: 'Automated Compliance',
        description: 'HBL, CoA, and veterinary certificates. Blockchain-verified documentation at every milestone.',
        gradient: 'from-teal-500 to-emerald-500',
    },
]

export function ValuePropositionCards() {
    return (
        <section className="relative py-32">
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950/90 via-blue-950/50 to-slate-950" />

            <div className="relative z-10 mx-auto max-w-7xl px-6">
                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center"
                >
                    <h2 className="font-display text-5xl font-bold tracking-tight text-white lg:text-6xl">
                        Why Seairo is{' '}
                        <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                            Different
                        </span>
                    </h2>
                    <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-400">
                        We&apos;re not a freight forwarder. We&apos;re a logistics operating system.
                    </p>
                </motion.div>

                {/* Cards Grid */}
                <div className="mt-16 grid gap-8 md:grid-cols-3">
                    {features.map((feature, index) => (
                        <motion.div
                            key={feature.title}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: index * 0.2 }}
                            whileHover={{ y: -8, transition: { duration: 0.3 } }}
                            className="group relative"
                        >
                            {/* Glassmorphic Card */}
                            <div className="relative h-full overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-8 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:border-white/20 hover:shadow-blue-500/20">
                                {/* Gradient Glow Effect */}
                                <div
                                    className={`absolute -top-24 -right-24 h-48 w-48 rounded-full bg-gradient-to-br ${feature.gradient} opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-20`}
                                />

                                {/* Icon */}
                                <div className={`relative inline-flex rounded-2xl bg-gradient-to-br ${feature.gradient} p-4 shadow-lg`}>
                                    <feature.icon className="h-8 w-8 text-white" strokeWidth={2} />
                                </div>

                                {/* Content */}
                                <h3 className="mt-6 font-display text-2xl font-bold text-white">
                                    {feature.title}
                                </h3>
                                <p className="mt-3 text-base leading-relaxed text-slate-400">
                                    {feature.description}
                                </p>

                                {/* Hover Arrow */}
                                <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-cyan-400 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                                    <span>Explore feature</span>
                                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                                </div>

                                {/* Border Gradient on Hover */}
                                <div className="absolute inset-0 rounded-3xl opacity-0 ring-2 ring-inset ring-cyan-400/50 transition-opacity duration-300 group-hover:opacity-100" />
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    )
}
