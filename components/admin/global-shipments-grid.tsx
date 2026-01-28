"use client"

import { useState } from "react"
import {
    Search,
    Filter,
    Ship,
    AlertCircle,
    CheckCircle2,
    Clock,
    MoreVertical,
    ArrowRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

const MOCK_SHIPMENTS = [
    { id: "SHP-2024-001", client: "Global Fruits", ref: "SRS-9921", vessel: "MSC Orchestra", route: "CPT-RTM", etd: "Oct 28", eta: "Nov 12", status: "AT_SEA", active: true, docs: true },
    { id: "SHP-2024-002", client: "Oceanic Seafoods", ref: "SRS-9842", vessel: "Maersk Line 2", route: "DUR-SIN", etd: "Oct 30", eta: "Nov 15", status: "LOADING", active: true, docs: false },
    { id: "SHP-2024-003", client: "Cape Citrus", ref: "SRS-9111", vessel: "COSCO Shipping", route: "CPT-LND", etd: "Nov 02", eta: "Nov 18", status: "BOOKED", active: true, docs: true },
    { id: "SHP-2024-004", client: "Tech Imports SA", ref: "SRS-8822", vessel: "Evergreen Elite", route: "RTM-CPT", etd: "Sep 15", eta: "Sep 30", status: "ARRIVED", active: false, docs: true },
    { id: "SHP-2024-005", client: "Global Fruits", ref: "SRS-9925", vessel: "MSC Orchestra", route: "CPT-RTM", etd: "Oct 28", eta: "Nov 12", status: "AT_SEA", active: true, docs: false },
]

export function GlobalShipmentsGrid() {
    const [searchTerm, setSearchTerm] = useState("")

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'AT_SEA': return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
            case 'LOADING': return 'bg-amber-500/10 text-amber-500 border-amber-500/20'
            case 'ARRIVED': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
            case 'BOOKED': return 'bg-slate-500/10 text-slate-500 border-slate-500/20'
            default: return 'bg-slate-500/10 text-slate-500'
        }
    }

    return (
        <div className="space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                {[
                    { label: "Active Shipments", value: "842", icon: Ship, color: "text-blue-500" },
                    { label: "Pending Docs", value: "45", icon: AlertCircle, color: "text-red-500" },
                    { label: "At Port (Loading)", value: "12", icon: Clock, color: "text-amber-500" },
                    { label: "Completed (MTD)", value: "156", icon: CheckCircle2, color: "text-emerald-500" },
                ].map((stat) => (
                    <div key={stat.label} className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{stat.label}</p>
                                <p className="text-2xl font-black text-white mt-1">{stat.value}</p>
                            </div>
                            <stat.icon className={`h-5 w-5 ${stat.color}`} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row justify-between gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                        placeholder="Search by HBL, Client, or Container..."
                        className="pl-10 h-10 bg-slate-950 border-slate-800 text-white focus:ring-1 focus:ring-slate-700"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button variant="outline" className="border-slate-800 text-slate-400 hover:text-white bg-slate-950 hover:bg-slate-900 gap-2">
                    <Filter className="h-4 w-4" /> Filters
                </Button>
            </div>

            {/* Shipments Table */}
            <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950/30">
                <Table>
                    <TableHeader className="bg-slate-900">
                        <TableRow className="hover:bg-transparent border-slate-800">
                            <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Reference / Client</TableHead>
                            <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Route & Vessel</TableHead>
                            <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] text-center">Schedule</TableHead>
                            <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] text-center">Status</TableHead>
                            <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] text-center">Docs</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {MOCK_SHIPMENTS.map((shipment) => (
                            <TableRow key={shipment.id} className="border-slate-800 hover:bg-slate-900/40 group">
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="font-mono font-bold text-white text-xs">{shipment.ref}</span>
                                        <span className="text-xs text-slate-500">{shipment.client}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                                            <span>{shipment.route.split('-')[0]}</span>
                                            <ArrowRight className="h-3 w-3 text-slate-600" />
                                            <span>{shipment.route.split('-')[1]}</span>
                                        </div>
                                        <span className="text-[10px] text-slate-500 uppercase">{shipment.vessel}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-center">
                                    <div className="flex flex-col text-[10px] font-mono text-slate-400">
                                        <span>ETD: {shipment.etd}</span>
                                        <span>ETA: {shipment.eta}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-center">
                                    <Badge className={`${getStatusColor(shipment.status)}`}>
                                        {shipment.status.replace('_', ' ')}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                    {shipment.docs ? (
                                        <div className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-emerald-500/10 text-emerald-500">
                                            <CheckCircle2 className="h-4 w-4" />
                                        </div>
                                    ) : (
                                        <div className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-red-500/10 text-red-500 animate-pulse">
                                            <AlertCircle className="h-4 w-4" />
                                        </div>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-white">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
