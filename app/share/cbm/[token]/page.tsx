"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Loader2, AlertTriangle, Calendar } from "lucide-react"
import { CBMCalculator } from "@/components/cbm/cbm-calculator"
import { CBM3DViz } from "@/components/cbm/cbm-3d-viz"
import type { CargoItem } from "@/lib/db/schema/pallet-allocations"

interface SharedCalc {
    id: string
    name: string
    cargoType: string
    cargoItems: CargoItem[]
    totalCBM: string
    volumetricWeightKg: string | null
    totalWeightKg: string | null
    createdAt: string
    updatedAt: string
}

export default function SharedCBMPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = use(params)
    const [calc, setCalc] = useState<SharedCalc | null>(null)
    const [expiresAt, setExpiresAt] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let cancelled = false
        fetch(`/api/share/cbm/${encodeURIComponent(token)}`, { cache: "no-store" })
            .then(async r => {
                const data = await r.json().catch(() => ({}))
                if (cancelled) return
                if (!r.ok) {
                    setError(data.error || "Couldn't open this share link")
                    return
                }
                setCalc(data.calculation)
                setExpiresAt(data.expiresAt ?? null)
            })
            .catch(() => { if (!cancelled) setError("Couldn't open this share link") })
            .finally(() => { if (!cancelled) setLoading(false) })
        return () => { cancelled = true }
    }, [token])

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950">
            <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <Image
                            src="/seairo-logo.png"
                            alt="Seairo Cargo — Shared Reefer Services"
                            width={120}
                            height={40}
                            className="h-9 w-auto object-contain"
                            priority
                        />
                    </Link>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Shared calculation · read-only
                    </span>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-10 sm:py-14">
                {loading ? (
                    <div className="flex items-center justify-center py-20 text-slate-500 gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" /> Loading…
                    </div>
                ) : error || !calc ? (
                    <div className="rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-900/10 p-6 max-w-xl mx-auto">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-bold text-amber-900 dark:text-amber-200">Share link unavailable</p>
                                <p className="text-sm text-amber-800 dark:text-amber-200/80 mt-1">
                                    {error || "This link is no longer active. Ask the sender for a fresh one."}
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-brand-blue">
                                Seairo Shared Reefer Services
                            </p>
                            <h1 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                                {calc.name}
                            </h1>
                            <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                                <span className="font-mono">
                                    {Number(calc.totalCBM).toFixed(2)} m³
                                    {calc.totalWeightKg && Number(calc.totalWeightKg) > 0 && (
                                        <> · {(Number(calc.totalWeightKg) / 1000).toFixed(2)} t</>
                                    )}
                                </span>
                                {expiresAt && (
                                    <span className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        Expires {new Date(expiresAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                            <div className="lg:col-span-3">
                                <CBMCalculator value={calc.cargoItems} onChange={() => { /* read-only */ }} readOnly />
                            </div>
                            <div className="lg:col-span-2">
                                <CBM3DViz items={calc.cargoItems} containerVolumeCBM={67.7} />
                            </div>
                        </div>

                        <div className="text-center pt-4 border-t border-slate-200 dark:border-slate-800">
                            <p className="text-xs text-slate-500">
                                Shared via Seairo Cargo — <Link href="/" className="text-brand-blue hover:underline">seairo.com</Link>
                            </p>
                        </div>
                    </div>
                )}
            </main>
        </div>
    )
}
