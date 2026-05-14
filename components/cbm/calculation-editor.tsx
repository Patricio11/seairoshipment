"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Save, Loader2, FileText, ArchiveX, Copy } from "lucide-react"
import { toast } from "sonner"
import { nanoid } from "nanoid"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { CBMCalculator } from "@/components/cbm/cbm-calculator"
import { CBM3DViz } from "@/components/cbm/cbm-3d-viz"
import type { CargoItem } from "@/lib/db/schema/pallet-allocations"

export interface CalculationEditorInitial {
    id: string
    name: string
    notes: string | null
    cargoItems: CargoItem[]
}

interface CalculationEditorProps {
    /** Set on /[id] page. Omitted on /new. */
    initial?: CalculationEditorInitial
}

export function CalculationEditor({ initial }: CalculationEditorProps) {
    const router = useRouter()
    const isEdit = !!initial
    const [name, setName] = useState(initial?.name ?? "")
    const [notes, setNotes] = useState(initial?.notes ?? "")
    const [items, setItems] = useState<CargoItem[]>(initial?.cargoItems ?? [])
    const [saving, setSaving] = useState(false)
    const [archiving, setArchiving] = useState(false)
    const [duplicating, setDuplicating] = useState(false)

    useEffect(() => {
        if (initial) {
            setName(initial.name)
            setNotes(initial.notes ?? "")
            setItems(initial.cargoItems)
        }
    }, [initial])

    const handleSave = async () => {
        if (!name.trim()) {
            toast.error("Give the calculation a name first")
            return
        }
        // Drop the auto-seeded blank row if the user never touched it
        const meaningfulItems = items.filter(it =>
            it.lengthMm > 0 && it.widthMm > 0 && it.heightMm > 0 && it.quantity > 0
        )
        if (meaningfulItems.length === 0) {
            toast.error("Add at least one cargo item with non-zero dimensions and quantity")
            return
        }

        setSaving(true)
        try {
            const url = isEdit
                ? `/api/dashboard/cbm-calculations/${initial!.id}`
                : "/api/dashboard/cbm-calculations"
            const method = isEdit ? "PATCH" : "POST"
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: name.trim(),
                    notes: notes.trim() || null,
                    cargoItems: meaningfulItems,
                }),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
                toast.error(data.error || "Couldn't save")
                return
            }
            toast.success(isEdit ? "Calculation updated" : "Calculation saved")
            if (!isEdit && data.calculation?.id) {
                router.push(`/dashboard/tools/cbm-calculator/${data.calculation.id}`)
            } else {
                router.refresh()
            }
        } catch {
            toast.error("Couldn't save")
        } finally {
            setSaving(false)
        }
    }

    const handleArchive = async () => {
        if (!initial) return
        if (!confirm(`Archive "${initial.name}"? You can still see it in past bookings; new calculations are made from scratch.`)) return
        setArchiving(true)
        try {
            const res = await fetch(`/api/dashboard/cbm-calculations/${initial.id}`, { method: "DELETE" })
            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                toast.error(data.error || "Couldn't archive")
                return
            }
            toast.success("Archived")
            router.push("/dashboard/tools/cbm-calculator")
        } catch {
            toast.error("Couldn't archive")
        } finally {
            setArchiving(false)
        }
    }

    const handleDuplicate = async () => {
        if (!initial) return
        setDuplicating(true)
        try {
            const meaningfulItems = items
                .filter(it => it.lengthMm > 0 && it.widthMm > 0 && it.heightMm > 0 && it.quantity > 0)
                // Fresh IDs so the duplicate is a clean new row, not a refs collision
                .map(it => ({ ...it, id: `ci-${nanoid(8)}` }))
            const res = await fetch("/api/dashboard/cbm-calculations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: `${initial.name} (copy)`,
                    notes: notes.trim() || null,
                    cargoItems: meaningfulItems,
                }),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
                toast.error(data.error || "Couldn't duplicate")
                return
            }
            toast.success("Duplicated")
            router.push(`/dashboard/tools/cbm-calculator/${data.calculation.id}`)
        } catch {
            toast.error("Couldn't duplicate")
        } finally {
            setDuplicating(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <Link
                    href="/dashboard/tools/cbm-calculator"
                    className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand-blue"
                >
                    <ArrowLeft className="h-3 w-3" />
                    All calculations
                </Link>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="h-12 w-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                        <FileText className="h-6 w-6 text-brand-blue" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Calculation name
                        </Label>
                        <Input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="e.g. Wine export — UK Q3"
                            className="mt-1 text-xl font-bold h-11 bg-white dark:bg-slate-950"
                            autoFocus={!isEdit}
                        />
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                    {isEdit && (
                        <>
                            <Button
                                variant="outline"
                                onClick={handleDuplicate}
                                disabled={duplicating || saving || archiving}
                                className="border-slate-200 dark:border-slate-800"
                            >
                                {duplicating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Copy className="mr-2 h-4 w-4" />}
                                Duplicate
                            </Button>
                            <Button
                                variant="outline"
                                onClick={handleArchive}
                                disabled={archiving || saving || duplicating}
                                className="border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                            >
                                {archiving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArchiveX className="mr-2 h-4 w-4" />}
                                Archive
                            </Button>
                        </>
                    )}
                    <Button
                        onClick={handleSave}
                        disabled={saving || archiving || duplicating}
                        className="bg-brand-blue hover:bg-brand-blue/90"
                    >
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        {isEdit ? "Save changes" : "Save calculation"}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3 space-y-4">
                    <CBMCalculator value={items} onChange={setItems} />

                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Notes (optional)</Label>
                        <Textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="Anything that helps you find this later — destination, season, special handling…"
                            className="min-h-[80px] bg-white dark:bg-slate-950"
                        />
                    </div>
                </div>

                <div className="lg:col-span-2">
                    <CBM3DViz items={items} containerVolumeCBM={67.7} />
                </div>
            </div>
        </div>
    )
}
