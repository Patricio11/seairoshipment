"use client"

import { FinanceStats } from "@/components/finance/finance-stats"
import { PaymentTracker } from "@/components/finance/payment-tracker"
import { InvoiceList } from "@/components/finance/invoice-list"
import { Button } from "@/components/ui/button"
import { Download, CreditCard } from "lucide-react"

export default function FinancePage() {
    return (
        <div className="space-y-8 pb-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                        Financial Hub
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">
                        Track invoices, manage split-payments, and view statements.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline">
                        <Download className="mr-2 h-4 w-4" />
                        Statement
                    </Button>
                    <Button className="bg-emerald-600 hover:bg-emerald-700">
                        <CreditCard className="mr-2 h-4 w-4" />
                        Make Payment
                    </Button>
                </div>
            </div>

            <FinanceStats />

            <div className="grid gap-8 lg:grid-cols-3">
                {/* Left: Invoice List (2/3 width) */}
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Recent Invoices</h3>
                    <InvoiceList />
                </div>

                {/* Right: Active Payment Trackers (1/3 width) */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Active Bookings</h3>
                    <PaymentTracker
                        refId="SRS-002"
                        totalAmount={4200}
                        depositPaid={true}
                        finalPaid={false}
                    />
                    <PaymentTracker
                        refId="SRS-003"
                        totalAmount={3800}
                        depositPaid={false}
                        finalPaid={false}
                    />
                    <PaymentTracker
                        refId="SRS-001"
                        totalAmount={2600}
                        depositPaid={true}
                        finalPaid={true}
                    />
                </div>
            </div>
        </div>
    )
}
