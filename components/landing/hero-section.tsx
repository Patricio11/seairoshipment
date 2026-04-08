'use client'

import { useRef, useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Ship, Thermometer, MapPin, ArrowRight } from 'lucide-react'
import { AuthPanel } from '../auth-panel'

export function IndustryHero() {
    const [hoveredStat, setHoveredStat] = useState<number | null>(null)
    const [isAuthOpen, setIsAuthOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ['start start', 'end start']
    })

    const y = useTransform(scrollYProgress, [0, 1], [0, 200])
    const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])

    const stats = [
        { icon: Ship, value: '-18°C', label: 'Temperature Controlled', iconBg: 'bg-brand-blue', textColor: 'text-brand-blue' },
        { icon: Thermometer, value: '100%', label: 'TIVE IoT Monitored', iconBg: 'bg-brand-orange', textColor: 'text-brand-orange' },
        { icon: MapPin, value: '200+', label: 'Global Destinations', iconBg: 'bg-brand-blue', textColor: 'text-brand-blue' },
    ]

    return (
        <>
            <section ref={ref} className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 pt-20">
                {/* Video Background */}
                <div className="absolute inset-0">
                    <video
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="h-full w-full object-cover"
                        poster="/video-poster.jpg"
                    >
                        <source src="/cargo-ship.mp4" type="video/mp4" />
                    </video>
                    {/* Dark overlay for text readability */}
                    <div className="absolute inset-0 bg-gradient-to-b from-slate-900/70 via-blue-950/60 to-slate-900/80" />
                </div>

                {/* Content Overlay */}
                <motion.div
                    style={{ y, opacity }}
                    className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center"
                >
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="max-w-5xl"
                    >
                        {/* Industry Badge Spacer - Preserves layout */}
                        <div className="h-10 mb-6" />

                        {/* Headline */}
                        <h1 className="font-display text-6xl font-bold leading-[1.1] tracking-tight text-white md:text-7xl lg:text-8xl">
                            The Operating System
                            <br />
                            <span className="relative inline-block">
                                {/* Brand Color Gradient */}
                                <span className="text-brand-orange">
                                    for Cold Chain
                                </span>
                                <motion.div
                                    initial={{ scaleX: 0 }}
                                    animate={{ scaleX: 1 }}
                                    transition={{ duration: 1, delay: 0.5 }}
                                    className="absolute -bottom-2 left-0 h-1 w-full origin-left rounded-full bg-brand-orange"
                                />
                            </span>
                        </h1>

                        {/* Subheadline */}
                        <p className="mx-auto mt-8 max-w-3xl text-xl leading-relaxed text-slate-300 lg:text-2xl">
                            <strong className="text-white">SRS consolidation</strong> from Cape Town to the world.{' '}
                            <strong className="text-white">IoT temperature tracking</strong> on every pallet.{' '}
                            <strong className="text-white">Automated compliance</strong> for perishable and FMCG exports.
                        </p>

                        {/* CTA Button */}
                        <div className="mt-12 flex justify-center">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setIsAuthOpen(true)}
                                className="group relative overflow-hidden rounded-xl bg-brand-blue px-10 py-5 font-display text-lg font-bold text-white shadow-2xl shadow-brand-blue/40 hover:bg-brand-blue/90"
                            >
                                <span className="relative z-10 flex items-center justify-center gap-2">
                                    Book Your First Shipment
                                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                                </span>
                            </motion.button>
                        </div>

                        {/* Stats Cards */}
                        <div className="mt-16 grid gap-6 sm:grid-cols-3">
                            {stats.map((stat, index) => (
                                <motion.div
                                    key={stat.label}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.6, delay: 0.8 + index * 0.15 }}
                                    onHoverStart={() => setHoveredStat(index)}
                                    onHoverEnd={() => setHoveredStat(null)}
                                    className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl transition-all hover:bg-white/10"
                                >
                                    <div className={`mb-3 inline-flex rounded-xl ${stat.iconBg} p-3`}>
                                        <stat.icon className="h-6 w-6 text-white" strokeWidth={2.5} />
                                    </div>
                                    <div className={`font-display text-4xl font-bold ${stat.textColor}`}>
                                        {stat.value}
                                    </div>
                                    <div className="mt-1 text-sm font-semibold text-slate-400">{stat.label}</div>

                                    {/* Hover Glow */}
                                    <div className={`absolute inset-0 ${stat.iconBg} opacity-0 blur-2xl transition-opacity duration-500 ${hoveredStat === index ? 'opacity-20' : ''}`} />
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </motion.div>

                {/* Bottom Gradient */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white to-transparent" />
            </section>

            {/* Auth Panel */}
            <AuthPanel isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} initialMode="signup" />
        </>
    )
}
