"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, MoreVertical, Edit, Trash, Anchor, Calculator, Ship } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { CreateLocationDialog } from "./create-location-dialog"

import { MOCK_LOCATIONS } from "@/lib/mock-data/locations"

export function LocationsGrid() {
    const [searchTerm, setSearchTerm] = useState("")
    const [filter, setFilter] = useState("ALL")

    const filteredLocs = MOCK_LOCATIONS.filter(loc =>
        (filter === "ALL" || loc.type === filter) &&
        (loc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            loc.code.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2 flex-1">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <Input
                            placeholder="Search ports or codes..."
                            className="pl-10 h-10 bg-slate-950 border-slate-800 text-white focus:ring-1 focus:ring-slate-700"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex bg-slate-950 rounded-lg p-1 border border-slate-800">
                        {["ALL", "ORIGIN", "DESTINATION"].map((t) => (
                            <button
                                key={t}
                                onClick={() => setFilter(t)}
                                className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${filter === t ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-300"}`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>
                <CreateLocationDialog />
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                <AnimatePresence>
                    {filteredLocs.map((loc, i) => (
                        <motion.div
                            key={loc.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ delay: i * 0.05 }}
                            className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors group relative overflow-hidden flex flex-col"
                        >
                            {/* Status Indicator */}
                            <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl ${loc.active ? "from-emerald-500/10" : "from-red-500/10"} to-transparent -mr-10 -mt-10 rounded-full blur-xl`} />

                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <div className="flex items-center gap-3">
                                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${loc.type === 'ORIGIN' ? "bg-amber-500/10 text-amber-500" : "bg-blue-500/10 text-blue-500"}`}>
                                        <Anchor className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white text-lg leading-none">{loc.name}</h3>
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <span className="text-xs font-mono font-bold text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">{loc.code}</span>
                                            <span className="text-[10px] text-slate-500 uppercase tracking-wider">{loc.country}</span>
                                        </div>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-white hover:bg-slate-800">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                                <div className="bg-slate-950/50 p-2 rounded border border-slate-800/50">
                                    <p className="text-slate-500 mb-0.5">Type</p>
                                    <p className="font-bold text-slate-300">{loc.type}</p>
                                </div>
                                <div className="bg-slate-950/50 p-2 rounded border border-slate-800/50">
                                    <p className="text-slate-500 mb-0.5">Coords</p>
                                    <p className="font-mono text-[10px] text-slate-300 truncate" title={loc.coordinates}>{loc.coordinates}</p>
                                </div>
                            </div>

                            {/* Rate Management Links */}
                            <div className="mt-auto pt-4 space-y-2">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Manage Rates</p>
                                <div className="grid grid-cols-1 gap-2">
                                    {loc.type === "ORIGIN" ? (
                                        <Button asChild variant="outline" size="sm" className="w-full justify-start bg-amber-500/5 border-amber-500/20 text-amber-200 hover:bg-amber-500/10 hover:border-amber-500/40 text-xs font-bold font-mono">
                                            <Link href={`/admin/finance/origin-charges?originId=${loc.id.toLowerCase()}`}>
                                                <Calculator className="mr-2 h-3.5 w-3.5 text-amber-500" />
                                                ORIGIN CHARGES (LANDSIDE)
                                            </Link>
                                        </Button>
                                    ) : loc.type === "DESTINATION" ? (
                                        <>
                                            <Button asChild variant="outline" size="sm" className="w-full justify-start bg-blue-500/5 border-blue-500/20 text-blue-200 hover:bg-blue-500/10 hover:border-blue-500/40 text-xs font-bold font-mono">
                                                <Link href={`/admin/finance/destination-charges?destId=${loc.id.toLowerCase()}`}>
                                                    <Calculator className="mr-2 h-3.5 w-3.5 text-blue-500" />
                                                    DESTINATION CHARGES
                                                </Link>
                                            </Button>
                                            <Button asChild variant="outline" size="sm" className="w-full justify-start bg-indigo-500/5 border-indigo-500/20 text-indigo-200 hover:bg-indigo-500/10 hover:border-indigo-500/40 text-xs font-bold font-mono">
                                                <Link href={`/admin/finance/ocean-freight?destId=${loc.id.toLowerCase()}`}>
                                                    <Ship className="mr-2 h-3.5 w-3.5 text-indigo-500" />
                                                    OCEAN FREIGHT RATES
                                                </Link>
                                            </Button>
                                        </>
                                    ) : null}
                                </div>
                            </div>

                            <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-800">
                                <Badge variant="outline" className={`bg-transparent border ${loc.active ? "border-emerald-500/30 text-emerald-500" : "border-red-500/30 text-red-500"}`}>
                                    {loc.active ? "ACTIVE PORT" : "INACTIVE"}
                                </Badge>
                                <div className="flex gap-2">
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-blue-400">
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-red-400">
                                        <Trash className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    )
}
