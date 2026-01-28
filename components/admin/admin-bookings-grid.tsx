"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Search,
    Ship,
    MoreVertical,
    CreditCard,
    Container,
    MapPin,
    Anchor,
    Truck,
    PackageCheck,
    BoxSelect
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Extended Mock Data with Pay Status
const MOCK_BOOKINGS = [
    // PENDING REQUESTS
    { id: "BKG-001", client: "Global Fruits", ref: "SRS-9921", vessel: "MSC Orchestra", route: "CPT-RTM", etd: "Oct 28", status: "PENDING_DEPOSIT", depositPaid: false, type: "REQUEST" },
    { id: "BKG-002", client: "Oceanic Seafoods", ref: "SRS-9842", vessel: "Maersk Line 2", route: "DUR-SIN", etd: "Oct 30", status: "PENDING_CONFIRMATION", depositPaid: true, type: "REQUEST" },

    // ACTIVE SHIPMENTS
    { id: "SHP-2024-001", client: "Cape Citrus", ref: "SRS-9111", vessel: "COSCO Shipping", route: "CPT-LND", etd: "Nov 02", status: "AT_SEA", depositPaid: true, type: "SHIPMENT", progress: 65 },
    { id: "SHP-2024-004", client: "Tech Imports SA", ref: "SRS-8822", vessel: "Evergreen Elite", route: "RTM-CPT", etd: "Sep 15", status: "ARRIVED", depositPaid: true, type: "SHIPMENT", progress: 100 },
]

const SHIPMENT_MILESTONES = [
    { id: 'BOOKING_PLACED', label: 'Booked', icon: BoxSelect },
    { id: 'DEPOSIT_PAID', label: 'Deposit', icon: CreditCard },
    { id: 'CONTAINER_RELEASED', label: 'Released', icon: Container },
    { id: 'GATE_IN', label: 'Gate In', icon: Truck },
    { id: 'VESSEL_LOADED', label: 'Loaded', icon: Anchor },
    { id: 'AT_SEA', label: 'Sailing', icon: Ship },
    { id: 'ARRIVAL_POD', label: 'Arrived', icon: MapPin },
    { id: 'DELIVERED', label: 'Delivered', icon: PackageCheck },
]

export function AdminBookingsGrid() {
    const [searchTerm, setSearchTerm] = useState("")
    const [activeTab, setActiveTab] = useState("requests")

    const filteredData = MOCK_BOOKINGS.filter(b =>
        (activeTab === 'requests' ? b.type === 'REQUEST' : b.type === 'SHIPMENT') &&
        (b.client.toLowerCase().includes(searchTerm.toLowerCase()) || b.ref.includes(searchTerm))
    )

    return (
        <div className="space-y-6">
            <Tabs defaultValue="requests" onValueChange={setActiveTab} className="w-full">
                <div className="flex flex-col sm:flex-row justify-between gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                    <TabsList className="bg-slate-950 border border-slate-800">
                        <TabsTrigger value="requests" className="data-[state=active]:bg-slate-800 text-xs font-bold uppercase tracking-wider">
                            Pending Requests
                        </TabsTrigger>
                        <TabsTrigger value="shipments" className="data-[state=active]:bg-slate-800 text-xs font-bold uppercase tracking-wider">
                            Live Shipments
                        </TabsTrigger>
                    </TabsList>

                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <Input
                            placeholder="Search client, ref or vessel..."
                            className="pl-10 h-10 bg-slate-950 border-slate-800 text-white focus:ring-1 focus:ring-slate-700"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <TabsContent value="requests" className="mt-6">
                    <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950/30">
                        <Table>
                            <TableHeader className="bg-slate-900">
                                <TableRow className="hover:bg-transparent border-slate-800">
                                    <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Reference</TableHead>
                                    <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Client Request</TableHead>
                                    <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Vessel / Route</TableHead>
                                    <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] text-center">40% Deposit</TableHead>
                                    <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredData.map((item) => (
                                    <TableRow key={item.id} className="border-slate-800 hover:bg-slate-900/40">
                                        <TableCell className="font-mono text-white font-bold">{item.ref}</TableCell>
                                        <TableCell className="text-slate-300 font-medium">{item.client}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                <span className="text-xs text-white uppercase font-bold">{item.vessel}</span>
                                                <span className="text-[10px] text-slate-500">{item.route}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {item.depositPaid ? (
                                                <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">PAID</Badge>
                                            ) : (
                                                <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">PENDING</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-8">
                                                Review
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>

                <TabsContent value="shipments" className="mt-6 space-y-4">
                    <AnimatePresence>
                        {filteredData.map((item, i) => (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-all"
                            >
                                <div className="flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20">
                                            <Ship className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-white flex items-center gap-2">
                                                {item.ref}
                                                <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-400">{item.status.replace('_', ' ')}</Badge>
                                            </h3>
                                            <p className="text-slate-500 text-sm font-medium">{item.client} • {item.vessel}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline" className="border-slate-700 bg-slate-950 text-slate-300 font-bold hover:text-white">
                                                    Update Status
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent className="bg-slate-950 border-slate-800 text-white w-56">
                                                <DropdownMenuLabel>Select Milestone</DropdownMenuLabel>
                                                <DropdownMenuSeparator className="bg-slate-800" />
                                                {SHIPMENT_MILESTONES.map((m) => (
                                                    <DropdownMenuItem key={m.id} className="focus:bg-slate-900 focus:text-white cursor-pointer gap-2">
                                                        <m.icon className="h-4 w-4 text-slate-500" />
                                                        {m.label}
                                                    </DropdownMenuItem>
                                                ))}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                        <Button size="icon" variant="ghost" className="text-slate-500 hover:text-white">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Live Tracker Visual */}
                                <div className="relative pt-6 pb-2 px-2">
                                    {/* Progress Bar Background */}
                                    <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-800 -translate-y-1/2 rounded-full" />

                                    {/* Active Progress */}
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${item.progress}%` }}
                                        transition={{ duration: 1, delay: 0.2 }}
                                        className="absolute top-1/2 left-0 h-1 bg-blue-500 -translate-y-1/2 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                                    />

                                    <div className="relative flex justify-between">
                                        {SHIPMENT_MILESTONES.filter((_, idx) => idx % 2 === 0).map((milestone, idx) => { // Show every 2nd step for space 
                                            // Mock active check logic
                                            const isActive = idx * 22 <= (item.progress || 0)
                                            return (
                                                <div key={milestone.id} className="flex flex-col items-center gap-3">
                                                    <div className={`
                                                        h-8 w-8 rounded-full border-2 flex items-center justify-center bg-slate-950 transition-colors duration-500
                                                        ${isActive
                                                            ? "border-blue-500 text-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)] scale-110"
                                                            : "border-slate-800 text-slate-700"}
                                                    `}>
                                                        <milestone.icon className="h-3 w-3" />
                                                    </div>
                                                    <span className={`text-[10px] font-bold uppercase transition-colors ${isActive ? "text-blue-400" : "text-slate-700"}`}>
                                                        {milestone.label}
                                                    </span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </TabsContent>
            </Tabs>
        </div>
    )
}
