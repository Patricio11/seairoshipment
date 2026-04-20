"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Ship, ChevronDown, ChevronUp, Loader2, AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { TrackingTimeline, TrackingEventLog, type TrackingEventLite } from "./tracking-timeline"
import { TrackingRoute } from "./tracking-route"

interface Props {
    containerId: string
    route: string
    vessel: string
    voyageNumber?: string | null
    status: string
    trackingStatus?: string | null
    etd?: string | null
    eta?: string | null
    metashipOrderNo?: string | null
}

interface TrackingData {
    container: {
        lastPositionLat: number | null
        lastPositionLng: number | null
        lastPositionType: string | null
        lastPositionAt: string | null
        lastEventDescription: string | null
        lastEventAt: string | null
    }
    events: TrackingEventLite[]
}

export function LiveShipmentCard({ containerId, route, vessel, voyageNumber, status, trackingStatus, etd, eta, metashipOrderNo }: Props) {
    const [data, setData] = useState<TrackingData | null>(null)
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [expanded, setExpanded] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        setLoading(true)
        fetch(`/api/admin/tracking/${containerId}`)
            .then(r => r.json())
            .then(d => {
                if (cancelled) return
                if (d.error) setError(d.error)
                else setData(d)
            })
            .catch(() => !cancelled && setError("Failed to load tracking"))
            .finally(() => !cancelled && setLoading(false))
        return () => { cancelled = true }
    }, [containerId])

    const handleRefresh = async () => {
        setRefreshing(true)
        try {
            const res = await fetch(`/api/admin/tracking/${containerId}/refresh`, { method: "POST" })
            const summary = await res.json()
            if (!res.ok) { toast.error(summary.error || "Refresh failed"); return }
            toast.success(`Refreshed · ${summary.inserted} new events`)
            // Re-pull fresh data
            const again = await fetch(`/api/admin/tracking/${containerId}`).then(r => r.json())
            if (!again.error) setData(again)
        } catch { toast.error("Refresh failed") }
        finally { setRefreshing(false) }
    }

    // Derive progress % from events: which canonical milestone was last reached
    const progressPct = data ? computeProgressPct(data.events) : 0

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-all"
        >
            {/* Header */}
            <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center mb-5">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20">
                        <Ship className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-white flex items-center gap-2 flex-wrap">
                            {route}
                            <Badge className="bg-slate-800 text-slate-300 border-slate-700 text-[10px]">{status.replace("_", " ")}</Badge>
                            {trackingStatus === "SUBSCRIBED" && (
                                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] uppercase">Live</Badge>
                            )}
                            {trackingStatus === "FAILED" && (
                                <Badge className="bg-red-500/20 text-red-300 border-red-500/30 text-[10px] uppercase">Tracking failed</Badge>
                            )}
                        </h3>
                        <p className="text-slate-500 text-sm font-medium">
                            {vessel}{voyageNumber ? ` · Voyage ${voyageNumber}` : ""}
                            {metashipOrderNo ? <> · <span className="text-emerald-400 font-mono text-xs">MS #{metashipOrderNo}</span></> : null}
                        </p>
                        {data?.container?.lastEventDescription && (
                            <p className="text-xs text-slate-400 mt-1 italic">
                                Latest: {data.container.lastEventDescription}
                                {data.container.lastEventAt && <span className="text-slate-600 ml-2 font-mono">{new Date(data.container.lastEventAt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefresh}
                        disabled={refreshing || trackingStatus !== "SUBSCRIBED"}
                        className="border-slate-700 bg-slate-950 text-slate-300 hover:text-white text-xs"
                    >
                        {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Ship className="h-3.5 w-3.5 mr-1.5" />}
                        {refreshing ? "Refreshing…" : "Refresh"}
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpanded(v => !v)}
                        className="text-slate-400 hover:text-white text-xs"
                    >
                        {expanded ? <ChevronUp className="h-3.5 w-3.5 mr-1" /> : <ChevronDown className="h-3.5 w-3.5 mr-1" />}
                        {expanded ? "Collapse" : "Details"}
                    </Button>
                </div>
            </div>

            {/* Error state */}
            {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/5 border border-red-500/20 text-red-300 text-xs">
                    <AlertCircle className="h-4 w-4" /> {error}
                </div>
            )}

            {/* Loading */}
            {loading && !data && (
                <div className="flex items-center gap-2 py-8 justify-center text-slate-600 text-xs">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading tracking…
                </div>
            )}

            {/* Data */}
            {data && (
                <div className="space-y-4">
                    <TrackingTimeline events={data.events} etd={etd} eta={eta} />

                    <TrackingRoute
                        route={route}
                        progressPct={progressPct}
                        lastPositionLat={data.container.lastPositionLat}
                        lastPositionLng={data.container.lastPositionLng}
                        lastPositionType={data.container.lastPositionType}
                        lastPositionAt={data.container.lastPositionAt}
                        vesselName={vessel}
                    />

                    {expanded && (
                        <div className="pt-3 border-t border-slate-800">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Event Log ({data.events.length})</p>
                            <TrackingEventLog events={data.events} />
                        </div>
                    )}
                </div>
            )}

            {/* Empty state when subscribed but no events yet */}
            {data && data.events.length === 0 && !loading && (
                <div className="py-6 text-center text-slate-600 text-xs border border-slate-800 rounded-lg">
                    Tracking active — waiting for MetaShip to push the first event.
                </div>
            )}
        </motion.div>
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
    // Booked = 10, GateIn = 25, Loaded = 40, Departed = 55, Arrived = 85, Delivered = 100
    let pct = 10 // booked
    if (hits.gateIn) pct = 25
    if (hits.loaded) pct = 40
    if (hits.departed) pct = 55
    if (hits.arrived) pct = 85
    if (hits.delivered) pct = 100
    return pct
}
