'use client'

import { AnimatePresence, motion, useInView } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
    Boxes, Sparkles, Leaf, Container, ArrowRight, Wine, Apple, Award, Wrench,
    Calculator, Share2, FileDown, Layers,
} from 'lucide-react'
import {
    itemCbm,
    fitInStandardContainers,
    smallestFitContainer,
    palletEquivalent,
    volumetricWeightSea,
    sustainabilityScore,
    formatCbm,
    formatKg,
    type StandardContainer,
} from '@/lib/cbm'
import Link from 'next/link'
import { AuthPanel } from '../auth-panel'

/* -------------------------------------------------------------------------- */
/* Showcase data - fixed, non-interactive. Designed to look great at a glance. */
/* -------------------------------------------------------------------------- */

interface ShowcaseItem {
    description: string
    quantity: number
    lengthMm: number
    widthMm: number
    heightMm: number
    weightKg: number
}

interface Preset {
    id: string
    label: string
    summary: string
    icon: typeof Wine
    accent: string // tailwind colour token for the row accent
    items: ShowcaseItem[]
}

const PRESETS: Preset[] = [
    {
        id: 'wine',
        label: 'Wine consolidation',
        summary: '60 × 12-bottle cases',
        icon: Wine,
        accent: 'rose',
        items: [
            { description: 'Wine 12-bottle case (750ml)', quantity: 60, lengthMm: 350, widthMm: 300, heightMm: 230, weightKg: 16 },
        ],
    },
    {
        id: 'citrus',
        label: 'Citrus mixed cartons',
        summary: '80 × 15kg cartons',
        icon: Apple,
        accent: 'orange',
        items: [
            { description: 'Citrus 15kg carton', quantity: 80, lengthMm: 400, widthMm: 300, heightMm: 270, weightKg: 15 },
        ],
    },
    {
        id: 'trophy',
        label: 'Hunting trophies',
        summary: '8 crates + 6 export boxes',
        icon: Award,
        accent: 'amber',
        items: [
            { description: 'Standard trophy crate', quantity: 8, lengthMm: 1200, widthMm: 800, heightMm: 800, weightKg: 45 },
            { description: 'Skull/horn export box', quantity: 6, lengthMm: 800, widthMm: 600, heightMm: 600, weightKg: 25 },
        ],
    },
    {
        id: 'mixed',
        label: 'Mixed industrial',
        summary: '24 drums + 40 cartons',
        icon: Wrench,
        accent: 'slate',
        items: [
            { description: 'Industrial drum (200L)', quantity: 24, lengthMm: 580, widthMm: 580, heightMm: 880, weightKg: 25 },
            { description: 'Standard double-wall carton', quantity: 40, lengthMm: 400, widthMm: 400, heightMm: 400, weightKg: 10 },
        ],
    },
]

const CONTAINER_LABEL: Record<StandardContainer, string> = {
    '20ft': '20ft',
    '40ft': '40ft',
    '40ftHC': '40ft HC',
}

const CYCLE_MS = 5000

/* -------------------------------------------------------------------------- */
/* Section                                                                    */
/* -------------------------------------------------------------------------- */

