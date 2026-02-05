'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Calendar, PackageCheck, Ship, CheckCircle2 } from 'lucide-react'

const steps = [
    {
        icon: Calendar,
        title: 'Book Shipment Online',
        description: 'Choose route (CPT → London/Antwerp/Ashdod), select sailing date (21+ days), specify pallet count (5-20). Instant pricing.',
        timeline: '3 minutes',
        action: 'Digital booking form',
    },
    {
        icon: PackageCheck,
        title: 'Inspection & Load',
        description: 'Deliver pallets to Del Bene warehouse. Our team inspects, photographs, and attaches TIVE sensors. Container loaded.',
        timeline: '24-48 hours',
        action: 'Warehouse coordination',
    },
    {
        icon: Ship,
        title: 'Ocean Transit + Monitoring',
        description: 'Track container location & temperature in real-time from dashboard. Automated alerts if temp exceeds -18°C. ETA updates.',
        timeline: '21-35 days',
        action: 'Live IoT tracking',
    },
    {
        icon: CheckCircle2,
        title: 'Arrival & Clearance',
        description: 'Automated customs clearance with pre-verified documents. Final payment triggered. Cargo released to your consignee.',
        timeline: 'On arrival',
        action: 'Automated process',
    },
]

export function ProcessTimeline() {
    const ref = useRef(null)
    const isInView = useInView(ref, { once: true, amount: 0.2 })

    return (
        <section id="how-it-works" ref={ref} className="relative overflow-hidden bg-slate-50 py-24 lg:py-32">
            <div className="relative z-10 mx-auto max-w-7xl px-6">
                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6 }}
                    className="text-center"
                >
                    <div className="mb-4 inline-block rounded-full bg-brand-blue/10 px-4 py-2 text-sm font-bold text-brand-blue">
                        The Process
                    </div>
                    <h2 className="font-display text-4xl font-bold tracking-tight text-slate-900 lg:text-5xl">
                        From Booking to Delivery
                    </h2>
                    <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
                        The entire cold chain journey, managed through one platform
                    </p>
                </motion.div>

                {/* Timeline */}
                <div className="relative mt-20">
                    {/* Connecting Line - Desktop */}
                    <div className="absolute left-1/2 top-12 bottom-12 hidden w-1 -translate-x-1/2 bg-gradient-to-b from-brand-blue via-brand-green to-emerald-500 lg:block" />

                    {/* Steps */}
                    <div className="space-y-16 lg:space-y-24">
                        {steps.map((step, index) => (
                            <motion.div
                                key={step.title}
                                initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                                animate={isInView ? { opacity: 1, x: 0 } : {}}
                                transition={{ duration: 0.7, delay: index * 0.2 }}
                                className={`relative flex flex-col gap-8 lg:flex-row lg:items-center ${index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'
                                    }`}
                            >
                                {/* Content Card */}
                                <div className={`flex-1 ${index % 2 === 0 ? 'lg:text-right' : 'lg:text-left'}`}>
                                    <div className="rounded-2xl border-2 border-slate-200 bg-white p-8 shadow-lg">
                                        {/* Step Number & Timeline */}
                                        <div className={`mb-4 flex items-center gap-3 ${index % 2 === 0 ? 'lg:justify-end' : 'lg:justify-start'}`}>
                                            <span className="rounded-full bg-gradient-to-r from-brand-blue to-brand-green px-4 py-1.5 text-sm font-bold text-white">
                                                {step.timeline}
                                            </span>
                                            <span className="font-display text-5xl font-bold text-slate-100">
                                                {String(index + 1).padStart(2, '0')}
                                            </span>
                                        </div>

                                        {/* Title */}
                                        <h3 className="font-display text-2xl font-bold text-slate-900">
                                            {step.title}
                                        </h3>

                                        {/* Description */}
                                        <p className="mt-3 leading-relaxed text-slate-600">
                                            {step.description}
                                        </p>

                                        {/* Action Tag */}
                                        <div className={`mt-4 inline-block rounded-full bg-brand-blue/10 px-3 py-1 text-xs font-bold text-brand-blue`}>
                                            → {step.action}
                                        </div>
                                    </div>
                                </div>

                                {/* Icon Circle */}
                                <div className="relative flex-shrink-0 lg:absolute lg:left-1/2 lg:-translate-x-1/2">
                                    <motion.div
                                        whileHover={{ scale: 1.15, rotate: 10 }}
                                        className="relative z-10 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-blue to-brand-green shadow-2xl shadow-brand-blue/40"
                                    >
                                        <step.icon className="h-9 w-9 text-white" strokeWidth={2.5} />
                                    </motion.div>
                                    <div className="absolute inset-0 animate-ping rounded-2xl bg-blue-400 opacity-20" />
                                </div>

                                {/* Spacer for Desktop */}
                                <div className="hidden flex-1 lg:block" />
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}
