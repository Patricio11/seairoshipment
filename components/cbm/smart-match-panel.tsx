"use client"

import { useEffect, useState } from "react"
import { Loader2, Ship, Clock, AlertCircle, ArrowRight, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { bookingModalStore } from "@/hooks/use-booking-modal"
import { cn } from "@/lib/utils"

interface ContainerMatch {
    containerId: string
    route: string
    vessel: string
    voyageNumber: string | null
    etd: string | null
    cutoffAt: string | null
    hoursToCutoff: number | null
    cbmTotal: number
    cbmUsed: number
    cbmRemaining: number
    cbmRequired: number
    cbmSpare: number
}

interface SmartMatchPanelProps {
    calculationId: string | null
    refreshKey?: number | string
}

function routeLabel(route: string) {
    return route.replace("-", " → ")
}

function urgencyClass(hours: number | null): { bg: string; text: string; label: string } {
    if (hours === null) return { bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-500", label: "-" }
    if (hours <= 0) return { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-600 dark:text-red-400", label: "Closed" }
    if (hours <= 24) return { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-600 dark:text-red-400", label: "Closing today" }
    if (hours <= 72) return { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-600 dark:text-amber-400", label: "Closing soon" }
    return { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-600 dark:text-emerald-400", label: "On track" }
}

function formatRemaining(hours: number | null): string {
    if (hours === null) return "-"
    if (hours <= 0) return "past cut-off"
    const days = Math.floor(hours / 24)
    const rest = Math.floor(hours - days * 24)
    if (days > 0) return `${days}d ${rest}h`
    return `${Math.max(1, rest)}h`
}

export function SmartMatchPanel({ calculationId, refreshKey }: SmartMatchPanelProps) {
    const [loading, setLoading] = useState(false)
    const [matches, setMatches] = useState<ContainerMatch[]>([])
    const [route, setRoute] = useState<string | null>(null)
    const [fallbackUsed, setFallbackUsed] = useState(false)
    const [reason, setReason] = useState<string | null>(null)

    useEffect(() => {
        if (!calculationId) return
        let cancelled = false
        setLoading(true)
        setReason(null)
        fetch(`/api/dashboard/cbm-calculations/${calculationId}/matches`, { cache: "no-store" })
            .then(r => r.json())
            .then(d => {
                if (cancelled) return
                setMatches(Array.isArray(d.matches) ? d.matches : [])
                setRoute(d.route ?? null)
                setFallbackUsed(!!d.fallbackUsed)
                setReason(d.reason ?? null)
            })
            .catch(() => { if (!cancelled) { setMatches([]); setReason("error") } })
            .finally(() => { if (!cancelled) setLoading(false) })
    }, [calculationId, refreshKey])

    if (!calculationId) {
        return (
            <PanelShell>
                <div className="text-xs text-slate-500 leading-relaxed">
                    Save the calculation to see which of your open Cube containers fit this cargo.
                </div>
            </PanelShell>
        )
    }

    if (loading) {
        return (
            <PanelShell>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Looking for open containers…
                </div>
            </PanelShell>
        )
    }

    if (matches.length === 0) {
        return (
            <PanelShell>
                <div className="flex items-start gap-2.5 text-xs">
                    <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                        <p className="font-semibold text-slate-700 dark:text-slate-300">
                            No open Cube containers fit this cargo
                            {route ? ` on ${route}` : ""}.
                        </p>
                        <p className="text-slate-500 leading-relaxed">
                            New SCS-Cube sailings are added regularly - try again in a day or two, or contact sales to request capacity on this route.
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
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        Open Cube containers that fit
                    </p>
                    {fallbackUsed && (
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                            Nothing on {route} - showing nearby routes.
                        </p>
                    )}
                </div>

                <ul className="space-y-2">
                    {matches.slice(0, 4).map(m => {
                        const urgency = urgencyClass(m.hoursToCutoff)
                        return (
                            <li
                                key={m.containerId}
                                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                                        <Ship className="h-4 w-4 text-brand-blue" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                            {m.vessel} {m.voyageNumber ? `· Voy ${m.voyageNumber}` : ""}
                                        </p>
                                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                                            {routeLabel(m.route)} · {m.cbmRemaining.toFixed(1)} m³ available · {m.cbmSpare.toFixed(2)} m³ spare
                                        </p>
                                    </div>
                                    <div className={cn("flex flex-col items-end shrink-0 px-2 py-1 rounded-md", urgency.bg)}>
                                        <span className={cn("text-[10px] font-bold uppercase tracking-wider", urgency.text)}>
                                            <Clock className="inline h-2.5 w-2.5 mr-0.5" />
                                            {formatRemaining(m.hoursToCutoff)}
                                        </span>
                                        <span className={cn("text-[9px]", urgency.text)}>{urgency.label}</span>
                                    </div>
                                </div>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => bookingModalStore.onOpenWithPrefill({
                                        cargoType: "CUBE",
                                        calculationId,
                                        containerId: m.containerId,
                                    })}
                                    className="mt-2 w-full border-brand-blue/40 text-brand-blue hover:bg-brand-blue/5 h-8 text-xs"
                                >
                                    Book this container <ArrowRight className="ml-1.5 h-3 w-3" />
                                </Button>
                            </li>
                        )
                    })}
                </ul>
                {matches.length > 4 && (
                    <p className="text-[10px] text-slate-500 text-center">
                        +{matches.length - 4} more - see the booking wizard for the full list
                    </p>
                )}
            </div>
        </PanelShell>
    )
}

function PanelShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="rounded-2xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/40 dark:bg-blue-900/10 p-4">
            <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-brand-blue" />
                <span className="text-xs font-bold uppercase tracking-widest text-brand-blue">
                    Smart-match
                </span>
            </div>
            {children}
        </div>
    )
}
