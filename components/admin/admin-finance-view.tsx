"use client"

import { useEffect, useState, useMemo } from "react"
import {
    TrendingUp,
    AlertOctagon,
    PieChart,
    Loader2,
    CheckCircle,
    Search,
    MoreVertical,
    Eye,
    Bell,
    XCircle,
    Clock,
    AlertTriangle,
    Filter,
    Users,
    ChevronDown,
    ChevronRight,
    ReceiptText,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { InvoiceViewDialog } from "@/components/finance/invoice-view-dialog"
import { toast } from "sonner"
import type { Invoice } from "@/types"

function formatZAR(amount: number): string {
    return `R ${amount.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function getDaysOverdue(dueDate: string): number {
    const due = new Date(dueDate)
    const now = new Date()
    const diff = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))
    return Math.max(0, diff)
}

const STATUS_FILTERS = ["ALL", "PENDING", "OVERDUE", "PAID", "CANCELLED"] as const
const TYPE_FILTERS = ["ALL", "DEPOSIT", "BALANCE"] as const
const DATE_FILTERS = [
    { label: "All Time", value: "all" },
    { label: "This Month", value: "month" },
    { label: "Last 30 Days", value: "30d" },
    { label: "Last 90 Days", value: "90d" },
] as const

export function AdminFinanceView() {
    const [invoices, setInvoices] = useState<Invoice[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState<typeof STATUS_FILTERS[number]>("ALL")
    const [typeFilter, setTypeFilter] = useState<typeof TYPE_FILTERS[number]>("ALL")
    const [dateFilter, setDateFilter] = useState("all")
    const [cancelDialog, setCancelDialog] = useState<string | null>(null)
    const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null)
    const [viewOpen, setViewOpen] = useState(false)
    const [clientSummaryOpen, setClientSummaryOpen] = useState(false)

    useEffect(() => {
        let cancelled = false
        const timeout = setTimeout(async () => {
            try {
                const res = await fetch("/api/invoices")
                if (res.ok && !cancelled) {
                    setInvoices(await res.json())
                }
            } catch { /* silently fail */ }
            finally { if (!cancelled) setLoading(false) }
        }, 0)
        return () => { cancelled = true; clearTimeout(timeout) }
    }, [])

    const now = new Date()

    // Stats
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
    const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + Number(inv.amountZAR), 0)

    const paidInvoices = invoices.filter((inv) => inv.status === "PAID")
    const totalInvoices = invoices.filter((inv) => inv.status !== "CANCELLED")
    const collectionRate = totalInvoices.length > 0
        ? Math.round((paidInvoices.length / totalInvoices.length) * 100)
        : 0

    // Filtered invoices
    const filteredInvoices = useMemo(() => {
        let result = [...invoices]

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase()
            result = result.filter((inv) =>
                inv.id.toLowerCase().includes(q) ||
                inv.bookingRef.toLowerCase().includes(q) ||
                (inv.companyName || "").toLowerCase().includes(q) ||
                (inv.clientName || "").toLowerCase().includes(q) ||
                (inv.poNumber || "").toLowerCase().includes(q) ||
                inv.route.toLowerCase().includes(q)
            )
        }

        if (statusFilter !== "ALL") {
            result = result.filter((inv) => inv.status === statusFilter)
        }

        if (typeFilter !== "ALL") {
            result = result.filter((inv) => inv.type === typeFilter)
        }

        if (dateFilter !== "all") {
            const cutoff = new Date()
            if (dateFilter === "month") {
                cutoff.setDate(1)
                cutoff.setHours(0, 0, 0, 0)
            } else if (dateFilter === "30d") {
                cutoff.setDate(cutoff.getDate() - 30)
            } else if (dateFilter === "90d") {
                cutoff.setDate(cutoff.getDate() - 90)
            }
            result = result.filter((inv) => new Date(inv.createdAt) >= cutoff)
        }

        return result
    }, [invoices, searchQuery, statusFilter, typeFilter, dateFilter])

    // Client summary
    const clientSummary = useMemo(() => {
        const groups: Record<string, {
            name: string
            totalInvoiced: number
            totalPaid: number
            totalOutstanding: number
            count: number
        }> = {}

        for (const inv of invoices) {
            const key = inv.companyName || inv.clientName || "Unknown"
            if (!groups[key]) {
                groups[key] = { name: key, totalInvoiced: 0, totalPaid: 0, totalOutstanding: 0, count: 0 }
            }
            const amount = Number(inv.amountZAR)
            groups[key].totalInvoiced += amount
            groups[key].count++
            if (inv.status === "PAID") groups[key].totalPaid += amount
            if (inv.status === "PENDING" || inv.status === "OVERDUE") groups[key].totalOutstanding += amount
        }

        return Object.values(groups).sort((a, b) => b.totalOutstanding - a.totalOutstanding)
    }, [invoices])

    // Overdue sorted by days overdue
    const sortedOverdue = useMemo(() => {
        return overdueInvoices
            .map((inv) => ({ ...inv, daysOverdue: getDaysOverdue(inv.dueDate) }))
            .sort((a, b) => b.daysOverdue - a.daysOverdue)
    }, [overdueInvoices])

    const handleUpdateStatus = async (invoiceId: string, newStatus: string) => {
        try {
            const res = await fetch("/api/invoices", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: invoiceId, status: newStatus }),
            })
            if (res.ok) {
                setInvoices((prev) =>
                    prev.map((inv) =>
                        inv.id === invoiceId
                            ? {
                                ...inv,
                                status: newStatus as Invoice["status"],
                                paidAt: newStatus === "PAID" ? new Date().toISOString() : inv.paidAt,
                            }
                            : inv
                    )
                )
                toast.success(`Invoice ${newStatus === "PAID" ? "marked as paid" : newStatus === "OVERDUE" ? "marked as overdue" : "cancelled"}`)
            } else {
                toast.error("Failed to update invoice")
            }
        } catch {
            toast.error("Failed to update invoice")
        }
    }

    const handleSendReminder = async (invoiceId: string) => {
        try {
            const res = await fetch("/api/invoices", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: invoiceId, action: "SEND_REMINDER" }),
            })
            if (res.ok) {
                setInvoices((prev) =>
                    prev.map((inv) =>
                        inv.id === invoiceId
                            ? { ...inv, reminderSentAt: new Date().toISOString() }
                            : inv
                    )
                )
                toast.success("Payment reminder sent")
            } else {
                toast.error("Failed to send reminder")
            }
        } catch {
            toast.error("Failed to send reminder")
        }
    }

    const handleConfirmCancel = async () => {
        if (cancelDialog) {
            await handleUpdateStatus(cancelDialog, "CANCELLED")
            setCancelDialog(null)
        }
    }

    const handleView = (invoice: Invoice) => {
        setViewInvoice(invoice)
        setViewOpen(true)
    }

    const hasActiveFilters = searchQuery || statusFilter !== "ALL" || typeFilter !== "ALL" || dateFilter !== "all"

    const resetFilters = () => {
        setSearchQuery("")
        setStatusFilter("ALL")
        setTypeFilter("ALL")
        setDateFilter("all")
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
        )
    }

    return (
        <div className="space-y-6">

            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-emerald-600 to-emerald-900 rounded-2xl p-5 text-white shadow-lg shadow-emerald-900/20">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-emerald-100 font-medium text-xs uppercase tracking-wider">Revenue (MTD)</p>
                            <h3 className="text-2xl font-black mt-1">{formatZAR(revenueMTD)}</h3>
                        </div>
                        <div className="bg-white/20 p-2 rounded-lg">
                            <TrendingUp className="h-5 w-5 text-white" />
                        </div>
                    </div>
                    <p className="mt-3 text-xs font-bold text-emerald-100 bg-white/10 w-fit px-2 py-1 rounded">
                        {paidThisMonth.length} payment{paidThisMonth.length !== 1 ? "s" : ""} this month
                    </p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-500 font-medium text-xs uppercase tracking-wider">Outstanding</p>
                            <h3 className="text-2xl font-black mt-1 text-white">{formatZAR(outstandingAmount)}</h3>
                        </div>
                        <div className="bg-amber-500/10 p-2 rounded-lg">
                            <Clock className="h-5 w-5 text-amber-500" />
                        </div>
                    </div>
                    <p className="mt-3 text-xs font-mono text-slate-500">
                        {pendingInvoices.length} pending, {overdueInvoices.length} overdue
                    </p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-500 font-medium text-xs uppercase tracking-wider">Overdue</p>
                            <h3 className={`text-2xl font-black mt-1 ${overdueInvoices.length > 0 ? "text-red-500" : "text-white"}`}>
                                {formatZAR(overdueAmount)}
                            </h3>
                        </div>
                        <div className="bg-red-500/10 p-2 rounded-lg">
                            <AlertOctagon className="h-5 w-5 text-red-500" />
                        </div>
                    </div>
                    <p className="mt-3 text-xs font-mono text-slate-500">
                        {overdueInvoices.length} invoice{overdueInvoices.length !== 1 ? "s" : ""} overdue
                    </p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-500 font-medium text-xs uppercase tracking-wider">Collection Rate</p>
                            <h3 className="text-2xl font-black mt-1 text-white">{collectionRate}%</h3>
                        </div>
                        <div className="bg-blue-500/10 p-2 rounded-lg">
                            <PieChart className="h-5 w-5 text-blue-500" />
                        </div>
                    </div>
                    <p className="mt-3 text-xs font-mono text-slate-500">
                        {paidInvoices.length} of {totalInvoices.length} invoices paid
                    </p>
                </div>
            </div>

            {/* Overdue Alerts */}
            {sortedOverdue.length > 0 && (
                <div className="bg-gradient-to-r from-red-950/50 to-red-900/20 border border-red-500/20 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-red-400 flex items-center gap-2 text-sm">
                            <AlertTriangle className="h-4 w-4" />
                            Overdue Invoices — Requires Attention
                        </h3>
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                            {sortedOverdue.length} overdue
                        </Badge>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {sortedOverdue.slice(0, 6).map((inv) => (
                            <div key={inv.id} className="bg-slate-950/80 border border-red-500/10 rounded-xl p-4 flex flex-col gap-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-white font-bold text-sm">{inv.companyName || inv.clientName || "—"}</p>
                                        <p className="text-slate-500 font-mono text-xs">{inv.id}</p>
                                    </div>
                                    <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-[10px]">
                                        {inv.daysOverdue}d overdue
                                    </Badge>
                                </div>
                                <p className="text-white font-mono font-bold">{formatZAR(Number(inv.amountZAR))}</p>
                                <div className="flex gap-2 mt-1">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10 flex-1"
                                        onClick={() => handleSendReminder(inv.id)}
                                    >
                                        <Bell className="h-3 w-3 mr-1" />
                                        {inv.reminderSentAt ? "Re-send" : "Remind"}
                                    </Button>
                                    <Button
                                        size="sm"
                                        className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 flex-1"
                                        onClick={() => handleUpdateStatus(inv.id, "PAID")}
                                    >
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        Mark Paid
                                    </Button>
                                </div>
                                {inv.reminderSentAt && (
                                    <p className="text-[10px] text-slate-600">
                                        Last reminder: {new Date(inv.reminderSentAt).toLocaleDateString("en-ZA", { month: "short", day: "numeric" })}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4">
                <div className="flex flex-col lg:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <Input
                            placeholder="Search by invoice #, booking ref, client, PO number..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 bg-slate-950 border-slate-800 text-white placeholder:text-slate-600"
                        />
                    </div>

                    <div className="flex gap-1 bg-slate-950 rounded-lg p-1 border border-slate-800">
                        {STATUS_FILTERS.map((s) => (
                            <button
                                key={s}
                                onClick={() => setStatusFilter(s)}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                                    statusFilter === s
                                        ? "bg-slate-800 text-white"
                                        : "text-slate-500 hover:text-slate-300"
                                }`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>

                    <div className="flex gap-1 bg-slate-950 rounded-lg p-1 border border-slate-800">
                        {TYPE_FILTERS.map((t) => (
                            <button
                                key={t}
                                onClick={() => setTypeFilter(t)}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                                    typeFilter === t
                                        ? "bg-slate-800 text-white"
                                        : "text-slate-500 hover:text-slate-300"
                                }`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="bg-slate-950 border-slate-800 text-slate-400 hover:text-white">
                                <Filter className="h-3.5 w-3.5 mr-1.5" />
                                {DATE_FILTERS.find((d) => d.value === dateFilter)?.label}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-slate-950 border-slate-800">
                            {DATE_FILTERS.map((d) => (
                                <DropdownMenuItem
                                    key={d.value}
                                    onClick={() => setDateFilter(d.value)}
                                    className={dateFilter === d.value ? "text-white font-bold" : "text-slate-400"}
                                >
                                    {d.label}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {hasActiveFilters && (
                        <Button variant="ghost" size="sm" onClick={resetFilters} className="text-slate-500 hover:text-white text-xs">
                            Reset
                        </Button>
                    )}
                </div>
            </div>

            {/* Invoice Table */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800">
                    <h3 className="font-bold text-white flex items-center gap-2 text-sm">
                        <ReceiptText className="h-4 w-4 text-blue-500" />
                        Invoices
                    </h3>
                    <Badge variant="outline" className="text-slate-400 border-slate-700 text-xs">
                        {filteredInvoices.length} of {invoices.length}
                    </Badge>
                </div>

                <Table>
                    <TableHeader>
                        <TableRow className="border-slate-800 hover:bg-transparent">
                            <TableHead className="text-slate-500 font-bold uppercase text-[10px]">Invoice #</TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase text-[10px]">Client</TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase text-[10px]">Route</TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase text-[10px]">Type</TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase text-[10px]">PO / Ref</TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase text-[10px]">Due Date</TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase text-[10px] text-right">Amount</TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase text-[10px] text-center">Status</TableHead>
                            <TableHead className="w-[60px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredInvoices.length === 0 ? (
                            <TableRow className="border-slate-800">
                                <TableCell colSpan={9} className="text-center py-12 text-slate-500">
                                    {hasActiveFilters ? "No invoices match your filters" : "No invoices generated yet"}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredInvoices.map((inv) => {
                                const isOverdue = inv.status === "OVERDUE" || (inv.status === "PENDING" && getDaysOverdue(inv.dueDate) > 0)
                                const daysOver = getDaysOverdue(inv.dueDate)

                                return (
                                    <TableRow key={inv.id} className="border-slate-800 hover:bg-slate-900/50">
                                        <TableCell className="font-mono text-xs text-white font-medium">{inv.id}</TableCell>
                                        <TableCell className="text-sm text-slate-400 max-w-[150px] truncate">
                                            {inv.companyName || inv.clientName || "—"}
                                        </TableCell>
                                        <TableCell className="text-xs text-slate-500 font-mono">{inv.route}</TableCell>
                                        <TableCell>
                                            <Badge className={`text-[10px] ${
                                                inv.type === "DEPOSIT"
                                                    ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                                    : "bg-purple-500/10 text-purple-400 border-purple-500/20"
                                            }`}>
                                                {inv.type} ({inv.percentage}%)
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-xs text-slate-500 font-mono">
                                            {inv.poNumber || "—"}
                                        </TableCell>
                                        <TableCell>
                                            <span className={`text-xs font-mono ${isOverdue && inv.status !== "PAID" ? "text-red-400" : "text-slate-500"}`}>
                                                {new Date(inv.dueDate).toLocaleDateString("en-ZA", { month: "short", day: "numeric", year: "numeric" })}
                                            </span>
                                            {isOverdue && inv.status !== "PAID" && inv.status !== "CANCELLED" && (
                                                <span className="block text-[10px] text-red-500 font-bold">{daysOver}d overdue</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-white font-bold text-sm">
                                            {formatZAR(Number(inv.amountZAR))}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge className={`text-[10px] ${
                                                inv.status === "OVERDUE" ? "bg-red-500/10 text-red-500 border-red-500/20" :
                                                inv.status === "PENDING" ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                                                inv.status === "PAID" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                                                "bg-slate-500/10 text-slate-500 border-slate-500/20"
                                            }`}>
                                                {inv.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 hover:text-white">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="bg-slate-950 border-slate-800 w-48">
                                                    <DropdownMenuItem onClick={() => handleView(inv)} className="text-slate-300">
                                                        <Eye className="h-4 w-4 mr-2" /> View Invoice
                                                    </DropdownMenuItem>
                                                    {(inv.status === "PENDING" || inv.status === "OVERDUE") && (
                                                        <>
                                                            <DropdownMenuSeparator className="bg-slate-800" />
                                                            <DropdownMenuItem
                                                                onClick={() => handleUpdateStatus(inv.id, "PAID")}
                                                                className="text-emerald-400"
                                                            >
                                                                <CheckCircle className="h-4 w-4 mr-2" /> Mark as Paid
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => handleSendReminder(inv.id)}
                                                                className="text-amber-400"
                                                            >
                                                                <Bell className="h-4 w-4 mr-2" /> Send Reminder
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}
                                                    {inv.status === "PENDING" && (
                                                        <DropdownMenuItem
                                                            onClick={() => handleUpdateStatus(inv.id, "OVERDUE")}
                                                            className="text-red-400"
                                                        >
                                                            <AlertOctagon className="h-4 w-4 mr-2" /> Mark as Overdue
                                                        </DropdownMenuItem>
                                                    )}
                                                    {inv.status !== "PAID" && inv.status !== "CANCELLED" && (
                                                        <>
                                                            <DropdownMenuSeparator className="bg-slate-800" />
                                                            <DropdownMenuItem
                                                                onClick={() => setCancelDialog(inv.id)}
                                                                className="text-red-500"
                                                            >
                                                                <XCircle className="h-4 w-4 mr-2" /> Cancel Invoice
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Client Summary */}
            {clientSummary.length > 0 && (
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
                    <button
                        className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-900/80 transition-colors"
                        onClick={() => setClientSummaryOpen(!clientSummaryOpen)}
                    >
                        <h3 className="font-bold text-white flex items-center gap-2 text-sm">
                            <Users className="h-4 w-4 text-blue-500" />
                            Client Summary
                        </h3>
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-slate-400 border-slate-700 text-xs">
                                {clientSummary.length} client{clientSummary.length !== 1 ? "s" : ""}
                            </Badge>
                            {clientSummaryOpen
                                ? <ChevronDown className="h-4 w-4 text-slate-500" />
                                : <ChevronRight className="h-4 w-4 text-slate-500" />
                            }
                        </div>
                    </button>

                    {clientSummaryOpen && (
                        <div className="border-t border-slate-800">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-slate-800 hover:bg-transparent">
                                        <TableHead className="text-slate-500 font-bold uppercase text-[10px]">Client</TableHead>
                                        <TableHead className="text-slate-500 font-bold uppercase text-[10px] text-right">Total Invoiced</TableHead>
                                        <TableHead className="text-slate-500 font-bold uppercase text-[10px] text-right">Paid</TableHead>
                                        <TableHead className="text-slate-500 font-bold uppercase text-[10px] text-right">Outstanding</TableHead>
                                        <TableHead className="text-slate-500 font-bold uppercase text-[10px] text-center">Invoices</TableHead>
                                        <TableHead className="w-[100px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {clientSummary.map((client) => (
                                        <TableRow key={client.name} className="border-slate-800 hover:bg-slate-900/50">
                                            <TableCell className="text-white font-medium text-sm">{client.name}</TableCell>
                                            <TableCell className="text-right font-mono text-slate-400 text-sm">{formatZAR(client.totalInvoiced)}</TableCell>
                                            <TableCell className="text-right font-mono text-emerald-400 text-sm">{formatZAR(client.totalPaid)}</TableCell>
                                            <TableCell className={`text-right font-mono text-sm ${client.totalOutstanding > 0 ? "text-red-400" : "text-slate-500"}`}>
                                                {formatZAR(client.totalOutstanding)}
                                            </TableCell>
                                            <TableCell className="text-center text-slate-400 text-sm">{client.count}</TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 text-xs text-slate-500 hover:text-white"
                                                    onClick={() => {
                                                        setSearchQuery(client.name)
                                                        setStatusFilter("ALL")
                                                        setClientSummaryOpen(false)
                                                    }}
                                                >
                                                    <Filter className="h-3 w-3 mr-1" />
                                                    Filter
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>
            )}

            {/* Cancel Confirmation Dialog */}
            <AlertDialog open={!!cancelDialog} onOpenChange={(open) => !open && setCancelDialog(null)}>
                <AlertDialogContent className="bg-slate-950 border-slate-800">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">Cancel Invoice</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-400">
                            Are you sure you want to cancel this invoice? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-slate-900 border-slate-800 text-white hover:bg-slate-800">
                            Keep Invoice
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmCancel}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            Cancel Invoice
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Invoice View Dialog */}
            <InvoiceViewDialog
                invoice={viewInvoice}
                open={viewOpen}
                onOpenChange={setViewOpen}
            />
        </div>
    )
}
