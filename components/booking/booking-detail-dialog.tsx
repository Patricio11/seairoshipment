"use client"

import { useEffect, useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
    Ship,
    Package,
    Thermometer,
    MapPin,
    Calendar,
    ArrowRight,
    CreditCard,
    User,
    FileText,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { ClientBooking } from "@/types"
import { AllocationDocs, type AllocationDoc } from "@/components/admin/allocation-docs"

interface BookingDetailDialogProps {
    booking: ClientBooking | null
    open: boolean
    onOpenChange: (open: boolean) => void
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
    PENDING: { label: "Pending", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
    DEPOSIT_PAID: { label: "Deposit Paid", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
    CONFIRMED: { label: "Confirmed", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
    SAILING: { label: "Sailing", className: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" },
    DELIVERED: { label: "Delivered", className: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" },
    CANCELLED: { label: "Cancelled", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
}

const PAYMENT_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    PENDING: { label: "Pending", color: "text-amber-600 dark:text-amber-400" },
    PAID: { label: "Paid", color: "text-emerald-600 dark:text-emerald-400" },
    OVERDUE: { label: "Overdue", color: "text-red-600 dark:text-red-400" },
    CANCELLED: { label: "Cancelled", color: "text-slate-500" },
}

function formatDate(dateStr: string | null) {
    if (!dateStr) return "TBD"
    return new Date(dateStr).toLocaleDateString("en-ZA", {
        day: "numeric",
        month: "short",
        year: "numeric",
    })
}

function formatCurrency(amount: string | null) {
    if (!amount) return "—"
    return `R ${Number(amount).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`
}

export function BookingDetailDialog({ booking, open, onOpenChange }: BookingDetailDialogProps) {
    const [docs, setDocs] = useState<AllocationDoc[]>([])
    const [loadingDocs, setLoadingDocs] = useState(false)
    const [viewDoc, setViewDoc] = useState<AllocationDoc | null>(null)

    useEffect(() => {
        if (!booking || !open) return
        let cancelled = false
        const load = async () => {
            setLoadingDocs(true)
            try {
                const res = await fetch(`/api/bookings/${booking.id}/documents`)
                if (!res.ok) return
                const data = await res.json()
                const flat = Array.isArray(data) ? data : (data.flat || [])
                if (!cancelled) setDocs(flat)
            } catch {
                // ignore
            } finally {
                if (!cancelled) setLoadingDocs(false)
            }
        }
        load()
        return () => { cancelled = true }
    }, [booking, open])

    if (!booking) return null

    const statusConfig = STATUS_CONFIG[booking.status] || STATUS_CONFIG.PENDING
    const routeParts = booking.routeLabel.includes("→")
        ? booking.routeLabel.split("→").map((s) => s.trim())
        : booking.routeLabel.split("-")

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="max-w-lg max-h-[90vh] overflow-y-auto"
                onInteractOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
            >
                <DialogHeader>
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <DialogTitle className="text-xl font-black tracking-tight">
                                {booking.bookingRef}
                            </DialogTitle>
                            <DialogDescription className="text-sm text-slate-500 mt-0.5">
                                Booked {formatDate(booking.createdAt)}
                            </DialogDescription>
                        </div>
                        <Badge className={cn("rounded-lg px-2.5 py-1 text-[10px] font-black tracking-wider border-none", statusConfig.className)}>
                            {statusConfig.label}
                        </Badge>
                    </div>
                </DialogHeader>

                <div className="space-y-5 mt-2">
                    {/* Container & Vessel */}
                    <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 space-y-3">
                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
                            <Ship className="h-3.5 w-3.5" />
                            Container & Vessel
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-[10px] font-bold uppercase text-slate-400">Vessel</p>
                                <p className="text-sm font-bold text-slate-900 dark:text-white">{booking.vessel}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase text-slate-400">Voyage</p>
                                <p className="text-sm font-bold text-slate-900 dark:text-white">{booking.voyageNumber || "—"}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase text-slate-400">Container Type</p>
                                <p className="text-sm font-bold text-slate-900 dark:text-white">{booking.containerType} Reefer</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase text-slate-400">Container Status</p>
                                <p className="text-sm font-bold text-slate-900 dark:text-white capitalize">{booking.containerStatus.toLowerCase().replace("_", " ")}</p>
                            </div>
                        </div>
                    </div>

                    {/* Route & Schedule */}
                    <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 space-y-3">
                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
                            <MapPin className="h-3.5 w-3.5" />
                            Route & Schedule
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="text-center">
                                <p className="text-sm font-bold text-slate-900 dark:text-white">{routeParts[0]}</p>
                                <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-500">
                                    <Calendar className="h-3 w-3" />
                                    ETD: {formatDate(booking.etd)}
                                </div>
                            </div>
                            <ArrowRight className="h-4 w-4 text-slate-300 shrink-0 mx-3" />
                            <div className="text-center">
                                <p className="text-sm font-bold text-slate-900 dark:text-white">{routeParts[1] || "—"}</p>
                                <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-500">
                                    <Calendar className="h-3 w-3" />
                                    ETA: {formatDate(booking.eta)}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Cargo Details */}
                    <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 space-y-3">
                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
                            <Package className="h-3.5 w-3.5" />
                            Cargo Details
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-[10px] font-bold uppercase text-slate-400">Commodity</p>
                                <p className="text-sm font-bold text-slate-900 dark:text-white">{booking.commodityName || "—"}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase text-slate-400">Pallets</p>
                                <p className="text-sm font-bold text-slate-900 dark:text-white">{booking.palletCount}</p>
                            </div>
                            {booking.temperature && (
                                <div className="col-span-2 flex items-center gap-2">
                                    <Thermometer className="h-3.5 w-3.5 text-blue-500" />
                                    <span className="text-sm font-bold text-slate-900 dark:text-white capitalize">{booking.temperature}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Consignee */}
                    {booking.consigneeName && (
                        <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 space-y-3">
                            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
                                <User className="h-3.5 w-3.5" />
                                Consignee
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-900 dark:text-white">{booking.consigneeName}</p>
                                {booking.consigneeAddress && (
                                    <p className="text-xs text-slate-500 mt-1">{booking.consigneeAddress}</p>
                                )}
                            </div>
                        </div>
                    )}

                    <Separator />

                    {/* Payment Status */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
                            <CreditCard className="h-3.5 w-3.5" />
                            Payment Status
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-3">
                                <p className="text-[10px] font-bold uppercase text-slate-400">Deposit (60%)</p>
                                <p className="text-lg font-black text-slate-900 dark:text-white mt-1">
                                    {formatCurrency(booking.depositAmount)}
                                </p>
                                {booking.depositStatus && (
                                    <p className={cn("text-xs font-bold mt-1", PAYMENT_STATUS_CONFIG[booking.depositStatus]?.color || "text-slate-500")}>
                                        {PAYMENT_STATUS_CONFIG[booking.depositStatus]?.label || booking.depositStatus}
                                    </p>
                                )}
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-3">
                                <p className="text-[10px] font-bold uppercase text-slate-400">Balance (40%)</p>
                                <p className="text-lg font-black text-slate-900 dark:text-white mt-1">
                                    {formatCurrency(booking.balanceAmount)}
                                </p>
                                {booking.balanceStatus && (
                                    <p className={cn("text-xs font-bold mt-1", PAYMENT_STATUS_CONFIG[booking.balanceStatus]?.color || "text-slate-500")}>
                                        {PAYMENT_STATUS_CONFIG[booking.balanceStatus]?.label || booking.balanceStatus}
                                    </p>
                                )}
                            </div>
                        </div>
                        {booking.totalAmount && (
                            <div className="text-right">
                                <span className="text-[10px] font-bold uppercase text-slate-400">Total: </span>
                                <span className="text-sm font-black text-slate-900 dark:text-white">
                                    {formatCurrency(booking.totalAmount)}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Documents */}
                    <Separator />
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <FileText className="h-4 w-4 text-brand-blue" />
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Documents</p>
                        </div>
                        <AllocationDocs docs={docs} loading={loadingDocs} onView={setViewDoc} />
                    </div>
                </div>
            </DialogContent>

            {/* Document viewer overlay */}
            {viewDoc && (
                <Dialog open={!!viewDoc} onOpenChange={(v) => { if (!v) setViewDoc(null) }}>
                    <DialogContent className="sm:max-w-[900px] h-[90vh] p-0 flex flex-col gap-0">
                        <DialogHeader className="px-6 py-4 border-b shrink-0">
                            <DialogTitle className="text-sm font-black truncate">{viewDoc.originalName}</DialogTitle>
                            {viewDoc.metashipDownloadUrl && (
                                <p className="text-[10px] text-slate-500 mt-1">MetaShip download links expire after 15 minutes — reopen this view to get a fresh link.</p>
                            )}
                        </DialogHeader>
                        <div className="flex-1 overflow-auto bg-slate-100 dark:bg-slate-900 p-4 flex items-start justify-center">
                            {(viewDoc.metashipDownloadUrl || viewDoc.url) && /\.pdf$/i.test(viewDoc.originalName) ? (
                                <iframe
                                    src={viewDoc.metashipDownloadUrl || viewDoc.url || ""}
                                    title={viewDoc.originalName}
                                    className="w-full h-full bg-white rounded shadow-2xl"
                                    style={{ aspectRatio: "1 / 1.414", minHeight: "100%", maxWidth: "800px" }}
                                />
                            ) : (viewDoc.metashipDownloadUrl || viewDoc.url) && /\.(jpg|jpeg|png|gif|webp)$/i.test(viewDoc.originalName) ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                    src={viewDoc.metashipDownloadUrl || viewDoc.url || ""}
                                    alt={viewDoc.originalName}
                                    className="max-w-full max-h-full object-contain bg-white rounded shadow-2xl"
                                    style={{ maxWidth: "800px" }}
                                />
                            ) : (
                                <div className="py-12 text-center">
                                    <FileText className="h-12 w-12 mx-auto opacity-40 mb-3" />
                                    <p className="font-bold">Preview not available</p>
                                    <a
                                        href={viewDoc.metashipDownloadUrl || viewDoc.url || "#"}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="mt-4 inline-block px-4 py-2 rounded-lg bg-brand-blue text-white font-bold text-xs"
                                    >
                                        Download
                                    </a>
                                </div>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </Dialog>
    )
}
