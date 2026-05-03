"use client"

import Link from "next/link"
import { ArrowRight, Loader2, Plus, Ship, Sparkles } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useBookingModal } from "@/hooks/use-booking-modal"
import type { DashboardOverview } from "./overview-grid"

interface MyBookingsWidgetProps {
    bookings: DashboardOverview["upcomingBookings"]
    loading: boolean
}

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
    PENDING: { label: "Pending", className: "border-slate-300 text-slate-500" },
    DEPOSIT_PAID: { label: "Deposit Paid", className: "bg-blue-100 text-blue-700 border-0" },
    CONFIRMED: { label: "Confirmed", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    SAILING: { label: "Sailing", className: "bg-blue-100 text-blue-700 border-0" },
}

function formatEtd(etd: string | null): string {
    if (!etd) return "ETD TBD"
    return new Date(etd).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })
}

function routeLabel(route: string): string {
    // Route is stored as "ZACPT-NLRTM"; render with arrow.
    const parts = route.split("-")
    if (parts.length !== 2) return route
    return `${parts[0]} → ${parts[1]}`
}

export function MyBookingsWidget({ bookings, loading }: MyBookingsWidgetProps) {
    const { onOpen } = useBookingModal()

    return (
        <Card className="border-slate-200/50 dark:border-slate-800/50 h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-slate-500">My Bookings</CardTitle>
                <Ship className="h-4 w-4 text-brand-blue" />
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex items-center gap-2 text-slate-400 text-sm py-6">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                    </div>
                ) : bookings.length === 0 ? (
                    <div className="flex flex-col items-center text-center py-6 gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                            <Sparkles className="h-6 w-6 text-brand-blue" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">No active bookings yet</p>
                            <p className="text-xs text-slate-500 mt-1 max-w-xs">
                                Book your first shared reefer container — pick a route, pallets, and we&apos;ll handle the rest.
                            </p>
                        </div>
                        <Button onClick={onOpen} size="sm" className="bg-brand-blue hover:bg-brand-blue/90 text-white">
                            <Plus className="h-3.5 w-3.5 mr-1.5" />
                            Book your first shipment
                        </Button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2.5">
                        {bookings.map(b => {
                            const badge = STATUS_BADGES[b.status] ?? STATUS_BADGES.PENDING
                            return (
                                <Link
                                    key={b.id}
                                    href="/dashboard/bookings"
                                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 px-3 py-2.5 hover:border-brand-blue/40 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors"
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{b.bookingRef}</p>
                                            <Badge variant="outline" className={`text-[10px] ${badge.className}`}>
                                                {badge.label}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                                            {routeLabel(b.route)} · {b.vessel}
                                            {b.voyageNumber ? ` · Voy ${b.voyageNumber}` : ""}
                                        </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-xs font-mono font-bold text-slate-700 dark:text-slate-200">{formatEtd(b.etd)}</p>
                                        <p className="text-[10px] text-slate-500">{b.palletCount} pallet{b.palletCount !== 1 ? "s" : ""}</p>
                                    </div>
                                </Link>
                            )
                        })}
                        <Button asChild variant="ghost" size="sm" className="self-end text-xs text-brand-blue hover:bg-blue-50">
                            <Link href="/dashboard/bookings">
                                View all bookings <ArrowRight className="h-3 w-3 ml-1" />
                            </Link>
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
