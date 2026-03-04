"use client"

import { useRef, useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
    Download,
    FileText,
    Calendar,
    Building2,
    CheckCircle2,
    Clock,
    XCircle,
    AlertTriangle,
    Loader2,
    Ship,
    MapPin,
    Hash,
} from "lucide-react"
import type { Invoice } from "@/types"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"

interface InvoiceViewDialogProps {
    invoice: Invoice | null
    open: boolean
    onOpenChange: (open: boolean) => void
}

function formatZAR(amount: number): string {
    return `R ${amount.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function getStatusConfig(status: string) {
    switch (status) {
        case "PAID":
            return {
                icon: CheckCircle2,
                color: "text-emerald-600 dark:text-emerald-400",
                bg: "bg-emerald-50 dark:bg-emerald-900/20",
                border: "border-emerald-200 dark:border-emerald-800",
                label: "Paid",
            }
        case "PENDING":
            return {
                icon: Clock,
                color: "text-amber-600 dark:text-amber-400",
                bg: "bg-amber-50 dark:bg-amber-900/20",
                border: "border-amber-200 dark:border-amber-800",
                label: "Pending",
            }
        case "OVERDUE":
            return {
                icon: AlertTriangle,
                color: "text-red-600 dark:text-red-400",
                bg: "bg-red-50 dark:bg-red-900/20",
                border: "border-red-200 dark:border-red-800",
                label: "Overdue",
            }
        case "CANCELLED":
            return {
                icon: XCircle,
                color: "text-slate-500 dark:text-slate-400",
                bg: "bg-slate-50 dark:bg-slate-800",
                border: "border-slate-200 dark:border-slate-700",
                label: "Cancelled",
            }
        default:
            return {
                icon: Clock,
                color: "text-slate-500",
                bg: "bg-slate-50",
                border: "border-slate-200",
                label: status,
            }
    }
}

export function InvoiceViewDialog({ invoice, open, onOpenChange }: InvoiceViewDialogProps) {
    const invoiceRef = useRef<HTMLDivElement>(null)
    const [downloading, setDownloading] = useState(false)

    if (!invoice) return null

    const statusConfig = getStatusConfig(invoice.status)
    const StatusIcon = statusConfig.icon

    const palletCount = invoice.palletCount || 1
    const originCharges = Number(invoice.originChargesZAR || 0)
    const oceanFreight = Number(invoice.oceanFreightZAR || 0)
    const destinationCharges = Number(invoice.destinationChargesZAR || 0)
    const subtotal = Number(invoice.subtotalZAR)
    const amount = Number(invoice.amountZAR)

    const originPerPallet = palletCount > 0 ? originCharges / palletCount : 0
    const oceanPerPallet = palletCount > 0 ? oceanFreight / palletCount : 0
    const destPerPallet = palletCount > 0 ? destinationCharges / palletCount : 0

    const handleDownloadPDF = async () => {
        if (!invoiceRef.current) return
        setDownloading(true)
        try {
            const actionButtons = invoiceRef.current.querySelector(".invoice-actions")
            if (actionButtons) (actionButtons as HTMLElement).style.display = "none"

            const canvas = await html2canvas(invoiceRef.current, {
                useCORS: true,
                allowTaint: true,
                scale: 2,
                backgroundColor: "#ffffff",
            } as Parameters<typeof html2canvas>[1])

            if (actionButtons) (actionButtons as HTMLElement).style.display = "flex"

            const imgData = canvas.toDataURL("image/png")
            const pdf = new jsPDF({
                orientation: "portrait",
                unit: "px",
                format: [canvas.width, canvas.height],
            })
            pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height)
            pdf.save(`invoice-${invoice.id}.pdf`)
        } catch (err) {
            console.error("Error downloading PDF:", err)
        } finally {
            setDownloading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="max-w-[210mm] max-h-[90vh] overflow-y-auto p-0"
                onInteractOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
            >
                <div ref={invoiceRef} className="bg-white dark:bg-slate-900">
                    {/* Header */}
                    <div className="p-6 pb-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-white">Invoice</DialogTitle>
                        </DialogHeader>
                        <div className="flex gap-2 invoice-actions">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleDownloadPDF}
                                disabled={downloading}
                            >
                                {downloading ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <Download className="h-4 w-4 mr-2" />
                                )}
                                Download PDF
                            </Button>
                        </div>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Invoice Details + Bill To */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Left — Invoice Details */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Invoice Details</h3>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-sm">
                                        <FileText className="h-4 w-4 text-slate-400" />
                                        <span className="font-medium text-slate-600 dark:text-slate-400">Invoice #:</span>
                                        <span className="font-mono font-bold text-slate-900 dark:text-white">{invoice.id}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <Hash className="h-4 w-4 text-slate-400" />
                                        <span className="font-medium text-slate-600 dark:text-slate-400">Booking Ref:</span>
                                        <span className="font-mono font-bold text-slate-900 dark:text-white">{invoice.bookingRef}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <Calendar className="h-4 w-4 text-slate-400" />
                                        <span className="font-medium text-slate-600 dark:text-slate-400">Date:</span>
                                        <span className="text-slate-900 dark:text-white">
                                            {new Date(invoice.createdAt).toLocaleDateString("en-ZA", {
                                                day: "numeric",
                                                month: "long",
                                                year: "numeric",
                                            })}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <Calendar className="h-4 w-4 text-slate-400" />
                                        <span className="font-medium text-slate-600 dark:text-slate-400">Due Date:</span>
                                        <span className="text-slate-900 dark:text-white">
                                            {new Date(invoice.dueDate).toLocaleDateString("en-ZA", {
                                                day: "numeric",
                                                month: "long",
                                                year: "numeric",
                                            })}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${statusConfig.bg} ${statusConfig.border}`}>
                                            <StatusIcon className={`h-3.5 w-3.5 ${statusConfig.color}`} />
                                            <span className={`text-xs font-bold ${statusConfig.color}`}>{statusConfig.label}</span>
                                        </div>
                                        <Badge variant="secondary" className={`text-[10px] ${
                                            invoice.type === "DEPOSIT"
                                                ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                                                : "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400"
                                        }`}>
                                            {invoice.type} ({invoice.percentage}%)
                                        </Badge>
                                    </div>
                                    {invoice.paidAt && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                            <span className="font-medium text-slate-600 dark:text-slate-400">Paid:</span>
                                            <span className="text-emerald-600 dark:text-emerald-400">
                                                {new Date(invoice.paidAt).toLocaleDateString("en-ZA", {
                                                    day: "numeric",
                                                    month: "long",
                                                    year: "numeric",
                                                })}
                                            </span>
                                        </div>
                                    )}
                                    {invoice.poNumber && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <FileText className="h-4 w-4 text-brand-blue" />
                                            <span className="font-medium text-slate-600 dark:text-slate-400">PO / Ref:</span>
                                            <span className="font-mono font-bold text-brand-blue">{invoice.poNumber}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right — From + Bill To */}
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">From</h3>
                                    <div className="space-y-1.5 text-sm">
                                        <div className="flex items-center gap-2">
                                            <Building2 className="h-4 w-4 text-slate-400" />
                                            <span className="font-bold text-slate-900 dark:text-white">SRS Logistics</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <MapPin className="h-4 w-4 text-slate-400" />
                                            <span className="text-slate-600 dark:text-slate-400">Cape Town, South Africa</span>
                                        </div>
                                    </div>
                                </div>

                                {(invoice.companyName || invoice.clientName) && (
                                    <div className="space-y-2">
                                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Bill To</h3>
                                        <div className="space-y-1.5 text-sm">
                                            {invoice.clientName && (
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="h-4 w-4 text-slate-400" />
                                                    <span className="font-bold text-slate-900 dark:text-white">{invoice.clientName}</span>
                                                </div>
                                            )}
                                            {invoice.companyName && (
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="h-4 w-4 text-slate-400" />
                                                    <span className="text-slate-600 dark:text-slate-400">{invoice.companyName}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Route info */}
                        <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                            <Ship className="h-4 w-4 text-brand-blue" />
                            <span className="text-sm font-bold text-slate-900 dark:text-white">{invoice.route}</span>
                            <span className="text-slate-400 mx-1">|</span>
                            <span className="text-sm text-slate-500">{invoice.palletCount} Pallets</span>
                        </div>

                        <Separator />

                        {/* Line Items Table */}
                        <div>
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">Charge Breakdown</h3>
                            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-800/50">
                                            <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500">Description</th>
                                            <th className="text-center py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500">Pallets</th>
                                            <th className="text-right py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500">Per Pallet</th>
                                            <th className="text-right py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        <tr>
                                            <td className="py-3 px-4 text-sm font-medium text-slate-900 dark:text-white">Origin Charges</td>
                                            <td className="py-3 px-4 text-sm text-center text-slate-600 dark:text-slate-400">{palletCount}</td>
                                            <td className="py-3 px-4 text-sm text-right font-mono text-slate-600 dark:text-slate-400">{formatZAR(originPerPallet)}</td>
                                            <td className="py-3 px-4 text-sm text-right font-mono font-bold text-slate-900 dark:text-white">{formatZAR(originCharges)}</td>
                                        </tr>
                                        <tr>
                                            <td className="py-3 px-4 text-sm font-medium text-slate-900 dark:text-white">Ocean Freight</td>
                                            <td className="py-3 px-4 text-sm text-center text-slate-600 dark:text-slate-400">{palletCount}</td>
                                            <td className="py-3 px-4 text-sm text-right font-mono text-slate-600 dark:text-slate-400">{formatZAR(oceanPerPallet)}</td>
                                            <td className="py-3 px-4 text-sm text-right font-mono font-bold text-slate-900 dark:text-white">{formatZAR(oceanFreight)}</td>
                                        </tr>
                                        <tr>
                                            <td className="py-3 px-4 text-sm font-medium text-slate-900 dark:text-white">Destination Charges</td>
                                            <td className="py-3 px-4 text-sm text-center text-slate-600 dark:text-slate-400">{palletCount}</td>
                                            <td className="py-3 px-4 text-sm text-right font-mono text-slate-600 dark:text-slate-400">{formatZAR(destPerPallet)}</td>
                                            <td className="py-3 px-4 text-sm text-right font-mono font-bold text-slate-900 dark:text-white">{formatZAR(destinationCharges)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Totals */}
                        <div className="flex justify-end">
                            <div className="w-full max-w-sm space-y-2">
                                <div className="flex justify-between items-center py-2 text-sm">
                                    <span className="font-medium text-slate-600 dark:text-slate-400">Subtotal (Full Shipment)</span>
                                    <span className="font-mono font-bold text-slate-900 dark:text-white">{formatZAR(subtotal)}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 text-sm">
                                    <span className="font-medium text-slate-600 dark:text-slate-400">
                                        {invoice.type === "DEPOSIT" ? "60% Deposit" : "40% Balance"}
                                    </span>
                                    <span className="font-mono text-slate-500">{invoice.percentage}%</span>
                                </div>
                                <Separator />
                                <div className="flex justify-between items-center py-3">
                                    <span className="text-lg font-bold text-slate-900 dark:text-white">Amount Due</span>
                                    <span className="text-xl font-mono font-black text-brand-blue">{formatZAR(amount)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
                            <p className="text-xs text-slate-400">
                                Generated by <span className="font-semibold text-brand-blue">SRS Logistics</span> | Shared Reefer Solutions
                            </p>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
