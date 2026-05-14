"use client"

import { useEffect, useState } from "react"
import { Loader2, DollarSign, AlertCircle, ArrowRight } from "lucide-react"
import type { CubeCostBreakdown } from "@/lib/rates"

interface LiveQuotePanelProps {
    calculationId: string | null
    /** Re-fetch trigger — bump this when the calc is saved or the route changes. */
    refreshKey?: number | string
}

function formatZAR(n: number): string {
    if (n >= 1_000_000) return `R ${(n / 1_000_000).toFixed(2)}M`
    if (n >= 10_000) return `R ${(n / 1_000).toFixed(0)}k`
    if (n >= 1_000) return `R ${(n / 1_000).toFixed(1)}k`
    return `R ${n.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`
}

export function LiveQuotePanel({ calculationId, refreshKey }: LiveQuotePanelProps) {
    const [loading, setLoading] = useState(false)
    const [quote, setQuote] = useState<CubeCostBreakdown | null>(null)
    const [reason, setReason] = useState<string | null>(null)
    const [message, setMessage] = useState<string | null>(null)
    const [route, setRoute] = useState<string | null>(null)

    useEffect(() => {
        if (!calculationId) return
        let cancelled = false
        setLoading(true)
        setReason(null)
        setMessage(null)
        fetch(`/api/dashboard/cbm-calculations/${calculationId}/quote`, { cache: "no-store" })
            .then(r => r.json())
            .then(d => {
                if (cancelled) return
                if (d.quote) {
                    setQuote(d.quote)
                    setRoute(d.route ?? null)
                } else {
                    setQuote(null)
                    setReason(d.reason ?? "rate_unavailable")
                    setMessage(d.message ?? null)
                    setRoute(d.route ?? null)
                }
            })
            .catch(() => { if (!cancelled) { setQuote(null); setReason("error") } })
            .finally(() => { if (!cancelled) setLoading(false) })
        return () => { cancelled = true }
    }, [calculationId, refreshKey])

    if (!calculationId) {
        return (
            <PanelShell>
                <div className="text-xs text-slate-500 leading-relaxed">
                    Save the calculation to see a live SCS quote based on your active rate cards.
                </div>
            </PanelShell>
        )
    }

    if (loading) {
        return (
            <PanelShell>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Calculating quote…
                </div>
            </PanelShell>
        )
    }

    if (!quote) {
        return (
            <PanelShell>
                <div className="flex items-start gap-2.5 text-xs">
                    <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                        <p className="font-semibold text-slate-700 dark:text-slate-300">
                            {reason === "no_route" ? "No route to quote against" : "No rate card available"}
                        </p>
                        <p className="text-slate-500 leading-relaxed">
                            {message || "Ask sales to add a Cube rate card for this route, or book a shipment so we know your typical lane."}
                        </p>
                    </div>
                </div>
            </PanelShell>
        )
    }

    return (
        <PanelShell>
            <div className="space-y-3">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Live SCS Cube quote</p>
                    <p className="text-xs text-slate-500 mt-0.5 font-mono">
                        {route} · {quote.cbmVolume.toFixed(2)} m³ · {quote.originName} → {quote.destinationName}
                    </p>
                </div>
                <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-slate-900 dark:text-white">
                        {formatZAR(quote.totalCost)}
                    </span>
                    <span className="text-xs text-slate-500">estimated</span>
                </div>
                <dl className="grid grid-cols-3 gap-2 text-[11px]">
                    <BreakdownItem label="Origin" perCbm={quote.originPerCBM} subtotal={quote.originPerCBM * quote.cbmVolume} ok={quote.hasOriginRates} />
                    <BreakdownItem label="Ocean" perCbm={quote.oceanPerCBM} subtotal={quote.oceanPerCBM * quote.cbmVolume} ok={quote.hasOceanRates} />
                    <BreakdownItem label="Destination" perCbm={quote.destinationPerCBM} subtotal={quote.destinationPerCBM * quote.cbmVolume} ok={quote.hasDestinationRates} />
                </dl>
                <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-500 font-mono">
                        {formatZAR(quote.totalPerCBM)} / m³
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                        Deposit {formatZAR(quote.depositAmount)} · Balance {formatZAR(quote.balanceAmount)}
                    </span>
                </div>
                {(!quote.hasOriginRates || !quote.hasOceanRates || !quote.hasDestinationRates) && (
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Partial rates — final quote will be confirmed by sales.
                    </p>
                )}
            </div>
        </PanelShell>
    )
}

function PanelShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-900/10 p-4">
            <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
                    Live quote
                </span>
                <ArrowRight className="h-3 w-3 text-emerald-500/60 ml-auto" />
            </div>
            {children}
        </div>
    )
}

function BreakdownItem({ label, perCbm, subtotal, ok }: { label: string; perCbm: number; subtotal: number; ok: boolean }) {
    return (
        <div>
            <dt className="text-[10px] uppercase tracking-wider text-slate-500">{label}</dt>
            <dd className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                {formatZAR(subtotal)}
            </dd>
            <p className="text-[9px] text-slate-400 font-mono">
                {ok ? `${formatZAR(perCbm)} / m³` : "no rate"}
            </p>
        </div>
    )
}
