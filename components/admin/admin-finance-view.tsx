"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { DollarSign, TrendingUp, AlertOctagon, Download, CreditCard, PieChart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

const MOCK_INVOICES = [
    { id: "INV-2024-001", client: "Global Fruits Trading", amount: "R 45,200.00", due: "2 Days Ago", status: "OVERDUE", type: "DEPOSIT" },
    { id: "INV-2024-002", client: "Oceanic Seafoods", amount: "R 12,500.00", due: "Today", status: "DUE", type: "FINAL" },
    { id: "INV-2024-003", client: "Cape Citrus Exporters", amount: "R 8,900.00", due: "In 5 Days", status: "PENDING", type: "DEPOSIT" },
    { id: "INV-2024-004", client: "Tech Imports SA", amount: "R 156,000.00", due: "In 12 Days", status: "PENDING", type: "FINAL" },
]

export function AdminFinanceView() {
    return (
        <div className="space-y-6">

            {/* Revenue Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-emerald-600 to-emerald-900 rounded-2xl p-6 text-white shadow-lg shadow-emerald-900/20">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-emerald-100 font-medium text-sm">Total Revenue (MTD)</p>
                            <h3 className="text-3xl font-black mt-1">R 1,245,000</h3>
                        </div>
                        <div className="bg-white/20 p-2 rounded-lg">
                            <TrendingUp className="h-6 w-6 text-white" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-xs font-bold text-emerald-100 bg-white/10 w-fit px-2 py-1 rounded">
                        <span>+12.5% vs Last Month</span>
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-500 font-medium text-sm">Outstanding (Overdue)</p>
                            <h3 className="text-3xl font-black mt-1 text-red-500">R 84,200</h3>
                        </div>
                        <div className="bg-red-500/10 p-2 rounded-lg">
                            <AlertOctagon className="h-6 w-6 text-red-500" />
                        </div>
                    </div>
                    <div className="mt-4 text-xs font-mono text-slate-500">
                        3 Invoices &gt; 30 Days
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-500 font-medium text-sm">Avg. Deal Size</p>
                            <h3 className="text-3xl font-black mt-1 text-white">R 42,150</h3>
                        </div>
                        <div className="bg-blue-500/10 p-2 rounded-lg">
                            <PieChart className="h-6 w-6 text-blue-500" />
                        </div>
                    </div>
                    <div className="mt-4 text-xs font-mono text-slate-500">
                        Based on 156 active deals
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Overdue List */}
                <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            <AlertOctagon className="h-5 w-5 text-red-500" />
                            Overdue & Pending Invoices
                        </h3>
                        <Button variant="ghost" size="sm" className="text-slate-400 font-mono text-xs">
                            View All
                        </Button>
                    </div>

                    <Table>
                        <TableHeader>
                            <TableRow className="border-slate-800 hover:bg-transparent">
                                <TableHead className="text-slate-500 font-bold uppercase text-[10px]">Invoice #</TableHead>
                                <TableHead className="text-slate-500 font-bold uppercase text-[10px]">Client</TableHead>
                                <TableHead className="text-slate-500 font-bold uppercase text-[10px] text-right">Amount</TableHead>
                                <TableHead className="text-slate-500 font-bold uppercase text-[10px] text-center">Status</TableHead>
                                <TableHead className="w-[100px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {MOCK_INVOICES.map((inv) => (
                                <TableRow key={inv.id} className="border-slate-800 hover:bg-slate-900/50">
                                    <TableCell className="font-mono text-xs text-white font-medium">{inv.id}</TableCell>
                                    <TableCell className="text-sm text-slate-400">{inv.client}</TableCell>
                                    <TableCell className="text-right font-mono text-white font-bold">{inv.amount}</TableCell>
                                    <TableCell className="text-center">
                                        <Badge className={`
                                            ${inv.status === 'OVERDUE' ? 'bg-red-500/10 text-red-500 border-red-500/20' : ''}
                                            ${inv.status === 'DUE' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : ''}
                                            ${inv.status === 'PENDING' ? 'bg-slate-500/10 text-slate-500 border-slate-500/20' : ''}
                                        `}>
                                            {inv.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Button size="sm" variant="outline" className="h-7 text-xs border-slate-700 bg-slate-900 text-slate-300 hover:text-white hover:border-slate-500">
                                            Chase
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                {/* Forex Rates */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <h3 className="font-bold text-white flex items-center gap-2 mb-6">
                        <CreditCard className="h-5 w-5 text-blue-500" />
                        Live Forex Rates
                    </h3>

                    <div className="space-y-4">
                        {[
                            { pair: "USD/ZAR", rate: "18.42", change: "+0.5%", up: true },
                            { pair: "EUR/ZAR", rate: "19.88", change: "-0.2%", up: false },
                            { pair: "GBP/ZAR", rate: "23.15", change: "+0.1%", up: true },
                        ].map((fx) => (
                            <div key={fx.pair} className="flex justify-between items-center bg-slate-950 p-4 rounded-xl border border-slate-800">
                                <div className="flex flex-col">
                                    <span className="text-slate-400 text-xs font-bold">{fx.pair}</span>
                                    <span className="text-white font-mono text-lg font-bold">R {fx.rate}</span>
                                </div>
                                <span className={`text-xs font-bold px-2 py-1 rounded ${fx.up ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}>
                                    {fx.change}
                                </span>
                            </div>
                        ))}
                    </div>

                    <Button className="w-full mt-6 bg-slate-800 hover:bg-slate-700 text-white font-bold">
                        <Download className="mr-2 h-4 w-4" /> Download Statement
                    </Button>
                </div>
            </div>
        </div>
    )
}
