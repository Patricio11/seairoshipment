"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { MoreHorizontal, Search, Plus, AlertTriangle, Snowflake, Thermometer, Box } from "lucide-react"
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

const MOCK_COMMODITIES = [
    { id: "CMD-001", name: "Frozen Squid (Ilex)", hsCode: "0307.43", tempMin: -25, tempMax: -18, risk: "LOW", category: "SEAFOOD" },
    { id: "CMD-002", name: "Citrus (Oranges)", hsCode: "0805.10", tempMin: 2, tempMax: 6, risk: "MED", category: "FRUIT" },
    { id: "CMD-003", name: "Pharmaceuticals", hsCode: "3004.90", tempMin: 2, tempMax: 8, risk: "HIGH", category: "PHARMA" },
    { id: "CMD-004", name: "Beef Primal Cuts", hsCode: "0201.30", tempMin: -1.5, tempMax: 0, risk: "MED", category: "MEAT" },
    { id: "CMD-005", name: "Table Grapes", hsCode: "0806.10", tempMin: -0.5, tempMax: 0.5, risk: "HIGH", category: "FRUIT" },
    { id: "CMD-006", name: "Frozen Hake Fillets", hsCode: "0304.74", tempMin: -20, tempMax: -18, risk: "LOW", category: "SEAFOOD" },
]

export function CommodityTable() {
    const [searchTerm, setSearchTerm] = useState("")

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                        placeholder="Search HS Codes or Names..."
                        className="pl-10 h-10 bg-slate-950 border-slate-800 text-white focus:ring-1 focus:ring-slate-700"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="border-slate-800 text-slate-400 hover:text-white bg-slate-950 hover:bg-slate-900">
                        Export CSV
                    </Button>
                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10">
                        <Plus className="mr-2 h-4 w-4" /> New Commodity
                    </Button>
                </div>
            </div>

            <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950/30">
                <Table>
                    <TableHeader className="bg-slate-900">
                        <TableRow className="hover:bg-transparent border-slate-800">
                            <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] w-[100px]">HS Code</TableHead>
                            <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Commodity Name</TableHead>
                            <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] w-[120px]">Category</TableHead>
                            <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] text-center w-[150px]">Temp Range (°C)</TableHead>
                            <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] w-[100px]">Risk Profile</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {MOCK_COMMODITIES.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.hsCode.includes(searchTerm)).map((item) => (
                            <TableRow key={item.id} className="border-slate-800 hover:bg-slate-900/40 group">
                                <TableCell className="font-mono text-xs font-bold text-slate-400">
                                    {item.hsCode}
                                </TableCell>
                                <TableCell className="font-medium text-slate-200">
                                    <div className="flex items-center gap-2">
                                        <Box className="h-4 w-4 text-slate-600" />
                                        {item.name}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-400 bg-slate-900">
                                        {item.category}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                    <div className="inline-flex items-center gap-2 bg-slate-900 border border-slate-800 rounded px-2 py-1">
                                        <Snowflake className="h-3 w-3 text-cyan-500" />
                                        <span className="font-mono text-xs text-white">{item.tempMin}°</span>
                                        <span className="text-slate-600">→</span>
                                        <span className="font-mono text-xs text-white">{item.tempMax}°</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        {item.risk === 'HIGH' && <AlertTriangle className="h-4 w-4 text-red-500" />}
                                        {item.risk === 'MED' && <Thermometer className="h-4 w-4 text-amber-500" />}
                                        {item.risk === 'LOW' && <div className="h-2 w-2 rounded-full bg-emerald-500 ml-1" />}
                                        <span className={`text-[10px] font-bold ${item.risk === 'HIGH' ? 'text-red-500' :
                                                item.risk === 'MED' ? 'text-amber-500' : 'text-emerald-500'
                                            }`}>
                                            {item.risk} RISK
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                        <MoreHorizontal className="h-4 w-4" />
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
