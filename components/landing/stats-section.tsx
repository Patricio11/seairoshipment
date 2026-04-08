'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { TrendingUp, Package, ThermometerSnowflake, Clock } from 'lucide-react'

const stats = [
    {
        icon: Package,
        value: '50K+',
        label: 'Pallets Shipped Annually',
        iconBg: 'bg-brand-blue',
        textColor: 'text-brand-blue',
    },
    {
        icon: TrendingUp,
        value: '99.8%',
        label: 'On-Time Delivery Rate',
        iconBg: 'bg-brand-orange',
        textColor: 'text-brand-orange',
    },
    {
        icon: ThermometerSnowflake,
        value: '-18°C',
        label: 'Perfect Cold Chain Maintained',
        iconBg: 'bg-brand-blue',
        textColor: 'text-brand-blue',
    },
    {
        icon: Clock,
        value: '24/7',
        label: 'Live Support & Monitoring',
        iconBg: 'bg-brand-orange',
        textColor: 'text-brand-orange',
    },
]

export function StatsSection() {
    const ref = useRef(null)
    const isInView = useInView(ref, { once: true, amount: 0.3 })

    return (
        <section ref={ref} className="relative overflow-hidden bg-white py-20 lg:py-24">
            {/* Subtle background */}
            <div className="absolute inset-0 bg-gradient-to-br from-brand-blue/5 to-brand-orange/5" />

            <div className="relative z-10 mx-auto max-w-7xl px-6">
                <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
                    {stats.map((stat, index) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={isInView ? { opacity: 1, scale: 1 } : {}}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            whileHover={{ y: -5, transition: { duration: 0.2 } }}
                            className="group relative"
                        >
                            <div className="relative overflow-hidden rounded-2xl border-2 border-slate-100 bg-white p-8 text-center shadow-sm transition-all hover:border-brand-blue/20 hover:shadow-xl">
                                {/* Icon */}
                                <div className="mx-auto mb-4 inline-flex items-center justify-center">
                                    <div className={`rounded-xl ${stat.iconBg} p-3 shadow-lg`}>
                                        <stat.icon className="h-6 w-6 text-white" strokeWidth={2.5} />
                                    </div>
                                </div>

                                {/* Value */}
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                                    transition={{ duration: 0.6, delay: index * 0.1 + 0.2 }}
                                    className={`font-display text-5xl font-bold ${stat.textColor}`}
                                >
                                    {stat.value}
                                </motion.div>

                                {/* Label */}
                                <p className="mt-3 text-sm font-semibold text-slate-600">
                                    {stat.label}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    )
}
