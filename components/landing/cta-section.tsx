'use client'

import { motion, useInView } from 'framer-motion'
import { useRef, useState } from 'react'
import { ArrowRight, Sparkles } from 'lucide-react'
import { AuthPanel } from '../auth-panel'

export function CTASection() {
    const ref = useRef(null)
    const isInView = useInView(ref, { once: true, amount: 0.3 })
    const [isAuthOpen, setIsAuthOpen] = useState(false)

    return (
        <section ref={ref} className="relative overflow-hidden bg-slate-950 py-32">
            {/* Animated Background */}
            <div className="absolute inset-0">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(14,165,233,0.2),transparent_70%)]" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-10" />
            </div>

            {/* Gradient Orbs */}
            <div className="absolute left-1/4 top-0 h-96 w-96 animate-pulse rounded-full bg-blue-500/30 blur-3xl" />
            <div className="absolute bottom-0 right-1/4 h-96 w-96 animate-pulse rounded-full bg-cyan-500/30 blur-3xl" style={{ animationDelay: '1s' }} />

            <div className="relative z-10 mx-auto max-w-5xl px-6 text-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={isInView ? { opacity: 1, scale: 1 } : {}}
                    transition={{ duration: 0.6 }}
                >
                    {/* Badge */}
                    {/* <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 backdrop-blur-xl">
                        <Sparkles className="h-4 w-4 text-cyan-400" />
                        <span className="text-sm font-semibold text-cyan-400">Ready to Transform Your Logistics?</span>
                    </div> */}

                    {/* Headline */}
                    <h2 className="font-display text-6xl font-bold leading-tight tracking-tight text-white lg:text-7xl">
                        Start Shipping with
                        <br />
                        <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">
                            Confidence Today
                        </span>
                    </h2>

                    {/* Subheadline */}
                    <p className="mx-auto mt-6 max-w-2xl text-xl text-slate-300">
                        Join hundreds of exporters who trust Seairo for their cold chain logistics.
                        No setup fees. No hidden costs. Cancel anytime.
                    </p>

                    {/* CTA Buttons */}
                    <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:justify-center">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setIsAuthOpen(true)}
                            className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 px-12 py-6 font-display text-xl font-bold text-white shadow-2xl shadow-cyan-500/50"
                        >
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                Create Free Account
                                <ArrowRight className="h-6 w-6 transition-transform group-hover:translate-x-1" />
                            </span>
                            <motion.div
                                className="absolute inset-0 bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600"
                                initial={{ x: '100%' }}
                                whileHover={{ x: 0 }}
                                transition={{ duration: 0.3 }}
                            />
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="rounded-2xl border-2 border-white/20 bg-white/5 px-12 py-6 font-display text-xl font-bold text-white backdrop-blur-xl transition-all hover:border-white/40 hover:bg-white/10"
                        >
                            Schedule Demo
                        </motion.button>
                    </div>

                    {/* Trust Items */}
                    <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-400">
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-green-400" />
                            <span>Free 30-day trial</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-green-400" />
                            <span>No credit card required</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-green-400" />
                            <span>Setup in under 5 minutes</span>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Auth Panel */}
            <AuthPanel isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
        </section>
    )
}
