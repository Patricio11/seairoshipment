"use client"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import type { Invoice } from "@/types"

interface InvoiceListProps {
    invoices: Invoice[]
}

function formatZAR(amount: number): string {
    return `R ${amount.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function InvoiceList({ invoices }: InvoiceListProps) {
    return (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                    <TableRow>
                        <TableHead className="w-[140px]">Invoice</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {invoices.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                                No invoices yet. Complete a booking to generate invoices.
                            </TableCell>
                        </TableRow>
                    ) : (
                        invoices.map((invoice) => (
                            <TableRow key={invoice.id}>
                                <TableCell className="font-medium font-mono text-xs">
                                    {invoice.id}
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={`
                                        ${invoice.status === 'PAID' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' : ''}
                                        ${invoice.status === 'PENDING' ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800' : ''}
                                        ${invoice.status === 'OVERDUE' ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' : ''}
                                        ${invoice.status === 'CANCELLED' ? 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700' : ''}
                                    `}>
                                        {invoice.status}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="secondary" className={`text-[10px] ${
                                        invoice.type === "DEPOSIT"
                                            ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                                            : "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400"
                                    }`}>
                                        {invoice.type} ({invoice.percentage}%)
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-slate-500 font-mono text-xs">
                                    {invoice.bookingRef}
                                </TableCell>
                                <TableCell className="text-slate-500 text-xs">
                                    {new Date(invoice.createdAt).toLocaleDateString("en-ZA", {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                    })}
                                </TableCell>
                                <TableCell className="text-right font-medium font-mono">
                                    {formatZAR(Number(invoice.amountZAR))}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <Download className="h-4 w-4 text-slate-400 hover:text-slate-600" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
