'use client'

import { motion, useInView } from 'framer-motion'
import { useRef, useState } from 'react'
import { Star, ChevronLeft, ChevronRight, Quote } from 'lucide-react'

const testimonials = [
    {
        name: 'Sarah van der Merwe',
        role: 'Export Manager',
        company: 'Atlantic Seafood SA',
        image: '👩‍💼',
        rating: 5,
        quote: 'Before Seairo, we lost 15% of shipments to temperature breaches. Now with TIVE tracking, we have 99.9% cold chain integrity. Game changer for our London route.',
        metric: '99.9% integrity',
        location: 'Cape Town → London',
    },
    {
        name: 'Michael Chen',
        role: 'Operations Director',
        company: 'Premium Perishables',
        image: '👨‍💼',
        rating: 5,
        quote: 'The 21-day advance booking rule seemed strict, but it actually forced us to plan better. Combined with automated HBL generation, we cut admin time by 80%.',
        metric: '80% time saved',
        location: 'Cape Town → Antwerp',
    },
    {
        name: 'Emma Botha',
        role: 'CFO',
        company: 'Cape Fresh Exports',
        image: '👩',
        rating: 5,
        quote: 'Split payment (60/40) was crucial for our cash flow. Used to pay 100% upfront with other forwarders. Seairo gets the logistics side of our business.',
        metric: 'R50K monthly savings',
        location: 'Cape Town → Ashdod',
    },
]

export function TestimonialsSection() {
    const ref = useRef(null)
    const isInView = useInView(ref, { once: true, amount: 0.2 })
    const [currentIndex, setCurrentIndex] = useState(0)

    const next = () => setCurrentIndex((i) => (i + 1) % testimonials.length)
    const prev = () => setCurrentIndex((i) => (i - 1 + testimonials.length) % testimonials.length)

    return (
        <section ref={ref} className="relative overflow-hidden bg-slate-50 py-24 lg:py-32">
            <div className="relative z-10 mx-auto max-w-7xl px-6">
                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6 }}
                    className="text-center"
                >
                    <div className="mb-4 inline-block rounded-full bg-purple-50 px-4 py-2 text-sm font-bold text-purple-700">
                        Customer Success Stories
                    </div>
                    <h2 className="font-display text-4xl font-bold tracking-tight text-slate-900 lg:text-5xl">
                        Trusted by Cape Town Exporters
                    </h2>
                    <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
                        Real results from seafood and perishable goods companies
                    </p>
                </motion.div>

                {/* Carousel */}
                <div className="relative mt-16">
                    <div className="overflow-hidden">
                        <motion.div
                            key={currentIndex}
                            initial={{ opacity: 0, x: 100 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -100 }}
                            transition={{ duration: 0.5 }}
                            className="mx-auto max-w-4xl"
                        >
                            <div className="relative rounded-2xl border-2 border-slate-200 bg-white p-12 shadow-xl">
                                {/* Quote Icon */}
                                <div className="absolute -top-6 left-12">
                                    <div className="rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 p-4 shadow-lg">
                                        <Quote className="h-7 w-7 text-white" />
                                    </div>
                                </div>

                                {/* Rating */}
                                <div className="mb-6 flex gap-1">
                                    {[...Array(testimonials[currentIndex].rating)].map((_, i) => (
                                        <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                                    ))}
                                </div>

                                {/* Quote */}
                                <blockquote className="text-2xl font-medium leading-relaxed text-slate-900">
                                    "{testimonials[currentIndex].quote}"
                                </blockquote>

                                {/* Metrics */}
                                <div className="mt-6 flex flex-wrap gap-3">
                                    <div className="rounded-full bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-2 text-sm font-bold text-emerald-700">
                                        ✓ {testimonials[currentIndex].metric}
                                    </div>
                                    <div className="rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">
                                        📍 {testimonials[currentIndex].location}
                                    </div>
                                </div>

                                {/* Author */}
                                <div className="mt-8 flex items-center gap-4">
                                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-3xl shadow-lg">
                                        {testimonials[currentIndex].image}
                                    </div>
                                    <div>
                                        <div className="font-display text-lg font-bold text-slate-900">
                                            {testimonials[currentIndex].name}
                                        </div>
                                        <div className="text-sm text-slate-600">
                                            {testimonials[currentIndex].role} · {testimonials[currentIndex].company}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Navigation */}
                    <div className="mt-8 flex items-center justify-center gap-4">
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={prev}
                            className="rounded-full border-2 border-slate-200 bg-white p-3 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
                        >
                            <ChevronLeft className="h-6 w-6 text-slate-600" />
                        </motion.button>

                        {/* Dots */}
                        <div className="flex gap-2">
                            {testimonials.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => setCurrentIndex(index)}
                                    className={`h-2 rounded-full transition-all ${index === currentIndex
                                            ? 'w-8 bg-gradient-to-r from-blue-500 to-cyan-500'
                                            : 'w-2 bg-slate-300 hover:bg-slate-400'
                                        }`}
                                />
                            ))}
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={next}
                            className="rounded-full border-2 border-slate-200 bg-white p-3 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
                        >
                            <ChevronRight className="h-6 w-6 text-slate-600" />
                        </motion.button>
                    </div>
                </div>
            </div>
        </section>
    )
}
