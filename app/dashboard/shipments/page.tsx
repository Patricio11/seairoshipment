"use client"

import { useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Radar, Ship, Search, Loader2, Clock, MapPin, ArrowRight, Sparkles } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { ClientTrackingPanel } from "@/components/tracking/client-tracking-panel"
import type { ClientBooking } from "@/types"

type Tab = "ACTIVE" | "DELIVERED" | "AWAITING"

export default function ShipmentsPage() {
    const [bookings, setBookings] = useState<ClientBooking[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [tab, setTab] = useState<Tab>("ACTIVE")
    const [openId, setOpenId] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        fetch("/api/bookings")
            .then(r => r.json())
            .then((d: ClientBooking[] | { error: string }) => {
                if (cancelled) return
                const list = Array.isArray(d) ? d : []
                setBookings(list)
                // Auto-open first active shipment so the tracking detail is visible on load
                const firstActive = list.find(b => b.trackingStatus === "SUBSCRIBED" && b.status !== "DELIVERED" && b.status !== "CANCELLED")
                if (firstActive) setOpenId(firstActive.id)
            })
            .catch(() => { })
            .finally(() => !cancelled && setLoading(false))
        return () => { cancelled = true }
    }, [])

    const { active, awaiting, delivered } = useMemo(() => {
        const active: ClientBooking[] = []
        const awaiting: ClientBooking[] = []
        const delivered: ClientBooking[] = []
        for (const b of bookings) {
            if (b.status === "CANCELLED") continue
            if (b.status === "DELIVERED") delivered.push(b)
            else if (b.trackingStatus === "SUBSCRIBED") active.push(b)
            else if (["CONFIRMED", "DEPOSIT_PAID", "SAILING"].includes(b.status)) awaiting.push(b)
        }
        return { active, awaiting, delivered }
    }, [bookings])

    const list = tab === "ACTIVE" ? active : tab === "DELIVERED" ? delivered : awaiting
    const filtered = useMemo(() => {
        if (!search) return list
        const q = search.toLowerCase()
        return list.filter(b =>
            b.bookingRef.toLowerCase().includes(q) ||
            b.vessel.toLowerCase().includes(q) ||
            b.route.toLowerCase().includes(q) ||
            (b.commodityName || "").toLowerCase().includes(q),
        )
    }, [list, search])

    return (
        <div className="flex flex-col gap-6 pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <Radar className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                                Live Tracking
                                {active.length > 0 && (
                                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                )}
                            </h1>
                            <p className="text-sm text-slate-500 font-medium">
                                Vessel position, port milestones and customs status, powered by MetaShip.
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <StatPill label="Active" value={active.length} tone="emerald" />
                    <StatPill label="Awaiting" value={awaiting.length} tone="amber" />
                    <StatPill label="Delivered" value={delivered.length} tone="slate" />
                </div>
            </div>

            {/* Tabs + Search */}
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 rounded-2xl p-1 w-fit">
                    {(["ACTIVE", "AWAITING", "DELIVERED"] as const).map(t => {
                        const count = t === "ACTIVE" ? active.length : t === "AWAITING" ? awaiting.length : delivered.length
                        return (
                            <button
                                key={t}
                                onClick={() => { setTab(t); setOpenId(null) }}
                                className={cn(
                                    "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2",
                                    tab === t
                                        ? "bg-white dark:bg-slate-950 text-brand-blue shadow-sm"
                                        : "text-slate-500 hover:text-slate-900 dark:hover:text-white",
                                )}
                            >
                                {t === "ACTIVE" ? "Live" : t === "AWAITING" ? "Awaiting" : "Delivered"}
                                <span className={cn(
                                    "px-1.5 py-0.5 rounded-md text-[10px] font-mono",
                                    tab === t ? "bg-blue-50 dark:bg-blue-900/30 text-brand-blue" : "bg-slate-200 dark:bg-slate-800 text-slate-500",
                                )}>
                                    {count}
                                </span>
                            </button>
                        )
                    })}
                </div>
                <div className="relative max-w-xs w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search vessel, ref, route…"
                        className="pl-10 h-10 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-20 text-slate-500">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading shipments…
                </div>
            ) : filtered.length === 0 ? (
                <EmptyState tab={tab} hasAny={bookings.length > 0} />
            ) : (
                <div className="space-y-3">
                    <AnimatePresence initial={false}>
                        {filtered.map((b) => (
                            <ShipmentCard
                                key={b.id}
                                booking={b}
                                isOpen={openId === b.id}
                                onToggle={() => setOpenId(openId === b.id ? null : b.id)}
                            />
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    )
}

/* --------------------------------- Pieces --------------------------------- */

function StatPill({ label, value, tone }: { label: string; value: number; tone: "emerald" | "amber" | "slate" }) {
    const toneClass = tone === "emerald"
        ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-900/30"
        : tone === "amber"
            ? "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900/30"
            : "text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
    return (
        <div className={cn("rounded-xl border px-3 py-1.5 flex items-baseline gap-2", toneClass)}>
            <span className="text-lg font-black leading-none">{value}</span>
            <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
        </div>
    )
}

function ShipmentCard({ booking, isOpen, onToggle }: { booking: ClientBooking; isOpen: boolean; onToggle: () => void }) {
    const isLive = booking.trackingStatus === "SUBSCRIBED"
    const isDelivered = booking.status === "DELIVERED"

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={cn(
                "rounded-2xl border bg-white dark:bg-slate-950 overflow-hidden transition-colors",
                isOpen
                    ? "border-brand-blue/40 shadow-lg shadow-brand-blue/5"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700",
            )}
        >
            <button
                type="button"
                onClick={onToggle}
                className="w-full text-left p-5 flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between group"
            >
                <div className="flex items-center gap-4">
                    <div className={cn(
                        "h-12 w-12 rounded-2xl flex items-center justify-center border relative shrink-0",
                        isDelivered
                            ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                            : isLive
                                ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-900/30 text-brand-blue"
                                : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500",
                    )}>
                        <Ship className="h-5 w-5" />
                        {isLive && !isDelivered && (
                            <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-950 animate-pulse" />
                        )}
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">{booking.bookingRef}</h3>
                            {isLive && !isDelivered && (
                                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[9px] uppercase font-black tracking-widest">Live</Badge>
                            )}
                            {isDelivered && (
                                <Badge className="bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20 text-[9px] uppercase font-black tracking-widest">Delivered</Badge>
                            )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                            <span className="font-bold text-slate-700 dark:text-slate-300">{booking.vessel}</span>
                            {booking.voyageNumber && (
                                <>
                                    <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                                    <span className="font-mono">{booking.voyageNumber}</span>
                                </>
                            )}
                            <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                            <span className="flex items-center gap-1 font-bold">
                                <MapPin className="h-3 w-3" /> {booking.route}
                            </span>
                        </div>
                        {booking.lastEventDescription && isLive && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 italic mt-1.5 truncate max-w-[460px]" title={booking.lastEventDescription}>
                                Latest: {booking.lastEventDescription}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                    {!isDelivered && <EtaCountdown eta={booking.eta} />}
                    <ArrowRight className={cn(
                        "h-4 w-4 text-slate-400 transition-transform",
                        isOpen && "rotate-90 text-brand-blue",
                    )} />
                </div>
            </button>

            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        key="content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden border-t border-slate-100 dark:border-slate-800"
                    >
                        <div className="p-5 bg-slate-50/50 dark:bg-slate-900/30">
                            <ClientTrackingPanel allocationId={booking.id} compact />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}

function EtaCountdown({ eta }: { eta: string | null }) {
    const [now, setNow] = useState<number | null>(null)

    useEffect(() => {
        // Timer callback runs outside the effect body — allowed by react-hooks rules
        const t = setTimeout(() => setNow(Date.now()), 0)
        const i = setInterval(() => setNow(Date.now()), 60_000)
        return () => { clearTimeout(t); clearInterval(i) }
    }, [])

    if (!eta) return <span className="text-xs text-slate-400 font-bold">ETA pending</span>
    if (now === null) {
        // SSR-safe placeholder until the client timer has run
        return <span className="text-xs text-slate-400 font-bold">ETA —</span>
    }

    const etaMs = new Date(eta).getTime()
    const ms = etaMs - now
    const days = Math.floor(ms / (1000 * 60 * 60 * 24))
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

    const tone = ms < 0
        ? "text-slate-400"
        : days < 2
            ? "text-amber-600 dark:text-amber-400"
            : "text-slate-700 dark:text-slate-200"

    return (
        <div className="text-right">
            <p className={cn("text-xs font-black flex items-center gap-1 justify-end", tone)}>
                <Clock className="h-3 w-3" />
                {ms < 0 ? `Overdue ${Math.abs(days)}d` : days > 0 ? `${days}d ${hours}h` : `${hours}h`}
            </p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">ETA</p>
        </div>
    )
}

function EmptyState({ tab, hasAny }: { tab: Tab; hasAny: boolean }) {
    const config = tab === "ACTIVE"
        ? {
            icon: Radar,
            title: hasAny ? "Nothing is moving right now" : "No live shipments yet",
            body: hasAny
                ? "Once MetaShip starts pushing events for a confirmed booking, it will appear here in real time."
                : "Your first shipment will show up here as soon as it's on the move.",
        }
        : tab === "AWAITING"
            ? {
                icon: Sparkles,
                title: "Nothing pending",
                body: "Confirmed bookings waiting for the MetaShip order will appear here.",
            }
            : {
                icon: Ship,
                title: "No delivered shipments",
                body: "Completed shipments will be archived here.",
            }
    const Icon = config.icon
    return (
        <div className="rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 py-20 text-center">
            <div className="h-14 w-14 mx-auto rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center mb-4">
                <Icon className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-base font-bold text-slate-700 dark:text-slate-200">{config.title}</p>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">{config.body}</p>
        </div>
    )
}
