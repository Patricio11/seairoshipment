"use client"

import { CheckCircle2, Circle, Loader2, MapPin, Ship, Truck, Container as ContainerIcon, PackageCheck } from "lucide-react"

export type TrackingEventLite = {
    id: string
    eventDate: string | Date
    eventType: string
    typeCode: string | null
    type: string | null
    description: string
    location: string | null
    modeOfTransport: "TRUCK" | "VESSEL" | "RAIL" | "BARGE" | null
    isActual: boolean | null
    isEmpty?: boolean | null
    vesselName: string | null
    voyage: string | null
}

interface Props {
    events: TrackingEventLite[]
    etd?: string | Date | null
    eta?: string | Date | null
}

type MilestoneKey = "BOOKED" | "GATE_IN" | "LOADED" | "DEPARTED" | "ARRIVED" | "DELIVERED"

interface Milestone {
    key: MilestoneKey
    label: string
    icon: typeof Ship
    match: (e: TrackingEventLite) => boolean
}

const MILESTONES: Milestone[] = [
    { key: "BOOKED", label: "Booked", icon: ContainerIcon, match: () => false },
    { key: "GATE_IN", label: "Gate In", icon: Truck, match: e => (e.typeCode === "GTIN" || e.type === "GATE_IN") },
    { key: "LOADED", label: "Loaded", icon: PackageCheck, match: e => (e.typeCode === "LOAD" || e.type === "LOADED" || e.type === "VESSEL_LOADED") },
    { key: "DEPARTED", label: "Departed POL", icon: Ship, match: e => ((e.typeCode === "DEPA" || e.type === "VESSEL_DEPARTURE") && e.modeOfTransport === "VESSEL") },
    { key: "ARRIVED", label: "Arrived POD", icon: MapPin, match: e => ((e.typeCode === "ARRI" || e.type === "VESSEL_ARRIVAL") && e.modeOfTransport === "VESSEL") },
    { key: "DELIVERED", label: "Delivered", icon: CheckCircle2, match: e => (e.typeCode === "GTOT" || e.type === "GATE_OUT") && e.modeOfTransport === "TRUCK" && e.isEmpty === false },
]

export function TrackingTimeline({ events, etd, eta }: Props) {
    const reached = new Map<MilestoneKey, TrackingEventLite>()
    // Booked is implicit — reached if any event exists
    if (events.length > 0) reached.set("BOOKED", events[0])
    for (const ev of events) {
        for (const m of MILESTONES) {
            if (m.key === "BOOKED") continue
            if (!reached.has(m.key) && m.match(ev)) reached.set(m.key, ev)
        }
    }

    const reachedOrder = MILESTONES.map(m => reached.has(m.key))
    const lastReachedIdx = reachedOrder.lastIndexOf(true)
    const progressPct = lastReachedIdx === -1 ? 0 : (lastReachedIdx / (MILESTONES.length - 1)) * 100

    return (
        <div className="w-full">
            {/* Progress rail */}
            <div className="relative pt-6 pb-2 px-2">
                <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-800 -translate-y-1/2 rounded-full" />
                <div
                    className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-blue-500 to-emerald-500 -translate-y-1/2 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all duration-700"
                    style={{ width: `${progressPct}%` }}
                />
                <div className="relative flex justify-between">
                    {MILESTONES.map((m, idx) => {
                        const hit = reached.get(m.key)
                        const isCurrent = idx === lastReachedIdx
                        const isReached = !!hit
                        const Icon = m.icon
                        return (
                            <div key={m.key} className="flex flex-col items-center gap-2 flex-1 min-w-0 px-1">
                                <div className={`
                                    h-9 w-9 rounded-full border-2 flex items-center justify-center bg-slate-950 transition-all
                                    ${isReached
                                        ? isCurrent
                                            ? "border-blue-400 text-blue-300 shadow-[0_0_18px_rgba(96,165,250,0.6)] scale-110 animate-pulse"
                                            : "border-emerald-500 text-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.3)]"
                                        : "border-slate-800 text-slate-700"}
                                `}>
                                    <Icon className="h-4 w-4" />
                                </div>
                                <span className={`text-[10px] font-bold uppercase tracking-wider text-center truncate w-full ${isReached ? (isCurrent ? "text-blue-300" : "text-emerald-400") : "text-slate-700"}`}>
                                    {m.label}
                                </span>
                                {hit && (
                                    <span className="text-[9px] text-slate-500 font-mono">
                                        {new Date(hit.eventDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                                    </span>
                                )}
                                {!hit && m.key === "DEPARTED" && etd && (
                                    <span className="text-[9px] text-slate-600 font-mono italic">
                                        ETD {new Date(etd).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                                    </span>
                                )}
                                {!hit && m.key === "ARRIVED" && eta && (
                                    <span className="text-[9px] text-slate-600 font-mono italic">
                                        ETA {new Date(eta).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                                    </span>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

/**
 * Raw event log — shown below the milestone timeline. Reverse-chronological.
 */
export function TrackingEventLog({ events }: { events: TrackingEventLite[] }) {
    if (events.length === 0) {
        return (
            <div className="flex items-center gap-2 py-8 justify-center text-slate-600 text-xs">
                <Loader2 className="h-4 w-4 animate-spin" /> Waiting for events from MetaShip…
            </div>
        )
    }
    const sorted = [...events].sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime())
    return (
        <div className="space-y-2">
            {sorted.map(ev => (
                <div key={ev.id} className="flex items-start gap-3 p-3 rounded-lg border border-slate-800 bg-slate-900/50 hover:bg-slate-900 transition-colors">
                    <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${iconBg(ev)}`}>
                        {eventIcon(ev)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs text-white font-medium">{ev.description}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-[10px] text-slate-500 font-mono">{new Date(ev.eventDate).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                            {ev.location && (
                                <>
                                    <span className="text-[10px] text-slate-700">·</span>
                                    <span className="text-[10px] text-slate-500 font-mono">{ev.location}</span>
                                </>
                            )}
                            {ev.vesselName && (
                                <>
                                    <span className="text-[10px] text-slate-700">·</span>
                                    <span className="text-[10px] text-slate-400">{ev.vesselName}{ev.voyage ? ` / ${ev.voyage}` : ""}</span>
                                </>
                            )}
                            {ev.typeCode && (
                                <span className="text-[10px] text-slate-600 font-mono uppercase">{ev.typeCode}</span>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}

function iconBg(ev: TrackingEventLite): string {
    if (ev.modeOfTransport === "VESSEL") return "bg-blue-500/10 text-blue-400"
    if (ev.modeOfTransport === "TRUCK") return "bg-amber-500/10 text-amber-400"
    if (ev.eventType === "AIS") return "bg-cyan-500/10 text-cyan-400"
    return "bg-slate-700/40 text-slate-400"
}

function eventIcon(ev: TrackingEventLite) {
    if (ev.modeOfTransport === "VESSEL") return <Ship className="h-3.5 w-3.5" />
    if (ev.modeOfTransport === "TRUCK") return <Truck className="h-3.5 w-3.5" />
    return <Circle className="h-3.5 w-3.5" />
}
