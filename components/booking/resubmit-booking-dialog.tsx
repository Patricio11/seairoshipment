"use client"

import { useState, useEffect, useRef } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { AlertCircle, FileText, Loader2, RotateCcw, UploadCloud, X } from "lucide-react"
import { toast } from "sonner"
import { uploadFile, STORAGE_PATHS } from "@/lib/supabase"
import { useAuth } from "@/lib/auth/client"
import type { ClientBooking } from "@/types"

interface ExistingDoc {
    id: string
    originalName: string
    url: string
    type: string
}

interface ResubmitBookingDialogProps {
    booking: ClientBooking | null
    open: boolean
    onClose: () => void
    onSuccess: () => void
}

export function ResubmitBookingDialog({ booking, open, onClose, onSuccess }: ResubmitBookingDialogProps) {
    const { user } = useAuth()
    const inputRef = useRef<HTMLInputElement>(null)

    const [palletCount, setPalletCount] = useState(0)
    const [commodityName, setCommodityName] = useState("")
    const [temperature, setTemperature] = useState("")
    const [nettWeight, setNettWeight] = useState("")
    const [grossWeight, setGrossWeight] = useState("")
    const [consigneeName, setConsigneeName] = useState("")
    const [consigneeAddress, setConsigneeAddress] = useState("")

    const [existingDocs, setExistingDocs] = useState<ExistingDoc[]>([])
    const [newFiles, setNewFiles] = useState<File[]>([])
    const [loadingDocs, setLoadingDocs] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    // Load existing documents + seed form when dialog opens
    useEffect(() => {
        if (!booking || !open) return
        setPalletCount(booking.palletCount)
        setCommodityName(booking.commodityName || "")
        setTemperature(booking.temperature || "")
        setConsigneeName(booking.consigneeName || "")
        setConsigneeAddress(booking.consigneeAddress || "")
        setNewFiles([])

        const fetchDocs = async () => {
            setLoadingDocs(true)
            try {
                const res = await fetch(`/api/bookings/${booking.id}/documents`)
                if (res.ok) setExistingDocs(await res.json())
            } catch {
                // ignore
            } finally {
                setLoadingDocs(false)
            }
        }
        fetchDocs()
    }, [booking, open])

    if (!booking) return null

    const removeExistingDoc = async (docId: string) => {
        try {
            const res = await fetch(`/api/bookings/${booking.id}/documents?docId=${docId}`, { method: "DELETE" })
            if (res.ok) {
                setExistingDocs(prev => prev.filter(d => d.id !== docId))
                toast.success("Document removed")
            } else {
                toast.error("Failed to remove document")
            }
        } catch {
            toast.error("Failed to remove document")
        }
    }

    const addFiles = (incoming: FileList | null) => {
        if (!incoming || incoming.length === 0) return
        setNewFiles(prev => [...prev, ...Array.from(incoming)])
    }

    const removeNewFile = (index: number) => {
        setNewFiles(prev => prev.filter((_, i) => i !== index))
    }

    const handleSubmit = async () => {
        setSubmitting(true)
        try {
            // 1. Update allocation fields + status
            const res = await fetch(`/api/bookings/${booking.id}/resubmit`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    palletCount,
                    commodityName,
                    temperature,
                    nettWeight: nettWeight ? parseFloat(nettWeight) : null,
                    grossWeight: grossWeight ? parseFloat(grossWeight) : null,
                    consigneeName,
                    consigneeAddress,
                }),
            })
            if (!res.ok) {
                const err = await res.json()
                toast.error(err.error || "Failed to resubmit booking")
                setSubmitting(false)
                return
            }

            // 2. Upload any new documents
            if (newFiles.length > 0) {
                const accountPrefix = user?.accountNumber || "UNVERIFIED"
                const uploadResults = await Promise.allSettled(
                    newFiles.map(async (file) => {
                        const prefixedName = `${accountPrefix}_${file.name}`
                        const result = await uploadFile(file, STORAGE_PATHS.BOOKING_DOCUMENTS, prefixedName)
                        if (!result.success || !result.url) throw new Error(result.error || "Upload failed")
                        const docRes = await fetch(`/api/bookings/${booking.id}/documents`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                originalName: prefixedName,
                                storedName: result.path,
                                url: result.url,
                                type: "OTHER",
                            }),
                        })
                        if (!docRes.ok) throw new Error("Failed to save document record")
                    })
                )
                const failed = uploadResults.filter(r => r.status === "rejected").length
                if (failed > 0) {
                    toast.warning(`Booking resubmitted, but ${failed}/${newFiles.length} new document(s) failed to upload.`)
                } else {
                    toast.success("Booking resubmitted!", {
                        description: `Admin has been notified. You'll get a notification when it's reviewed.`,
                    })
                }
            } else {
                toast.success("Booking resubmitted!", {
                    description: `Admin has been notified. You'll get a notification when it's reviewed.`,
                })
            }

            onSuccess()
            onClose()
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to resubmit booking")
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
            <DialogContent className="sm:max-w-[680px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <RotateCcw className="h-5 w-5 text-brand-blue" />
                        Edit & Resubmit Booking
                    </DialogTitle>
                    <DialogDescription className="font-mono text-[10px] uppercase tracking-widest">
                        {booking.bookingRef} · {booking.id}
                    </DialogDescription>
                </DialogHeader>

                {/* Rejection reason banner */}
                {booking.rejectionReason && (
                    <div className="flex items-start gap-3 p-4 rounded-xl border border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20">
                        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-bold text-red-900 dark:text-red-300">Rejection Reason</p>
                            <p className="text-sm text-red-800 dark:text-red-400 mt-0.5">{booking.rejectionReason}</p>
                        </div>
                    </div>
                )}

                <div className="space-y-4 py-2">
                    {/* Cargo details */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold">Pallet Count</Label>
                            <Input
                                type="number"
                                min={1}
                                value={palletCount}
                                onChange={(e) => setPalletCount(parseInt(e.target.value) || 0)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold">Temperature</Label>
                            <Select value={temperature} onValueChange={setTemperature}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="frozen">-18°C (Frozen)</SelectItem>
                                    <SelectItem value="chilled">+5°C (Chilled)</SelectItem>
                                    <SelectItem value="ambient">+18°C (Ambient)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5 col-span-2">
                            <Label className="text-xs font-bold">Commodity / Product</Label>
                            <Input
                                value={commodityName}
                                onChange={(e) => setCommodityName(e.target.value)}
                                placeholder="e.g. Stone Fruit"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold">Nett Weight (kg)</Label>
                            <Input
                                type="number"
                                value={nettWeight}
                                onChange={(e) => setNettWeight(e.target.value)}
                                placeholder="e.g. 485"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold">Gross Weight (kg)</Label>
                            <Input
                                type="number"
                                value={grossWeight}
                                onChange={(e) => setGrossWeight(e.target.value)}
                                placeholder="e.g. 530"
                            />
                        </div>
                        <div className="space-y-1.5 col-span-2">
                            <Label className="text-xs font-bold">Consignee Name</Label>
                            <Input
                                value={consigneeName}
                                onChange={(e) => setConsigneeName(e.target.value)}
                                placeholder="e.g. Global Foods Ltd"
                            />
                        </div>
                        <div className="space-y-1.5 col-span-2">
                            <Label className="text-xs font-bold">Consignee Address</Label>
                            <Input
                                value={consigneeAddress}
                                onChange={(e) => setConsigneeAddress(e.target.value)}
                                placeholder="Delivery address"
                            />
                        </div>
                    </div>

                    {/* Documents */}
                    <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-3 flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5" /> Documents
                        </p>

                        {loadingDocs ? (
                            <div className="flex items-center gap-2 py-2 text-slate-500 text-sm">
                                <Loader2 className="h-4 w-4 animate-spin" /> Loading existing documents...
                            </div>
                        ) : (
                            <>
                                {/* Existing documents */}
                                {existingDocs.length > 0 && (
                                    <div className="space-y-2 mb-3">
                                        {existingDocs.map((doc) => (
                                            <div key={doc.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                                                <FileText className="h-4 w-4 text-brand-blue shrink-0" />
                                                <span className="flex-1 text-sm truncate">{doc.originalName}</span>
                                                <span className="text-[10px] text-slate-400 uppercase font-mono">Existing</span>
                                                <button
                                                    onClick={() => removeExistingDoc(doc.id)}
                                                    className="h-7 w-7 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center justify-center"
                                                    title="Remove"
                                                >
                                                    <X className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* New files */}
                                {newFiles.length > 0 && (
                                    <div className="space-y-2 mb-3">
                                        {newFiles.map((file, i) => (
                                            <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-emerald-300 bg-emerald-50 dark:border-emerald-700/40 dark:bg-emerald-950/20">
                                                <FileText className="h-4 w-4 text-emerald-600 shrink-0" />
                                                <span className="flex-1 text-sm truncate">{file.name}</span>
                                                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase font-mono font-bold">New</span>
                                                <button
                                                    onClick={() => removeNewFile(i)}
                                                    className="h-7 w-7 rounded-lg text-slate-400 hover:text-red-500 flex items-center justify-center"
                                                >
                                                    <X className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Add new files */}
                                <input
                                    ref={inputRef}
                                    type="file"
                                    multiple
                                    className="hidden"
                                    onChange={(e) => addFiles(e.target.files)}
                                />
                                <button
                                    type="button"
                                    onClick={() => inputRef.current?.click()}
                                    className="w-full py-4 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-brand-blue hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors flex flex-col items-center gap-1 text-slate-500 hover:text-brand-blue"
                                >
                                    <UploadCloud className="h-5 w-5" />
                                    <span className="text-sm font-medium">Add more documents</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="ghost" onClick={onClose} disabled={submitting}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={submitting || palletCount < 1}
                        className="bg-brand-blue hover:bg-brand-blue/90 text-white font-bold"
                    >
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RotateCcw className="h-4 w-4 mr-2" />}
                        {submitting ? "Resubmitting..." : "Resubmit Booking"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
