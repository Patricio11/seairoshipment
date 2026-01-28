"use client"

import { motion } from "framer-motion"
import { Ship, ChevronRight, Anchor, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

const MOCK_VESSELS = [
    { id: "VSL-001", name: "MSC Orchestra", route: "CPT-RTM", departure: "Oct 28", arrival: "Nov 12", status: "AT_SEA", capacity: 85, nextPort: "Rotterdam" },
    { id: "VSL-002", name: "Maersk Line 2", route: "DUR-SIN", departure: "Oct 30", arrival: "Nov 15", status: "LOADING", capacity: 12, nextPort: "Durban" },
    { id: "VSL-003", name: "COSCO Shipping", route: "CPT-LND", departure: "Nov 02", arrival: "Nov 18", status: "SCHEDULED", capacity: 0, nextPort: "Cape Town" },
    { id: "VSL-004", name: "Evergreen Elite", route: "CPT-RTM", departure: "Nov 05", arrival: "Nov 20", status: "SCHEDULED", capacity: 0, nextPort: "Cape Town" },
]

export function FleetScheduler() {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                <div className="flex items-center gap-4 text-sm text-slate-400">
                    <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500" /> At Sea</span>
                    <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-500" /> Loading</span>
                    <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-500" /> Scheduled</span>
                </div>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-9">
                    <Plus className="mr-2 h-4 w-4" /> Add Voyage
                </Button>
            </div>

            <div className="grid gap-4">
                {MOCK_VESSELS.map((vessel, i) => (
                    <motion.div
                        key={vessel.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-all group"
                    >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            {/* Vessel Info */}
                            <div className="flex items-center gap-4 min-w-[200px]">
                                <div className="h-12 w-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
                                    <Ship className="h-6 w-6 text-slate-300" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-lg">{vessel.name}</h3>
                                    <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                                        <span>{vessel.id}</span>
                                        <span className="w-1 h-1 rounded-full bg-slate-600" />
                                        <span>{vessel.route}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Timeline Visual */}
                            <div className="flex-1 px-4 relative">
                                <div className="flex justify-between text-xs font-mono text-slate-500 mb-2">
                                    <span>{vessel.departure}</span>
                                    <span>{vessel.arrival}</span>
                                </div>
                                <div className="h-2 bg-slate-800 rounded-full relative overflow-hidden">
                                    {/* Progress Bar */}
                                    {vessel.status === 'AT_SEA' && (
                                        <div className="absolute top-0 left-0 h-full bg-emerald-500 w-[65%]" />
                                    )}
                                    {vessel.status === 'LOADING' && (
                                        <div className="absolute top-0 left-0 h-full bg-amber-500 w-[10%]" />
                                    )}
                                </div>
                                <div className="flex justify-between mt-2">
                                    <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400">
                                        <Anchor className="h-3 w-3" />
                                        {vessel.nextPort}
                                    </div>
                                    <div className="text-[10px] font-bold text-emerald-500">
                                        {vessel.status === 'AT_SEA' && "IN TRANSIT"}
                                        {vessel.status === 'LOADING' && "AT PORT"}
                                        {vessel.status === 'SCHEDULED' && "PLANNED"}
                                    </div>
                                </div>
                            </div>

                            {/* Capacity Stat */}
                            <div className="flex flex-col items-end min-w-[100px]">
                                <span className="text-3xl font-black text-white">{vessel.capacity}%</span>
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Load Factor</span>
                            </div>

                            <Button variant="ghost" size="icon" className="text-slate-500 hover:text-white">
                                <ChevronRight className="h-5 w-5" />
                            </Button>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    )
}
