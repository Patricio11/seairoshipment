"use client"

import { useEffect, useState } from "react"
import { Loader2, AlertTriangle, Ship, MapPin, Anchor, FileText } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { BookingFormData, CostBreakdown } from "@/types"

interface StepCostBreakdownProps {
    formData: BookingFormData
    updateFormData: (data: Partial<BookingFormData>) => void
    onQuoteLoaded?: (quote: CostBreakdown) => void
}

function formatZAR(amount: number): string {
    return `R ${amount.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function StepCostBreakdown({ formData, updateFormData, onQuoteLoaded }: StepCostBreakdownProps) {
    const [quote, setQuote] = useState<CostBreakdown | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!formData.origin || !formData.destination || !formData.palletCount) {
            setError("Missing route or pallet information.")
            setLoading(false)
            return
        }
        if (!formData.containerId) {
            setError("Pick a container before we can quote — rates depend on container type.")
            setLoading(false)
            return
        }
        if (!formData.salesRateTypeId) {
            setError("Select a service type (SRS or SCS) before quoting.")
            setLoading(false)
            return
        }

        let cancelled = false

        async function fetchQuote() {
            setLoading(true)
            setError(null)
            try {
                const params = new URLSearchParams({
                    origin: formData.origin,
                    destination: formData.destination,
                    palletCount: String(formData.palletCount),
                    salesRateTypeId: formData.salesRateTypeId!,
                    containerId: formData.containerId,
                })
                const res = await fetch(`/api/rates/quote?${params}`)
                if (!res.ok) {
                    const data = await res.json()
                    throw new Error(data.error || "Failed to fetch quote")
                }
                const data: CostBreakdown = await res.json()
                if (!cancelled) {
                    setQuote(data)
                    onQuoteLoaded?.(data)
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : "Failed to calculate costs")
                }
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        fetchQuote()
        return () => { cancelled = true }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData.origin, formData.destination, formData.palletCount, formData.salesRateTypeId, formData.containerId])

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-brand-blue" />
                <p className="text-sm text-slate-500">Calculating costs...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
                <AlertTriangle className="h-8 w-8 text-amber-500" />
                <p className="text-sm text-slate-500">{error}</p>
            </div>
        )
    }

    if (!quote) return null

    const noRatesAvailable = !quote.hasOriginRates && !quote.hasOceanRates && !quote.hasDestinationRates

    if (noRatesAvailable) {
        return (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
                <AlertTriangle className="h-8 w-8 text-amber-500" />
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    No rates available for this route
                </p>
                <p className="text-xs text-slate-500 text-center max-w-md">
                    Pricing for {quote.originName} → {quote.destinationName} has not been configured yet.
                    Please contact us for a custom quote.
                </p>
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Route header */}
            <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-3 text-lg font-bold text-slate-900 dark:text-white">
                    <MapPin className="h-5 w-5 text-brand-blue" />
                    {quote.originName}
                    <span className="text-slate-400">→</span>
                    {quote.destinationName}
                    <Anchor className="h-5 w-5 text-brand-blue" />
                </div>
                <div className="flex items-center justify-center gap-2">
                    <Badge variant="outline" className="text-xs">
                        <Ship className="h-3 w-3 mr-1" />
                        {formData.palletCount} Pallets
                    </Badge>
                    <Badge variant="outline" className="text-xs bg-blue-50 text-brand-blue border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
                        40ft HC Reefer
                    </Badge>
                </div>
            </div>

            {/* PO / Reference Number */}
            <div className="space-y-2">
                <Label htmlFor="poNumber" className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-brand-blue" />
                    PO / Reference Number
                    <span className="text-xs font-normal text-slate-400">(Optional)</span>
                </Label>
                <Input
                    id="poNumber"
                    placeholder="Enter your PO or reference number"
                    value={formData.poNumber || ""}
                    onChange={(e) => updateFormData({ poNumber: e.target.value })}
                    className="border-slate-200 dark:border-slate-700"
                />
                <p className="text-[11px] text-slate-400">This reference will appear on your invoices for easy tracking.</p>
            </div>

            {/* Cost breakdown card */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-lg">
                <CardHeader className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                    <CardTitle className="text-base font-bold flex items-center justify-between">
                        <span>Cost Breakdown</span>
                        <span className="text-xs font-normal text-slate-500 uppercase tracking-wider">ZAR</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {/* Line items */}
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        <div className="flex justify-between items-center px-6 py-4">
                            <div className="flex flex-col">
                                <span className="font-medium text-slate-900 dark:text-white">Origin Landsides</span>
                                <span className="text-xs text-slate-500">Collection, handling, port charges</span>
                            </div>
                            <span className={`font-mono font-bold ${quote.hasOriginRates ? "text-slate-900 dark:text-white" : "text-slate-400"}`}>
                                {quote.hasOriginRates ? formatZAR(quote.originPerPallet) : "—"}
                            </span>
                        </div>

                        <div className="flex justify-between items-center px-6 py-4">
                            <div className="flex flex-col">
                                <span className="font-medium text-slate-900 dark:text-white">Ocean Freight</span>
                                <span className="text-xs text-slate-500">Shipping line, BAF, surcharges</span>
                            </div>
                            <span className={`font-mono font-bold ${quote.hasOceanRates ? "text-slate-900 dark:text-white" : "text-slate-400"}`}>
                                {quote.hasOceanRates ? formatZAR(quote.oceanPerPallet) : "—"}
                            </span>
                        </div>

                        <div className="flex justify-between items-center px-6 py-4">
                            <div className="flex flex-col">
                                <span className="font-medium text-slate-900 dark:text-white">Destination Charges</span>
                                <span className="text-xs text-slate-500">Delivery, customs, terminal handling</span>
                            </div>
                            <span className={`font-mono font-bold ${quote.hasDestinationRates ? "text-slate-900 dark:text-white" : "text-slate-400"}`}>
                                {quote.hasDestinationRates ? formatZAR(quote.destinationPerPallet) : "—"}
                            </span>
                        </div>
                    </div>

                    <Separator />

                    {/* Totals */}
                    <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/30 space-y-3">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <span className="font-semibold text-slate-700 dark:text-slate-300">Cost per pallet</span>
                                <Badge variant="secondary" className="text-xs font-mono">×1</Badge>
                            </div>
                            <span className="font-mono font-bold text-lg text-slate-900 dark:text-white">
                                {formatZAR(quote.totalPerPallet)}
                            </span>
                        </div>

                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <span className="font-bold text-slate-900 dark:text-white text-lg">Total</span>
                                <Badge variant="secondary" className="text-xs font-mono">×{quote.palletCount}</Badge>
                            </div>
                            <span className="font-mono font-black text-xl text-brand-blue">
                                {formatZAR(quote.totalCost)}
                            </span>
                        </div>
                    </div>

                    <Separator />

                    {/* Payment split */}
                    <div className="px-6 py-5 space-y-3">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Payment Schedule</p>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase">60% Deposit</span>
                                </div>
                                <p className="font-mono font-black text-lg text-emerald-700 dark:text-emerald-300">
                                    {formatZAR(quote.depositAmount)}
                                </p>
                                <p className="text-[10px] text-emerald-600/70 dark:text-emerald-500/70 mt-1">Due upon booking confirmation</p>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="h-2 w-2 rounded-full bg-slate-400" />
                                    <span className="text-xs font-bold text-slate-500 uppercase">40% Balance</span>
                                </div>
                                <p className="font-mono font-black text-lg text-slate-700 dark:text-slate-300">
                                    {formatZAR(quote.balanceAmount)}
                                </p>
                                <p className="text-[10px] text-slate-400 mt-1">Due before vessel departure</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
