"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Calculator, Plus, Loader2, Search, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface CalcRow {
    id: string
    name: string
    totalCBM: string
    volumetricWeightKg: string | null
    totalWeightKg: string | null
    cargoItems: Array<{ id: string; label?: string; lengthMm: number; widthMm: number; heightMm: number; quantity: number; weightKg: number }>
    notes: string | null
    createdAt: string
    updatedAt: string
}

function formatDate(d: string) {
    return new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })
}

export default function CBMCalculatorListPage() {
    const [calcs, setCalcs] = useState<CalcRow[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")

    useEffect(() => {
        let cancelled = false
        fetch("/api/dashboard/cbm-calculations", { cache: "no-store" })
            .then(r => r.ok ? r.json() : { calculations: [] })
            .then(d => { if (!cancelled && Array.isArray(d.calculations)) setCalcs(d.calculations) })
            .catch(() => toast.error("Couldn't load saved calculations"))
            .finally(() => { if (!cancelled) setLoading(false) })
        return () => { cancelled = true }
    }, [])

    const q = search.trim().toLowerCase()
    const filtered = q
        ? calcs.filter(c => c.name.toLowerCase().includes(q) || (c.notes ?? "").toLowerCase().includes(q))
        : calcs

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <Link
                    href="/dashboard/tools"
                    className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand-blue"
                >
                    <ArrowLeft className="h-3 w-3" />
                    All tools
                </Link>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                        <Calculator className="h-6 w-6 text-brand-blue" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">CBM Calculator</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Save and reuse cargo dimension sets. Use any saved calculation to book a Cube shipment in one click.
                        </p>
                    </div>
                </div>
                <Button asChild className="bg-brand-blue hover:bg-brand-blue/90">
                    <Link href="/dashboard/tools/cbm-calculator/new">
                        <Plus className="mr-2 h-4 w-4" />
                        New calculation
                    </Link>
                </Button>
            </div>

            {!loading && calcs.length > 0 && (
                <div className="relative max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                    <Input
                        placeholder="Search by name or notes…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-9 bg-white dark:bg-slate-950"
                    />
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-20 text-slate-500 gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" /> Loading…
                </div>
            ) : calcs.length === 0 ? (
                <EmptyState />
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Search className="h-8 w-8 text-slate-400" />
                    <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-400">No calculations match your search.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map(calc => <CalcCard key={calc.id} calc={calc} />)}
                </div>
            )}
        </div>
    )
}

function CalcCard({ calc }: { calc: CalcRow }) {
    const itemCount = calc.cargoItems?.length ?? 0
    const totalQty = (calc.cargoItems ?? []).reduce((s, i) => s + (i.quantity || 0), 0)

    return (
        <Link
            href={`/dashboard/tools/cbm-calculator/${calc.id}`}
            className="group block rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 hover:border-brand-blue/40 hover:shadow-md transition-all"
        >
            <div className="flex items-start justify-between gap-3">
                <h3 className="text-base font-bold text-slate-900 dark:text-white line-clamp-2">{calc.name}</h3>
                <Badge variant="outline" className="text-[10px] shrink-0 border-blue-200 dark:border-blue-900/50 text-brand-blue">
                    CUBE
                </Badge>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                    {Number(calc.totalCBM).toFixed(2)}
                </span>
                <span className="text-xs font-bold text-slate-500">m³</span>
            </div>
            <div className="mt-3 text-xs text-slate-500 leading-snug">
                {itemCount} {itemCount === 1 ? "item" : "items"} · {totalQty} unit{totalQty === 1 ? "" : "s"}
                {calc.totalWeightKg && Number(calc.totalWeightKg) > 0 && (
                    <> · {(Number(calc.totalWeightKg) / 1000).toFixed(2)} t</>
                )}
            </div>
            <p className="mt-3 text-[10px] text-slate-400">
                Last updated {formatDate(calc.updatedAt)}
            </p>
        </Link>
    )
}

function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-16 w-16 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mb-4">
                <Sparkles className="h-7 w-7 text-brand-blue" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white">No saved calculations yet</h3>
            <p className="text-sm text-slate-500 max-w-md mt-1">
                Measure your cargo once, reuse it everywhere in quotes, in bookings, shared with consignees. Start with one calculation.
            </p>
            <Button asChild className="mt-5 bg-brand-blue hover:bg-brand-blue/90">
                <Link href="/dashboard/tools/cbm-calculator/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Create your first calculation
                </Link>
            </Button>
        </div>
    )
}
