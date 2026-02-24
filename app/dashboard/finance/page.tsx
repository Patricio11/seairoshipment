"use client"

import { useEffect, useState, useMemo } from "react"
import { FinanceStats } from "@/components/finance/finance-stats"
import { PaymentTracker } from "@/components/finance/payment-tracker"
import { InvoiceList } from "@/components/finance/invoice-list"
import { Button } from "@/components/ui/button"
import { Download, CreditCard, Loader2 } from "lucide-react"
import type { Invoice } from "@/types"

export default function FinancePage() {
    const [invoices, setInvoices] = useState<Invoice[]>([])
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

    // Group invoices by bookingRef for payment trackers
    const bookingGroups = useMemo(() => {
        const groups: Record<string, { deposit?: Invoice; balance?: Invoice; total: number }> = {}
        for (const inv of invoices) {
            if (!groups[inv.bookingRef]) {
                groups[inv.bookingRef] = { total: Number(inv.subtotalZAR) }
            }
            if (inv.type === "DEPOSIT") {
                groups[inv.bookingRef].deposit = inv
            } else {
                groups[inv.bookingRef].balance = inv
            }
        }
        return groups
    }, [invoices])

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

            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-brand-blue" />
                </div>
            ) : (
                <>
                    <FinanceStats invoices={invoices} />

                    <div className="grid gap-8 lg:grid-cols-3">
                        {/* Left: Invoice List (2/3 width) */}
                        <div className="lg:col-span-2 space-y-4">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Recent Invoices</h3>
                            <InvoiceList invoices={invoices} />
                        </div>

                        {/* Right: Active Payment Trackers (1/3 width) */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Active Bookings</h3>
                            {Object.keys(bookingGroups).length === 0 ? (
                                <p className="text-sm text-slate-500">No active bookings yet.</p>
                            ) : (
                                Object.entries(bookingGroups).map(([ref, group]) => (
                                    <PaymentTracker
                                        key={ref}
                                        bookingRef={ref}
                                        totalAmount={group.total}
                                        depositInvoice={group.deposit}
                                        balanceInvoice={group.balance}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
