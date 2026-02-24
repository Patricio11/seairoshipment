"use client"

import { useEffect, useState } from "react"
import { TrendingUp, AlertOctagon, Download, CreditCard, PieChart, Loader2, CheckCircle } from "lucide-react"
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
import { toast } from "sonner"
import type { Invoice } from "@/types"

function formatZAR(amount: number): string {
    return `R ${amount.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function AdminFinanceView() {
    const [invoices, setInvoices] = useState<(Invoice & { companyName?: string; clientName?: string })[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let cancelled = false
        const timeout = setTimeout(async () => {
            try {
                const res = await fetch("/api/invoices")
                if (res.ok && !cancelled) {
                    setInvoices(await res.json())
                }
            } catch {
                /* silently fail */
            } finally {
                if (!cancelled) setLoading(false)
            }
        }, 0)
        return () => { cancelled = true; clearTimeout(timeout) }
    }, [])

    const now = new Date()

    // Revenue cards
    const paidThisMonth = invoices.filter((inv) => {
        if (inv.status !== "PAID" || !inv.paidAt) return false
        const paid = new Date(inv.paidAt)
        return paid.getMonth() === now.getMonth() && paid.getFullYear() === now.getFullYear()
    })
    const revenueMTD = paidThisMonth.reduce((sum, inv) => sum + Number(inv.amountZAR), 0)

    const overdueInvoices = invoices.filter((inv) => inv.status === "OVERDUE")
    const pendingInvoices = invoices.filter((inv) => inv.status === "PENDING")
    const outstandingAmount = [...overdueInvoices, ...pendingInvoices].reduce(
        (sum, inv) => sum + Number(inv.amountZAR), 0
    )

    const paidInvoices = invoices.filter((inv) => inv.status === "PAID")
    const avgDealSize = paidInvoices.length > 0
        ? paidInvoices.reduce((sum, inv) => sum + Number(inv.amountZAR), 0) / paidInvoices.length
        : 0

    const handleMarkPaid = async (invoiceId: string) => {
        try {
            const res = await fetch("/api/invoices", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: invoiceId, status: "PAID" }),
            })
            if (res.ok) {
                setInvoices((prev) =>
                    prev.map((inv) =>
                        inv.id === invoiceId
                            ? { ...inv, status: "PAID" as const, paidAt: new Date().toISOString() }
                            : inv
                    )
                )
                toast.success("Invoice marked as paid")
            } else {
                toast.error("Failed to update invoice")
            }
        } catch {
            toast.error("Failed to update invoice")
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-brand-blue" />
            </div>
        )
    }

    return (
        <div className="space-y-6">

            {/* Revenue Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-emerald-600 to-emerald-900 rounded-2xl p-6 text-white shadow-lg shadow-emerald-900/20">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-emerald-100 font-medium text-sm">Total Revenue (MTD)</p>
                            <h3 className="text-3xl font-black mt-1">{formatZAR(revenueMTD)}</h3>
                        </div>
                        <div className="bg-white/20 p-2 rounded-lg">
                            <TrendingUp className="h-6 w-6 text-white" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-xs font-bold text-emerald-100 bg-white/10 w-fit px-2 py-1 rounded">
                        <span>{paidThisMonth.length} payment{paidThisMonth.length !== 1 ? "s" : ""} this month</span>
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-500 font-medium text-sm">Outstanding</p>
                            <h3 className={`text-3xl font-black mt-1 ${overdueInvoices.length > 0 ? "text-red-500" : "text-white"}`}>
                                {formatZAR(outstandingAmount)}
                            </h3>
                        </div>
                        <div className="bg-red-500/10 p-2 rounded-lg">
                            <AlertOctagon className="h-6 w-6 text-red-500" />
                        </div>
                    </div>
                    <div className="mt-4 text-xs font-mono text-slate-500">
                        {overdueInvoices.length} overdue, {pendingInvoices.length} pending
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-500 font-medium text-sm">Avg. Invoice Size</p>
                            <h3 className="text-3xl font-black mt-1 text-white">{formatZAR(avgDealSize)}</h3>
                        </div>
                        <div className="bg-blue-500/10 p-2 rounded-lg">
                            <PieChart className="h-6 w-6 text-blue-500" />
                        </div>
                    </div>
                    <div className="mt-4 text-xs font-mono text-slate-500">
                        Based on {paidInvoices.length} paid invoice{paidInvoices.length !== 1 ? "s" : ""}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Invoice List */}
                <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            <AlertOctagon className="h-5 w-5 text-red-500" />
                            All Invoices
                        </h3>
                        <Badge variant="outline" className="text-slate-400 border-slate-700 text-xs">
                            {invoices.length} total
                        </Badge>
                    </div>

                    <Table>
                        <TableHeader>
                            <TableRow className="border-slate-800 hover:bg-transparent">
                                <TableHead className="text-slate-500 font-bold uppercase text-[10px]">Invoice #</TableHead>
                                <TableHead className="text-slate-500 font-bold uppercase text-[10px]">Client</TableHead>
                                <TableHead className="text-slate-500 font-bold uppercase text-[10px]">Type</TableHead>
                                <TableHead className="text-slate-500 font-bold uppercase text-[10px] text-right">Amount</TableHead>
                                <TableHead className="text-slate-500 font-bold uppercase text-[10px] text-center">Status</TableHead>
                                <TableHead className="w-[120px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {invoices.length === 0 ? (
                                <TableRow className="border-slate-800">
                                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                                        No invoices generated yet
                                    </TableCell>
                                </TableRow>
                            ) : (
                                invoices.map((inv) => (
                                    <TableRow key={inv.id} className="border-slate-800 hover:bg-slate-900/50">
                                        <TableCell className="font-mono text-xs text-white font-medium">{inv.id}</TableCell>
                                        <TableCell className="text-sm text-slate-400">
                                            {inv.companyName || inv.clientName || "—"}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={`text-[10px] ${
                                                inv.type === "DEPOSIT"
                                                    ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                                    : "bg-purple-500/10 text-purple-400 border-purple-500/20"
                                            }`}>
                                                {inv.type} ({inv.percentage}%)
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-white font-bold">
                                            {formatZAR(Number(inv.amountZAR))}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge className={`
                                                ${inv.status === 'OVERDUE' ? 'bg-red-500/10 text-red-500 border-red-500/20' : ''}
                                                ${inv.status === 'PENDING' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : ''}
                                                ${inv.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : ''}
                                                ${inv.status === 'CANCELLED' ? 'bg-slate-500/10 text-slate-500 border-slate-500/20' : ''}
                                            `}>
                                                {inv.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {(inv.status === "PENDING" || inv.status === "OVERDUE") ? (
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleMarkPaid(inv.id)}
                                                    className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                                                >
                                                    <CheckCircle className="h-3 w-3 mr-1" />
                                                    Mark Paid
                                                </Button>
                                            ) : (
                                                <span className="text-xs text-slate-600 font-mono">
                                                    {inv.paidAt ? new Date(inv.paidAt).toLocaleDateString("en-ZA", { month: "short", day: "numeric" }) : "—"}
                                                </span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
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
                            { pair: "USD/ZAR", rate: "18.95", change: "+0.5%", up: true },
                            { pair: "EUR/ZAR", rate: "20.68", change: "-0.2%", up: false },
                            { pair: "GBP/ZAR", rate: "24.15", change: "+0.1%", up: true },
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
