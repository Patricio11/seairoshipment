"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Loader2, AlertTriangle, Calendar, ThumbsUp, PencilLine, Save, Check } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { CBMCalculator } from "@/components/cbm/cbm-calculator"
import { CBM3DViz } from "@/components/cbm/cbm-3d-viz"
import type { CargoItem } from "@/lib/db/schema/pallet-allocations"

interface SharedCalc {
    id: string
    name: string
    cargoType: string
    cargoItems: CargoItem[]
    totalCBM: string
    volumetricWeightKg: string | null
    totalWeightKg: string | null
    createdAt: string
    updatedAt: string
}

type ActionMode = "approve" | "edit"

export default function SharedCBMPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = use(params)
    const [calc, setCalc] = useState<SharedCalc | null>(null)
    const [items, setItems] = useState<CargoItem[]>([])
    const [expiresAt, setExpiresAt] = useState<string | null>(null)
    const [allowApprove, setAllowApprove] = useState(false)
    const [allowEdit, setAllowEdit] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [approvedAt, setApprovedAt] = useState<string | null>(null)

    // Guest action dialog
    const [actionMode, setActionMode] = useState<ActionMode | null>(null)
    const [guestName, setGuestName] = useState("")
    const [guestEmail, setGuestEmail] = useState("")
    const [guestNote, setGuestNote] = useState("")
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        let cancelled = false
        fetch(`/api/share/cbm/${encodeURIComponent(token)}`, { cache: "no-store" })
            .then(async r => {
                const data = await r.json().catch(() => ({}))
                if (cancelled) return
                if (!r.ok) {
                    setError(data.error || "Couldn't open this share link")
                    return
                }
                setCalc(data.calculation)
                setItems(data.calculation?.cargoItems ?? [])
                setExpiresAt(data.expiresAt ?? null)
                setAllowApprove(!!data.allowApprove)
                setAllowEdit(!!data.allowEdit)
            })
            .catch(() => { if (!cancelled) setError("Couldn't open this share link") })
            .finally(() => { if (!cancelled) setLoading(false) })
        return () => { cancelled = true }
    }, [token])

    const itemsDirty = calc ? JSON.stringify(items) !== JSON.stringify(calc.cargoItems) : false

    const openAction = (mode: ActionMode) => {
        setActionMode(mode)
        setGuestNote("")
    }

    const closeAction = () => {
        if (submitting) return
        setActionMode(null)
    }

    const submitAction = async () => {
        if (!actionMode || !calc) return
        if (!guestName.trim() || !guestEmail.trim()) {
            toast.error("Name and email are both required")
            return
        }
        setSubmitting(true)
        try {
            const endpoint = actionMode === "approve" ? "approve" : "edit"
            const res = await fetch(`/api/share/cbm/${encodeURIComponent(token)}/${endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: guestName.trim(),
                    email: guestEmail.trim(),
                    note: guestNote.trim() || undefined,
                    ...(actionMode === "edit" ? { items } : {}),
                }),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
                toast.error(data.error || "Couldn't submit - please try again")
                return
            }
            if (actionMode === "approve") {
                setApprovedAt(new Date().toISOString())
                toast.success("Thanks - the owner has been notified")
            } else {
                toast.success("Saved - the owner has been notified")
                // Refresh the calc so the "dirty" check resets and the
                // new server-recomputed totals (if any) are reflected.
                if (calc) setCalc({ ...calc, cargoItems: items })
            }
            setActionMode(null)
        } catch {
            toast.error("Couldn't submit - please try again")
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950">
            <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <Image
                            src="/seairo-logo.png"
                            alt="Seairo Cargo - Shared Reefer Services"
                            width={120}
                            height={40}
                            className="h-9 w-auto object-contain"
                            priority
                        />
                    </Link>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Shared calculation · {allowEdit ? "editable" : "read-only"}
                    </span>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-10 sm:py-14">
                {loading ? (
                    <div className="flex items-center justify-center py-20 text-slate-500 gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" /> Loading…
                    </div>
                ) : error || !calc ? (
                    <div className="rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-900/10 p-6 max-w-xl mx-auto">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-bold text-amber-900 dark:text-amber-200">Share link unavailable</p>
                                <p className="text-sm text-amber-800 dark:text-amber-200/80 mt-1">
                                    {error || "This link is no longer active. Ask the sender for a fresh one."}
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-brand-blue">
                                Seairo Shared Reefer Services
                            </p>
                            <h1 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                                {calc.name}
                            </h1>
                            <div className="mt-2 flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                                <span className="font-mono">
                                    {Number(calc.totalCBM).toFixed(2)} m³
                                    {calc.totalWeightKg && Number(calc.totalWeightKg) > 0 && (
                                        <> · {(Number(calc.totalWeightKg) / 1000).toFixed(2)} t</>
                                    )}
                                </span>
                                {expiresAt && (
                                    <span className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        Expires {new Date(expiresAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}
                                    </span>
                                )}
                                {allowApprove && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 font-semibold">
                                        <ThumbsUp className="h-3 w-3" /> Approval enabled
                                    </span>
                                )}
                                {allowEdit && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 font-semibold">
                                        <PencilLine className="h-3 w-3" /> Edit enabled
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                            <div className="lg:col-span-3">
                                <CBMCalculator
                                    value={items}
                                    onChange={allowEdit ? setItems : () => { /* read-only */ }}
                                    readOnly={!allowEdit}
                                />
                            </div>
                            <div className="lg:col-span-2">
                                <CBM3DViz items={items} containerVolumeCBM={67.7} />
                            </div>
                        </div>

                        {/* Action footer - Approve and/or Save edits */}
                        {(allowApprove || allowEdit) && (
                            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div className="text-sm text-slate-600 dark:text-slate-400 max-w-md">
                                    {approvedAt ? (
                                        <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                                            <Check className="h-4 w-4" /> You approved this calculation.
                                        </span>
                                    ) : allowApprove && allowEdit ? (
                                        <>You can save edits or approve the calculation as it is - the owner is notified either way.</>
                                    ) : allowApprove ? (
                                        <>Confirm these dimensions look right. The owner will be notified.</>
                                    ) : (
                                        <>Make changes inline and save - the owner is notified of every edit.</>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    {allowEdit && (
                                        <Button
                                            onClick={() => openAction("edit")}
                                            disabled={!itemsDirty}
                                            className="bg-amber-500 hover:bg-amber-600 text-white"
                                        >
                                            <Save className="mr-2 h-4 w-4" />
                                            Save changes
                                        </Button>
                                    )}
                                    {allowApprove && !approvedAt && (
                                        <Button
                                            onClick={() => openAction("approve")}
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                        >
                                            <ThumbsUp className="mr-2 h-4 w-4" />
                                            Approve calculation
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="text-center pt-4 border-t border-slate-200 dark:border-slate-800">
                            <p className="text-xs text-slate-500">
                                Shared via Seairo Cargo - <Link href="/" className="text-brand-blue hover:underline">seairo.com</Link>
                            </p>
                        </div>
                    </div>
                )}
            </main>

            {/* Guest action dialog - used for both Approve and Save changes */}
            <Dialog open={actionMode !== null} onOpenChange={(open) => !open && closeAction()}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {actionMode === "approve" ? (
                                <><ThumbsUp className="h-5 w-5 text-emerald-500" /> Approve this calculation</>
                            ) : (
                                <><Save className="h-5 w-5 text-amber-500" /> Save your edits</>
                            )}
                        </DialogTitle>
                        <DialogDescription>
                            {actionMode === "approve"
                                ? "Tell us who's confirming. The owner will be notified by email."
                                : "Tell us who's saving these changes. The owner will be notified by email and can revert if needed."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="guest-name">Your name</Label>
                            <Input
                                id="guest-name"
                                value={guestName}
                                onChange={e => setGuestName(e.target.value)}
                                placeholder="Anna Kovács"
                                autoFocus
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="guest-email">Your email</Label>
                            <Input
                                id="guest-email"
                                type="email"
                                value={guestEmail}
                                onChange={e => setGuestEmail(e.target.value)}
                                placeholder="anna@example.com"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="guest-note">Note (optional)</Label>
                            <Textarea
                                id="guest-note"
                                value={guestNote}
                                onChange={e => setGuestNote(e.target.value)}
                                placeholder={actionMode === "approve" ? "All good, please proceed with booking." : "Updated the carton size to match the new spec."}
                                rows={3}
                                maxLength={500}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={closeAction} disabled={submitting}>Cancel</Button>
                        <Button
                            onClick={submitAction}
                            disabled={submitting || !guestName.trim() || !guestEmail.trim()}
                            className={actionMode === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-amber-500 hover:bg-amber-600"}
                        >
                            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : actionMode === "approve" ? <ThumbsUp className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                            {submitting ? "Submitting…" : actionMode === "approve" ? "Approve" : "Save"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
