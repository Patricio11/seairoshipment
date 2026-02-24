"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, TrendingUp, AlertCircle } from "lucide-react"
import type { Invoice } from "@/types"

interface FinanceStatsProps {
    invoices: Invoice[]
}

function formatZAR(amount: number): string {
    return `R ${amount.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function FinanceStats({ invoices }: FinanceStatsProps) {
    const now = new Date()

    const pendingAndOverdue = invoices.filter(
        (inv) => inv.status === "PENDING" || inv.status === "OVERDUE"
    )
    const totalDue = pendingAndOverdue.reduce(
        (sum, inv) => sum + Number(inv.amountZAR),
        0
    )
    const overdueCount = invoices.filter((inv) => inv.status === "OVERDUE").length

    const paidThisYear = invoices.filter((inv) => {
        if (inv.status !== "PAID" || !inv.paidAt) return false
        return new Date(inv.paidAt).getFullYear() === now.getFullYear()
    })
    const paidYTD = paidThisYear.reduce(
        (sum, inv) => sum + Number(inv.amountZAR),
        0
    )

    const pendingInvoices = invoices
        .filter((inv) => inv.status === "PENDING")
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    const nextPayment = pendingInvoices[0]

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        Total Due (Outstanding)
                    </CardTitle>
                    <DollarSign className="h-4 w-4 text-slate-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {formatZAR(totalDue)}
                    </div>
                    {overdueCount > 0 ? (
                        <p className="text-xs text-red-500 flex items-center mt-1">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            {overdueCount} Invoice{overdueCount !== 1 ? "s" : ""} Overdue
                        </p>
                    ) : (
                        <p className="text-xs text-slate-500 mt-1">
                            {pendingAndOverdue.length} pending invoice{pendingAndOverdue.length !== 1 ? "s" : ""}
                        </p>
                    )}
                </CardContent>
            </Card>

            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        Paid YTD
                    </CardTitle>
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {formatZAR(paidYTD)}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                        {paidThisYear.length} payment{paidThisYear.length !== 1 ? "s" : ""} this year
                    </p>
                </CardContent>
            </Card>

            <Card className="bg-brand-blue border-none text-white">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-blue-100">
                        Next Payment Due
                    </CardTitle>
                    <DollarSign className="h-4 w-4 text-blue-100" />
                </CardHeader>
                <CardContent>
                    {nextPayment ? (
                        <>
                            <div className="text-2xl font-bold">
                                {formatZAR(Number(nextPayment.amountZAR))}
                            </div>
                            <p className="text-xs text-blue-200 mt-1">
                                Due {new Date(nextPayment.dueDate).toLocaleDateString("en-ZA", { month: "short", day: "numeric" })}
                                {" "}({nextPayment.type} — {nextPayment.bookingRef})
                            </p>
                        </>
                    ) : (
                        <>
                            <div className="text-2xl font-bold">—</div>
                            <p className="text-xs text-blue-200 mt-1">No pending payments</p>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