export function CBMCalculatorSection() {
    const ref = useRef<HTMLDivElement>(null)
    const isInView = useInView(ref, { once: true, amount: 0.15 })

    const [isAuthOpen, setIsAuthOpen] = useState(false)

    // Auto-cycle through preset examples for visual interest. Not user-driven.
    const [presetIdx, setPresetIdx] = useState(0)
    useEffect(() => {
        if (!isInView) return
        const id = setInterval(() => setPresetIdx(i => (i + 1) % PRESETS.length), CYCLE_MS)
        return () => clearInterval(id)
    }, [isInView])

    const preset = PRESETS[presetIdx]

    const totals = useMemo(() => {
        const cbm = preset.items.reduce((s, it) => s + itemCbm(it), 0)
        const weightKg = preset.items.reduce((s, it) => s + it.weightKg * it.quantity, 0)
        const fits = fitInStandardContainers(cbm)
        const smallest = smallestFitContainer(cbm)
        const pallets = palletEquivalent(cbm)
        const volumetricKg = volumetricWeightSea(cbm)
        const sus = sustainabilityScore(weightKg, cbm)
        return { cbm, weightKg, fits, smallest, pallets, volumetricKg, sus }
    }, [preset])

    return (
        <section id="cbm-calculator" ref={ref} className="relative overflow-hidden bg-slate-50 py-24 lg:py-32">
            {/* Background flourishes */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-40" />
            <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-brand-blue/5 blur-3xl" />
            <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-emerald-500/5 blur-3xl" />

            <div className="relative z-10 mx-auto max-w-7xl px-6">
                {/* Section header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6 }}
                    className="text-center"
                >
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-brand-blue/10 px-4 py-2 text-sm font-bold text-brand-blue">
                        <Sparkles className="h-3.5 w-3.5" />
                        Inside the Seairo platform
                    </div>
                    <h2 className="font-display text-4xl font-bold tracking-tight text-slate-900 lg:text-5xl">
                        Know Exactly What Fits Before You Book
                    </h2>
                    <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
                        Our built-in CBM calculator turns a list of cartons, drums, or crates into the answers exporters actually need: how many m³, which container fits, and what it&apos;ll cost on the SRS network.
                    </p>
                </motion.div>

                {/* Calculator showcase card */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.7, delay: 0.15 }}
                    className="mt-12 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/5"
                >
                    {/* Header strip with cycling preset label */}
                    <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/60 px-6 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-10">
                        <div className="flex items-center gap-3">
                            <div className="rounded-xl bg-brand-blue/10 p-2 text-brand-blue">
                                <Calculator className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Sample calculation</p>
                                <AnimatePresence mode="wait">
                                    <motion.p
                                        key={preset.id}
                                        initial={{ opacity: 0, y: 4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -4 }}
                                        transition={{ duration: 0.3 }}
                                        className="text-sm font-bold text-slate-900"
                                    >
                                        {preset.label}
                                    </motion.p>
                                </AnimatePresence>
                            </div>
                        </div>
                        {/* Preset dots - purely decorative progress indicator */}
                        <div className="flex items-center gap-1.5">
                            {PRESETS.map((p, i) => {
                                const Icon = p.icon
                                const active = i === presetIdx
                                return (
                                    <span
                                        key={p.id}
                                        aria-hidden
                                        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold transition-all ${
                                            active
                                                ? 'bg-brand-blue text-white shadow-sm shadow-brand-blue/20'
                                                : 'bg-white text-slate-400 ring-1 ring-slate-200'
                                        }`}
                                    >
                                        <Icon className="h-3 w-3" />
                                        {active && <span className="hidden sm:inline">{p.summary}</span>}
                                    </span>
                                )
                            })}
                        </div>
                    </div>

                    <div className="grid lg:grid-cols-[1.1fr_1fr]">
                        {/* LEFT - sample item list (read-only) */}
                        <div className="border-b border-slate-100 p-6 lg:border-b-0 lg:border-r lg:p-10">
                            <div className="mb-4 flex items-center gap-2 text-brand-blue">
                                <Boxes className="h-4 w-4" />
                                <span className="text-xs font-bold uppercase tracking-wider">Cargo</span>
                            </div>

                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={preset.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 10 }}
                                    transition={{ duration: 0.35 }}
                                    className="space-y-2.5"
                                >
                                    {preset.items.map((item, idx) => (
                                        <SampleItemCard key={`${preset.id}-${idx}`} item={item} />
                                    ))}
                                </motion.div>
                            </AnimatePresence>

                            {/* Sign-up nudge */}
                            <div className="mt-6 rounded-2xl border-2 border-dashed border-brand-blue/30 bg-brand-blue/[0.04] p-4">
                                <p className="text-xs font-bold uppercase tracking-wider text-brand-blue">Measure your own cargo</p>
                                <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
                                    Add unlimited items, save calculations, share a read-only link with your consignee, and one-click into a real SRS booking - all inside the dashboard.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setIsAuthOpen(true)}
                                    className="group mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-brand-blue hover:underline"
                                >
                                    Create a free account
                                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                                </button>
                            </div>
                        </div>

                        {/* RIGHT - live results */}
                        <div className="bg-slate-50/30 p-6 lg:p-10">
                            {/* Hero stat */}
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={preset.id}
                                    initial={{ opacity: 0, scale: 0.97 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.97 }}
                                    transition={{ duration: 0.35 }}
                                    className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white shadow-xl shadow-slate-900/10"
                                >
                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total volume</p>
                                    <p className="mt-1 font-display text-5xl font-black tabular-nums">
                                        {totals.cbm.toFixed(2)}
                                        <span className="ml-2 text-2xl text-slate-400">m³</span>
                                    </p>
                                    <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-700 pt-4 text-sm">
                                        <div>
                                            <p className="text-[11px] uppercase font-semibold text-slate-400">Pallet equivalent</p>
                                            <p className="mt-0.5 font-mono font-bold tabular-nums">≈ {totals.pallets.toFixed(1)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] uppercase font-semibold text-slate-400">Chargeable (sea)</p>
                                            <p className="mt-0.5 font-mono font-bold tabular-nums">{formatKg(totals.volumetricKg)}</p>
                                        </div>
                                    </div>
                                </motion.div>
                            </AnimatePresence>

                            {/* Container fit */}
                            <div className="mt-5">
                                <div className="mb-2.5 flex items-center justify-between">
                                    <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                                        <Container className="h-3.5 w-3.5" /> Container fit
                                    </p>
                                    {totals.smallest && (
                                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                            Smallest: {CONTAINER_LABEL[totals.smallest]}
                                        </span>
                                    )}
                                </div>
                                <div className="space-y-2.5">
                                    {totals.fits.map(({ container, volumeCbm, fit }) => (
                                        <FitBar
                                            key={container}
                                            label={CONTAINER_LABEL[container]}
                                            volumeCbm={volumeCbm}
                                            fit={fit}
                                            highlight={totals.smallest === container}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Sustainability */}
                            <div className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
                                <div className="rounded-full bg-emerald-500/15 p-2">
                                    <Leaf className="h-4 w-4 text-emerald-600" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-emerald-900">
                                        ≈ {totals.sus.kgCO2eqSea < 1000
                                            ? `${totals.sus.kgCO2eqSea.toFixed(0)} kg`
                                            : `${(totals.sus.kgCO2eqSea / 1000).toFixed(2)} t`} CO₂e by sea
                                    </p>
                                    <p className="mt-0.5 text-xs text-emerald-700">
                                        ~{totals.sus.percentLessThanAir.toFixed(0)}% less than air freight for the same shipment.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Feature highlights below the showcase */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
                >
                    {[
                        {
                            icon: Calculator,
                            title: '3D loading preview',
                            description: 'See how your cargo actually fits before the container is sealed - no more guessing.',
                        },
                        {
                            icon: Layers,
                            title: 'Bulk paste from a packing list',
                            description: 'Drop a spreadsheet of cartons and we parse it. Skip 30 minutes of manual entry per booking.',
                        },
                        {
                            icon: Share2,
                            title: 'Read-only share link',
                            description: 'Send your buyer or consignee a private link to confirm dimensions before you commit.',
                        },
                        {
                            icon: FileDown,
                            title: 'One-click into a booking',
                            description: 'Saved calculations carry their full item snapshot into the SRS booking flow.',
                        },
                    ].map((feat, idx) => (
                        <motion.div
                            key={feat.title}
                            initial={{ opacity: 0, y: 16 }}
                            animate={isInView ? { opacity: 1, y: 0 } : {}}
                            transition={{ duration: 0.5, delay: 0.35 + idx * 0.07 }}
                            className="rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:border-brand-blue/30 hover:shadow-md"
                        >
                            <div className="mb-3 inline-flex items-center justify-center rounded-xl bg-brand-blue/10 p-2.5 text-brand-blue">
                                <feat.icon className="h-5 w-5" strokeWidth={2.25} />
                            </div>
                            <h3 className="font-display text-base font-bold text-slate-900">{feat.title}</h3>
                            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{feat.description}</p>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Footer CTAs */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6, delay: 0.65 }}
                    className="mt-12 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
                >
                    <button
                        type="button"
                        onClick={() => setIsAuthOpen(true)}
                        className="group inline-flex items-center justify-center gap-2 rounded-full bg-brand-blue px-6 py-3 text-sm font-bold text-white shadow-md shadow-brand-blue/20 transition-all hover:bg-brand-blue/90 hover:shadow-lg hover:shadow-brand-blue/30"
                    >
                        Sign up to use the calculator
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </button>
                    <Link
                        href="#contact"
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition-all hover:border-slate-400 hover:text-slate-900"
                    >
                        Talk to sales first
                    </Link>
                </motion.div>
            </div>

            <AuthPanel isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} initialMode="signup" />
        </section>
    )
}

/* -------------------------------------------------------------------------- */
/* Sub-components                                                              */
/* -------------------------------------------------------------------------- */

function SampleItemCard({ item }: { item: ShowcaseItem }) {
    const oneUnitCbm = (item.lengthMm * item.widthMm * item.heightMm) / 1_000_000_000
    const totalItemCbm = oneUnitCbm * item.quantity
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-slate-900">{item.description}</p>
                <span className="font-mono text-xs font-bold text-brand-blue">{formatCbm(totalItemCbm)}</span>
            </div>
            <div className="mt-2.5 grid grid-cols-5 gap-2 text-[11px]">
                <Stat label="Qty" value={String(item.quantity)} />
                <Stat label="L" value={`${item.lengthMm} mm`} />
                <Stat label="W" value={`${item.widthMm} mm`} />
                <Stat label="H" value={`${item.heightMm} mm`} />
                <Stat label="Wt" value={`${item.weightKg} kg`} />
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
                {item.quantity} × {oneUnitCbm.toFixed(3)} m³
            </p>
        </div>
    )
}

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-md bg-slate-50 px-1.5 py-1">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
            <p className="font-mono font-semibold tabular-nums text-slate-700">{value}</p>
        </div>
    )
}

function FitBar({
    label,
    volumeCbm,
    fit,
    highlight,
}: {
    label: string
    volumeCbm: number
    fit: ReturnType<typeof fitInStandardContainers>[number]['fit']
    highlight: boolean
}) {
    const percent = Math.min(100, Math.max(0, fit.percentFull))
    const overflow = fit.percentFull > 100
    return (
        <div className={`rounded-xl border bg-white p-3 transition-all ${
            highlight ? 'border-emerald-300 bg-emerald-50/40 shadow-sm' : 'border-slate-200'
        }`}>
            <div className="flex items-baseline justify-between text-xs">
                <span className="font-bold text-slate-700">
                    {label} <span className="text-slate-400">· {volumeCbm.toFixed(1)} m³</span>
                </span>
                <span className={`font-mono font-bold tabular-nums ${overflow ? 'text-amber-600' : 'text-slate-700'}`}>
                    {fit.percentFull.toFixed(0)}%
                </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                <motion.div
                    className={`h-full rounded-full ${
                        overflow ? 'bg-amber-500' : highlight ? 'bg-emerald-500' : 'bg-brand-blue'
                    }`}
                    initial={false}
                    animate={{ width: `${percent}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                />
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500">
                {fit.fits
                    ? `Fits with ${formatCbm(fit.remainingCbm)} spare`
                    : `Over by ${formatCbm(-fit.remainingCbm)} - needs ${fit.qtyContainersNeeded} containers`}
            </p>
        </div>
    )
}
