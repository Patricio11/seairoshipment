"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, TrendingUp, AlertCircle } from "lucide-react"

export function FinanceStats() {
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
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">$12,450.00</div>
                    <p className="text-xs text-red-500 flex items-center mt-1">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        2 Invoices Overdue
                    </p>
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
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">$148,200.00</div>
                    <p className="text-xs text-slate-500 mt-1">
                        +12% from last month
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
                    <div className="text-2xl font-bold">$4,200.00</div>
                    <p className="text-xs text-blue-200 mt-1">
                        Due in 3 days (Nov 15)
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
