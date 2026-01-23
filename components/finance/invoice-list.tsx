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

const invoices = [
    {
        invoice: "INV-2025-001",
        status: "Paid",
        totalAmount: "$2,600.00",
        ref: "SRS-001",
        date: "Oct 24, 2025",
    },
    {
        invoice: "INV-2025-002",
        status: "Pending",
        totalAmount: "$4,200.00",
        ref: "SRS-002",
        date: "Nov 02, 2025",
    },
    {
        invoice: "INV-2025-003",
        status: "Overdue",
        totalAmount: "$1,850.00",
        ref: "SRS-001 (Final)",
        date: "Sep 15, 2025",
    },
]

export function InvoiceList() {
    return (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                    <TableRow>
                        <TableHead className="w-[100px]">Invoice</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {invoices.map((invoice) => (
                        <TableRow key={invoice.invoice}>
                            <TableCell className="font-medium">{invoice.invoice}</TableCell>
                            <TableCell>
                                <Badge variant="outline" className={`
                                ${invoice.status === 'Paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : ''}
                                ${invoice.status === 'Pending' ? 'bg-amber-50 text-amber-600 border-amber-200' : ''}
                                ${invoice.status === 'Overdue' ? 'bg-red-50 text-red-600 border-red-200' : ''}
                            `}>
                                    {invoice.status}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-slate-500 font-mono text-xs">{invoice.ref}</TableCell>
                            <TableCell className="text-slate-500 text-xs">{invoice.date}</TableCell>
                            <TableCell className="text-right font-medium">{invoice.totalAmount}</TableCell>
                            <TableCell className="text-right">
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <Download className="h-4 w-4 text-slate-400 hover:text-slate-600" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
