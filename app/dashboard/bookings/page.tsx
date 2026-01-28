"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Search, Filter, Ship, MoreVertical, Calendar, ArrowRight, CheckCircle2, Clock } from "lucide-react"
import { useBookingModal } from "@/hooks/use-booking-modal"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

const MOCK_BOOKINGS = [
    {
        id: "SRS-9921",
        vessel: "MSC Orchestra",
        origin: "Cape Town (ZACPT)",
        destination: "Rotterdam (NLRTM)",
        date: "Oct 28, 2025",
        status: "CONFIRMED",
        pallets: 8,
        commodity: "Frozen Squid",
    },
    {
        id: "SRS-9845",
        vessel: "Maersk Line 2",
        origin: "Durban (ZADUR)",
        destination: "Singapore (SGSIN)",
        date: "Nov 02, 2025",
        status: "PENDING",
        pallets: 12,
        commodity: "Seasonal Fruit",
    },
    {
        id: "SRS-9712",
        vessel: "COSCO Shipping",
        origin: "Cape Town (ZACPT)",
        destination: "London (GBLND)",
        date: "Nov 15, 2025",
        status: "DRAFT",
        pallets: 5,
        commodity: "Frozen Fish",
    },
]

export default function BookingsPage() {
    const { onOpen } = useBookingModal()
    const [searchTerm, setSearchTerm] = useState("")

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
                    { label: "Active Bookings", value: "12", icon: Ship, color: "text-blue-500", bg: "bg-blue-50" },
                    { label: "Pending Layouts", value: "4", icon: Clock, color: "text-amber-500", bg: "bg-amber-50" },
                    { label: "Confirmed Space", value: "98.2%", icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50" },
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
                            <p className="text-2xl font-black text-slate-900 dark:text-white">{stat.value}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Filter & List Area */}
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 flex flex-col shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex flex-col sm:flex-row gap-4 justify-between bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search by ID, Vessel or Port..."
                            className="pl-10 h-11 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl focus:ring-brand-blue"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" className="h-11 px-4 rounded-xl border-slate-200 dark:border-slate-800 gap-2 font-bold text-slate-600">
                            <Filter className="h-4 w-4" />
                            Filters
                        </Button>
                    </div>
                </div>

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
                            {MOCK_BOOKINGS.filter(b =>
                                b.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                b.vessel.toLowerCase().includes(searchTerm.toLowerCase())
                            ).map((booking, i) => (
                                <motion.tr
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: i * 0.05 }}
                                    key={booking.id}
                                    className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                                >
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center border border-blue-100 dark:border-blue-900/30">
                                                <Ship className="h-6 w-6 text-brand-blue" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-black text-slate-900 dark:text-white tracking-tight">{booking.id}</span>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <span className="text-xs font-bold text-slate-400">{booking.vessel}</span>
                                                    <span className="h-1 w-1 rounded-full bg-slate-300" />
                                                    <span className="text-[10px] font-medium text-slate-500 uppercase">{booking.commodity}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col items-center">
                                            <span className="text-lg font-black text-slate-900 dark:text-white leading-none">{booking.pallets}</span>
                                            <span className="text-[10px] uppercase font-bold text-slate-400 mt-1 tracking-tighter">Pallets</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="text-xs space-y-0.5">
                                                <p className="font-bold text-slate-900 dark:text-white">{booking.origin.split(' ')[0]}</p>
                                                <p className="text-[10px] text-slate-400 font-medium">ZACPT</p>
                                            </div>
                                            <ArrowRight className="h-3 w-3 text-slate-300" />
                                            <div className="text-xs space-y-0.5">
                                                <p className="font-bold text-slate-900 dark:text-white">{booking.destination.split(' ')[0]}</p>
                                                <p className="text-[10px] text-slate-400 font-medium">NLRTM</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-2 text-[10px] font-bold text-slate-500 uppercase">
                                            <Calendar className="h-3 w-3" />
                                            {booking.date}
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <Badge
                                            className={cn(
                                                "rounded-lg px-2.5 py-1 text-[10px] font-black tracking-wider border-none",
                                                booking.status === "CONFIRMED" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
                                                booking.status === "PENDING" && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                                                booking.status === "DRAFT" && "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                            )}
                                        >
                                            {booking.status}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-slate-400 hover:text-brand-blue hover:bg-white dark:hover:bg-slate-950 shadow-none border-none">
                                            <MoreVertical className="h-5 w-5" />
                                        </Button>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="p-6 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-50 dark:border-slate-800 text-center">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Showing {MOCK_BOOKINGS.length} active bookings
                    </p>
                </div>
            </div>
        </div>
    )
}
