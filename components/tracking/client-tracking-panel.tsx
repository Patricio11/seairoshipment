"use client"

import { useEffect, useState } from "react"
import { Loader2, AlertCircle, Ship } from "lucide-react"
import { TrackingTimeline, TrackingEventLog, type TrackingEventLite } from "./tracking-timeline"
import { TrackingRoute } from "./tracking-route"

interface Props {
    allocationId: string
    /** Compact mode hides the event log by default and collapses padding. */
    compact?: boolean
}

interface Data {
    container: {
        route: string
        vessel: string
        voyageNumber: string | null
        etd: string | null
        eta: string | null
        status: string
        trackingStatus: string | null
        metashipOrderNo: string | null
        lastPositionLat: number | null
        lastPositionLng: number | null
        lastPositionType: string | null
        lastPositionAt: string | null
        lastEventDescription: string | null
        lastEventAt: string | null
    } | null
    events: TrackingEventLite[]
}

export function ClientTrackingPanel({ allocationId, compact }: Props) {
    const [data, setData] = useState<Data | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [showLog, setShowLog] = useState(!compact)

    useEffect(() => {
        let cancelled = false
        fetch(`/api/bookings/${allocationId}/tracking`)
            .then(r => r.json())
            .then(d => {
                if (cancelled) return
                if (d.error) setError(d.error)
                else setData(d)
            })
            .catch(() => !cancelled && setError("Failed to load tracking"))
            .finally(() => !cancelled && setLoading(false))
        return () => { cancelled = true }
    }, [allocationId])

    if (loading) {
        return (
            <div className="flex items-center gap-2 py-6 justify-center text-slate-400 text-xs">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading tracking…
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-300 text-xs">
                <AlertCircle className="h-4 w-4" /> {error}
            </div>
        )
    }

    if (!data?.container) {
        return (
            <div className="py-6 text-center text-slate-500 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                <Ship className="h-6 w-6 mx-auto mb-2 opacity-40" />
                Tracking will appear here once your shipment sets sail.
            </div>
        )
    }

    const progressPct = computeProgressPct(data.events)

    return (
        <div className={compact ? "space-y-3" : "space-y-4"}>
            <TrackingTimeline events={data.events} etd={data.container.etd} eta={data.container.eta} />
            <TrackingRoute
                route={data.container.route}
                progressPct={progressPct}
                lastPositionLat={data.container.lastPositionLat}
                lastPositionLng={data.container.lastPositionLng}
                lastPositionType={data.container.lastPositionType}
                lastPositionAt={data.container.lastPositionAt}
                vesselName={data.container.vessel}
            />

            {data.events.length > 0 && (
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                    <button
                        type="button"
                        onClick={() => setShowLog(v => !v)}
                        className="text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mb-2"
                    >
                        {showLog ? "Hide" : "Show"} event log ({data.events.length})
                    </button>
                    {showLog && <TrackingEventLog events={data.events} />}
                </div>
            )}
        </div>
    )
}

function computeProgressPct(events: TrackingEventLite[]): number {
    if (events.length === 0) return 0
    const hits = {
        gateIn: events.some(e => e.typeCode === "GTIN" || e.type === "GATE_IN"),
        loaded: events.some(e => e.typeCode === "LOAD" || e.type === "LOADED" || e.type === "VESSEL_LOADED"),
        departed: events.some(e => (e.typeCode === "DEPA" || e.type === "VESSEL_DEPARTURE") && e.modeOfTransport === "VESSEL"),
        arrived: events.some(e => (e.typeCode === "ARRI" || e.type === "VESSEL_ARRIVAL") && e.modeOfTransport === "VESSEL"),
        delivered: events.some(e => (e.typeCode === "GTOT" || e.type === "GATE_OUT") && e.modeOfTransport === "TRUCK" && e.isEmpty === false),
    }
    let pct = 10
    if (hits.gateIn) pct = 25
    if (hits.loaded) pct = 40
    if (hits.departed) pct = 55
    if (hits.arrived) pct = 85
    if (hits.delivered) pct = 100
    return pct
}
