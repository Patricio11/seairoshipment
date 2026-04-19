"use client"

import { useState } from "react"
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
import { Info, Loader2, PackagePlus } from "lucide-react"
import { toast } from "sonner"

interface RequestContainerDialogProps {
    open: boolean
    onClose: () => void
    prefill: {
        originCode: string
        destinationCode: string
        salesRateTypeId: string
        productId: string | null
        productName?: string | null
        temperature: string | null
        sailingId: string | null
        sailingLabel?: string | null
        palletCount?: number
    }
    onSuccess?: () => void
}

export function RequestContainerDialog({ open, onClose, prefill, onSuccess }: RequestContainerDialogProps) {
    const [palletCount, setPalletCount] = useState<number>(prefill.palletCount || 5)
    const [desiredEtd, setDesiredEtd] = useState<string>("")
    const [commodityNotes, setCommodityNotes] = useState("")
    const [notes, setNotes] = useState("")
    const [submitting, setSubmitting] = useState(false)

    const handleSubmit = async () => {
        if (palletCount < 1) {
            toast.error("Pallet count must be at least 1")
            return
        }
        setSubmitting(true)
        try {
            const res = await fetch("/api/container-requests", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    originCode: prefill.originCode,
                    destinationCode: prefill.destinationCode,
                    salesRateTypeId: prefill.salesRateTypeId,
                    productId: prefill.productId,
                    temperature: prefill.temperature,
                    sailingId: prefill.sailingId,
                    palletCount,
                    desiredEtd: desiredEtd || null,
                    commodityNotes: commodityNotes.trim() || null,
                    notes: notes.trim() || null,
                }),
            })
            const data = await res.json()
            if (!res.ok) {
                toast.error(data.error || "Failed to submit request")
                return
            }
            toast.success("Request submitted!", {
                description: `Reference: ${data.id}. Admin has been notified and will respond soon.`,
                duration: 6000,
            })
            setPalletCount(5)
            setDesiredEtd("")
            setCommodityNotes("")
            setNotes("")
            onSuccess?.()
            onClose()
        } catch {
            toast.error("Failed to submit request")
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
            <DialogContent className="sm:max-w-[520px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <PackagePlus className="h-5 w-5 text-brand-blue" />
                        Request a Container
                    </DialogTitle>
                    <DialogDescription>
                        No container matches your criteria right now. Submit a request and our admin team
                        will try to open a container for you.
                    </DialogDescription>
                </DialogHeader>

                {/* Summary of what they've selected */}
                <div className="space-y-2 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 text-xs">
                    <div className="flex items-center gap-2 text-brand-blue font-bold uppercase tracking-wider text-[10px]">
                        <Info className="h-3 w-3" /> Your requested spec
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        <span className="text-slate-500">Route</span>
                        <span className="font-mono font-bold">{prefill.originCode} → {prefill.destinationCode}</span>
                        <span className="text-slate-500">Service</span>
                        <span className="font-bold uppercase">{prefill.salesRateTypeId}</span>
                        {prefill.productName && (<>
                            <span className="text-slate-500">Product</span>
                            <span className="font-bold">{prefill.productName}</span>
                        </>)}
                        {prefill.temperature && (<>
                            <span className="text-slate-500">Temperature</span>
                            <span className="font-bold">{prefill.temperature}</span>
                        </>)}
                        {prefill.sailingLabel && (<>
                            <span className="text-slate-500">Sailing</span>
                            <span className="font-bold">{prefill.sailingLabel}</span>
                        </>)}
                    </div>
                </div>

                <div className="space-y-4">
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
                            <Label className="text-xs font-bold">Desired ETD (optional)</Label>
                            <Input
                                type="date"
                                value={desiredEtd}
                                onChange={(e) => setDesiredEtd(e.target.value)}
                            />
                        </div>
                    </div>

                    {!prefill.productId && (
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold">Describe the commodity</Label>
                            <Input
                                value={commodityNotes}
                                onChange={(e) => setCommodityNotes(e.target.value)}
                                placeholder="e.g. Frozen hake, 5kg boxes"
                            />
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold">Additional notes (optional)</Label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            placeholder="Any other details that might help the admin fulfill your request..."
                            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md p-2 text-sm resize-none focus:outline-none focus:border-brand-blue"
                        />
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
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <PackagePlus className="h-4 w-4 mr-2" />}
                        {submitting ? "Submitting..." : "Submit Request"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
