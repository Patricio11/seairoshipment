"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { ArrowRight, Loader2, Ship } from "lucide-react"
import Link from "next/link"
import type { ClientBooking } from "@/types"

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
    PENDING: { label: "Pending", className: "border-slate-300 text-slate-500" },
    DEPOSIT_PAID: { label: "Deposit Paid", className: "bg-blue-100 text-blue-700 hover:bg-blue-200 border-0" },
    CONFIRMED: { label: "Confirmed", className: "border-slate-300 text-slate-500" },
    SAILING: { label: "Sailing", className: "bg-blue-100 text-blue-700 hover:bg-blue-200 border-0" },
    DELIVERED: { label: "Delivered", className: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-0" },
    CANCELLED: { label: "Cancelled", className: "bg-red-100 text-red-700 hover:bg-red-200 border-0" },
}

function formatDate(dateStr: string | null) {
    if (!dateStr) return "TBD"
    return new Date(dateStr).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })
}

export function RecentShipments() {
    const [bookings, setBookings] = useState<ClientBooking[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let cancelled = false
        const timeout = setTimeout(async () => {
            try {
                const res = await fetch("/api/bookings")
                if (res.ok && !cancelled) {
                    const data = await res.json()
                    setBookings(data.slice(0, 4))
                }
            } catch {
                // silently fail
            } finally {
                if (!cancelled) setLoading(false)
            }
        }, 0)
        return () => { cancelled = true; clearTimeout(timeout) }
    }, [])

    const activeCount = bookings.length

    return (
        <Card className="col-span-1 md:col-span-2 lg:col-span-3 border-slate-200/50 dark:border-slate-800/50">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-lg font-medium">Recent Shipments</CardTitle>
                    <CardDescription>
                        {loading ? "Loading shipments..." : `You have ${activeCount} recent booking${activeCount !== 1 ? "s" : ""}.`}
                    </CardDescription>
                </div>
                <Button variant="outline" size="sm" className="hidden sm:flex" asChild>
                    <Link href="/dashboard/bookings">
                        View All
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : bookings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
                        <Ship className="h-8 w-8" />
                        <p className="text-sm">No bookings yet</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[100px]">Reference</TableHead>
                                <TableHead>Route</TableHead>
                                <TableHead className="hidden md:table-cell">Vessel</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="hidden md:table-cell">ETD</TableHead>
                                <TableHead className="text-right">Pallets</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {bookings.map((booking) => {
                                const badge = STATUS_BADGES[booking.status] || STATUS_BADGES.PENDING
                                const routeParts = booking.routeLabel.includes("→")
                                    ? booking.routeLabel.split("→").map(s => s.trim())
                                    : [booking.routeLabel, ""]

                                return (
                                    <TableRow key={booking.id}>
                                        <TableCell className="font-medium text-brand-blue">{booking.bookingRef}</TableCell>
                                        <TableCell>{routeParts[0]} → {routeParts[1]}</TableCell>
                                        <TableCell className="hidden md:table-cell text-muted-foreground">{booking.vessel}</TableCell>
                                        <TableCell>
                                            {booking.status === "SAILING" ? (
                                                <Badge variant="secondary" className={badge.className}>
                                                    <span className="relative flex h-2 w-2 mr-1">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                                                    </span>
                                                    {badge.label}
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className={badge.className}>
                                                    {badge.label}
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell">{formatDate(booking.etd)}</TableCell>
                                        <TableCell className="text-right font-medium">{booking.palletCount}</TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    )
}
