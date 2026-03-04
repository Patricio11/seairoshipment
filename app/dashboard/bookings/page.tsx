"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import {
    Plus,
    Search,
    Ship,
    Calendar,
    ArrowRight,
    CheckCircle2,
    Clock,
    Loader2,
    Eye,
    FileText,
    Anchor,
    PackageCheck,
} from "lucide-react"
import { useBookingModal } from "@/hooks/use-booking-modal"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { BookingDetailDialog } from "@/components/booking/booking-detail-dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"
import type { ClientBooking } from "@/types"

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
    PENDING: { label: "Pending", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
    DEPOSIT_PAID: { label: "Deposit Paid", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
    CONFIRMED: { label: "Confirmed", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
    SAILING: { label: "Sailing", className: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" },
    DELIVERED: { label: "Delivered", className: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" },
    CANCELLED: { label: "Cancelled", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
}

const STATUS_TABS = ["ALL", "PENDING", "CONFIRMED", "SAILING", "DELIVERED"] as const

function formatDate(dateStr: string | null) {
    if (!dateStr) return "TBD"
    return new Date(dateStr).toLocaleDateString("en-ZA", {
        day: "numeric",
        month: "short",
        year: "numeric",
    })
}

export default function BookingsPage() {
    const { onOpen, refreshKey } = useBookingModal()
    const router = useRouter()
    const [bookings, setBookings] = useState<ClientBooking[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [statusFilter, setStatusFilter] = useState<string>("ALL")
    const [selectedBooking, setSelectedBooking] = useState<ClientBooking | null>(null)
    const [detailOpen, setDetailOpen] = useState(false)

    useEffect(() => {
        let cancelled = false
        const fetchBookings = async () => {
            try {
                setLoading(true)
                const res = await fetch("/api/bookings")
                if (res.ok && !cancelled) {
                    setBookings(await res.json())
                }
            } catch {
                // silently fail
            } finally {
                if (!cancelled) setLoading(false)
            }
        }
        fetchBookings()
        return () => { cancelled = true }
    }, [refreshKey])

    const stats = useMemo(() => {
        const active = bookings.filter(b => !["CANCELLED", "DELIVERED"].includes(b.status)).length
        const pending = bookings.filter(b => b.status === "PENDING").length
        const confirmed = bookings.filter(b => ["CONFIRMED", "DEPOSIT_PAID", "SAILING", "DELIVERED"].includes(b.status)).length
        const confirmedPct = bookings.length > 0 ? ((confirmed / bookings.length) * 100).toFixed(1) : "0"
        return { active, pending, confirmedPct }
    }, [bookings])

    const filtered = useMemo(() => {
        let result = bookings

        // Status filter
        if (statusFilter !== "ALL") {
            if (statusFilter === "CONFIRMED") {
                result = result.filter(b => ["CONFIRMED", "DEPOSIT_PAID"].includes(b.status))
            } else {
                result = result.filter(b => b.status === statusFilter)
            }
        }

        // Search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase()
            result = result.filter(b =>
                b.bookingRef.toLowerCase().includes(term) ||
                b.vessel.toLowerCase().includes(term) ||
                (b.commodityName || "").toLowerCase().includes(term) ||
                b.routeLabel.toLowerCase().includes(term)
            )
        }

        return result
    }, [bookings, statusFilter, searchTerm])

    const handleViewDetails = (booking: ClientBooking) => {
        setSelectedBooking(booking)
        setDetailOpen(true)
    }

    return (
        <div className="flex flex-col gap-8 pb-12">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                        Bookings
                    </h1>
                    <p className="text-slate-500 font-medium">
                        Manage your active SRS consolidations and pending shipments.
                    </p>
                </div>
                <Button
                    onClick={onOpen}
                    className="h-12 px-6 bg-brand-blue hover:bg-blue-700 text-white font-bold rounded-2xl shadow-xl shadow-blue-500/20 transition-all active:scale-95 flex items-center gap-2"
                >
                    <Plus className="h-5 w-5" />
                    New Booking
                </Button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    { label: "Active Bookings", value: String(stats.active), icon: Ship, color: "text-blue-500", bg: "bg-blue-50" },
                    { label: "Pending", value: String(stats.pending), icon: Clock, color: "text-amber-500", bg: "bg-amber-50" },
                    { label: "Confirmed Space", value: `${stats.confirmedPct}%`, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50" },
                ].map((stat, i) => (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        key={stat.label}
                        className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 flex items-center gap-4 group"
                    >
                        <div className={`h-12 w-12 rounded-2xl ${stat.bg} dark:bg-slate-800 flex items-center justify-center transition-transform group-hover:scale-110`}>
                            <stat.icon className={`h-6 w-6 ${stat.color}`} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                            <p className="text-2xl font-black text-slate-900 dark:text-white">{loading ? "—" : stat.value}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Filter & List Area */}
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 flex flex-col shadow-sm overflow-hidden">
                {/* Search & Status Tabs */}
                <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex flex-col gap-4 bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex flex-col sm:flex-row gap-4 justify-between">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search by ref, vessel, commodity..."
                                className="pl-10 h-11 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl focus:ring-brand-blue"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {STATUS_TABS.map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setStatusFilter(tab)}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                                    statusFilter === tab
                                        ? "bg-brand-blue text-white shadow-md"
                                        : "bg-white dark:bg-slate-950 text-slate-500 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800"
                                )}
                            >
                                {tab === "ALL" ? "All" : STATUS_CONFIG[tab]?.label || tab}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Table */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="h-8 w-8 animate-spin text-brand-blue" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="h-16 w-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            <Ship className="h-8 w-8 text-slate-400" />
                        </div>
                        <div className="text-center">
                            <p className="text-lg font-bold text-slate-900 dark:text-white">
                                {bookings.length === 0 ? "No bookings yet" : "No matching bookings"}
                            </p>
                            <p className="text-sm text-slate-500 mt-1">
                                {bookings.length === 0
                                    ? "Create your first booking to get started."
                                    : "Try adjusting your search or filters."}
                            </p>
                        </div>
                        {bookings.length === 0 && (
                            <Button onClick={onOpen} className="bg-brand-blue hover:bg-blue-700 font-bold rounded-xl mt-2">
                                <Plus className="h-4 w-4 mr-2" />
                                New Booking
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-[10px] uppercase tracking-widest font-black text-slate-400 bg-slate-50/30 dark:bg-slate-900/30">
                                    <th className="px-6 py-4">Shipment Details</th>
                                    <th className="px-6 py-4 text-center">Volume</th>
                                    <th className="px-6 py-4">Route</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                {filtered.map((booking, i) => {
                                    const statusCfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG.PENDING
                                    const routeParts = booking.routeLabel.includes("→")
                                        ? booking.routeLabel.split("→").map(s => s.trim())
                                        : [booking.routeLabel, ""]
                                    const routeCode = booking.route.split("-")

                                    return (
                                        <motion.tr
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: i * 0.05 }}
                                            key={booking.id}
                                            className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
                                            onClick={() => handleViewDetails(booking)}
                                        >
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-12 w-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center border border-blue-100 dark:border-blue-900/30">
                                                        <Ship className="h-6 w-6 text-brand-blue" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-black text-slate-900 dark:text-white tracking-tight">{booking.bookingRef}</span>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <span className="text-xs font-bold text-slate-400">{booking.vessel}</span>
                                                            <span className="h-1 w-1 rounded-full bg-slate-300" />
                                                            <span className="text-[10px] font-medium text-slate-500 uppercase">{booking.commodityName || "—"}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-lg font-black text-slate-900 dark:text-white leading-none">{booking.palletCount}</span>
                                                    <span className="text-[10px] uppercase font-bold text-slate-400 mt-1 tracking-tighter">Pallets</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="text-xs space-y-0.5">
                                                        <p className="font-bold text-slate-900 dark:text-white">{routeParts[0]}</p>
                                                        <p className="text-[10px] text-slate-400 font-medium">{routeCode[0]}</p>
                                                    </div>
                                                    <ArrowRight className="h-3 w-3 text-slate-300" />
                                                    <div className="text-xs space-y-0.5">
                                                        <p className="font-bold text-slate-900 dark:text-white">{routeParts[1]}</p>
                                                        <p className="text-[10px] text-slate-400 font-medium">{routeCode[1]}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1.5 mt-2 text-[10px] font-bold text-slate-500 uppercase">
                                                    <Calendar className="h-3 w-3" />
                                                    {formatDate(booking.etd)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <Badge className={cn("rounded-lg px-2.5 py-1 text-[10px] font-black tracking-wider border-none", statusCfg.className)}>
                                                    {statusCfg.label}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-slate-400 hover:text-brand-blue hover:bg-white dark:hover:bg-slate-950 shadow-none border-none">
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-44">
                                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleViewDetails(booking) }}>
                                                            <Anchor className="h-4 w-4 mr-2" />
                                                            View Details
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push("/dashboard/finance") }}>
                                                            <FileText className="h-4 w-4 mr-2" />
                                                            View Invoices
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </td>
                                        </motion.tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {!loading && filtered.length > 0 && (
                    <div className="p-6 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-50 dark:border-slate-800 text-center">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                            Showing {filtered.length} of {bookings.length} booking{bookings.length !== 1 ? "s" : ""}
                        </p>
                    </div>
                )}
            </div>

            {/* Booking Detail Dialog */}
            <BookingDetailDialog
                booking={selectedBooking}
                open={detailOpen}
                onOpenChange={setDetailOpen}
            />
        </div>
    )
}
