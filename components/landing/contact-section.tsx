'use client'

import { motion } from 'framer-motion'
import { Mail, MapPin, Phone, Send } from 'lucide-react'
import { useState } from 'react'

export function ContactSection() {
    const [formState, setFormState] = useState<'idle' | 'submitting' | 'success'>('idle')

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setFormState('submitting')
        // Simulate API call
        setTimeout(() => setFormState('success'), 1500)
    }

    const contactDetails = [
        {
            icon: MapPin,
            title: 'Global HQ',
            details: ['V&A Waterfront, Cape Town', 'South Africa, 8001'],
            color: 'text-brand-blue',
            bg: 'bg-brand-blue/10'
        },
        {
            icon: Mail,
            title: 'Email Us',
            details: ['bookings@seairo.com', 'support@seairo.com'],
            color: 'text-brand-orange',
            bg: 'bg-brand-orange/10'
        },
        {
            icon: Phone,
            title: 'Call Us',
            details: ['+27 (0) 21 555 0123', '24/7 Ops: +27 (0) 82 555 0199'],
            color: 'text-brand-blue',
            bg: 'bg-brand-blue/10'
        }
    ]

    return (
        <section id="contact" className="relative overflow-hidden bg-slate-50 py-24 lg:py-32">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:2rem_2rem] opacity-40" />

            <div className="relative z-10 mx-auto max-w-7xl px-6">
                <div className="grid gap-16 lg:grid-cols-2 lg:gap-12">

                    {/* Left Column: Content & Info */}
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                    >
                        <div className="mb-10 inline-flex items-center gap-2 rounded-full border border-brand-blue/30 bg-brand-blue/10 px-4 py-1.5 text-sm font-semibold text-brand-blue">
                            <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-blue opacity-75"></span>
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-blue"></span>
                            </span>
                            We are online
                        </div>

                        <h2 className="font-display text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
                            Ready to streamline your <br />
                            <span className="text-brand-blue">
                                cold chain logistics?
                            </span>
                        </h2>

                        <p className="mt-6 text-lg leading-relaxed text-slate-600">
                            Join the fastest growing network of food and perishable exporters using our digital twin technology.
                        </p>

                        <div className="mt-12 space-y-8">
                            {contactDetails.map((item, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: 0.2 + idx * 0.1 }}
                                    className="flex items-start gap-4"
                                >
                                    <div className={`mt-1 flex h-12 w-12 items-center justify-center rounded-xl border border-white/50 ${item.bg} backdrop-blur-sm`}>
                                        <item.icon className={`h-6 w-6 ${item.color}`} />
                                    </div>
                                    <div>
                                        <h3 className="font-display text-lg font-bold text-slate-900">{item.title}</h3>
                                        {item.details.map((line, i) => (
                                            <p key={i} className="text-slate-600">{line}</p>
                                        ))}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Right Column: Contact Form */}
                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="relative"
                    >
                        <div className="relative overflow-hidden rounded-3xl border border-white/50 bg-white/60 p-8 shadow-2xl backdrop-blur-xl lg:p-12">
                            <form onSubmit={handleSubmit} className="relative z-10 space-y-6">
                                <div className="grid gap-6 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <label htmlFor="first-name" className="text-sm font-semibold text-slate-700">First Name</label>
                                        <input
                                            id="first-name"
                                            type="text"
                                            required
                                            className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-brand-blue focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-blue/10"
                                            placeholder="Jane"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="last-name" className="text-sm font-semibold text-slate-700">Last Name</label>
                                        <input
                                            id="last-name"
                                            type="text"
                                            required
                                            className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-brand-blue focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-blue/10"
                                            placeholder="Doe"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="email" className="text-sm font-semibold text-slate-700">Email Address</label>
                                    <input
                                        id="email"
                                        type="email"
                                        required
                                        className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-brand-blue focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-blue/10"
                                        placeholder="jane@company.com"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="message" className="text-sm font-semibold text-slate-700">Message</label>
                                    <textarea
                                        id="message"
                                        rows={4}
                                        required
                                        className="w-full resize-none rounded-xl border border-slate-200 bg-white/50 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-brand-blue focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-blue/10"
                                        placeholder="Tell us about your shipping needs..."
                                    />
                                </div>

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    disabled={formState !== 'idle'}
                                    className="w-full rounded-xl bg-brand-blue px-8 py-4 font-display text-lg font-bold text-white shadow-lg shadow-brand-blue/25 transition-all hover:bg-brand-blue/90 hover:shadow-brand-blue/40 disabled:opacity-70"
                                >
                                    {formState === 'idle' ? (
                                        <span className="flex items-center justify-center gap-2">
                                            Send Message <Send className="h-5 w-5" />
                                        </span>
                                    ) : formState === 'submitting' ? (
                                        'Sending...'
                                    ) : (
                                        'Message Sent!'
                                    )}
                                </motion.button>
                            </form>
                        </div>

                        {/* Decor elements */}
                        <div className="absolute -right-8 -top-8 -z-10 h-64 w-64 rounded-full bg-brand-blue/20 blur-3xl" />
                        <div className="absolute -bottom-8 -left-8 -z-10 h-64 w-64 rounded-full bg-brand-orange/20 blur-3xl" />
                    </motion.div>
                </div>
            </div>
        </section>
    )
}
