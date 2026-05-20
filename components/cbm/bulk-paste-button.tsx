"use client"

import { useState } from "react"
import { ClipboardPaste, Loader2, AlertCircle, Check, FileDown } from "lucide-react"
import { toast } from "sonner"
import { nanoid } from "nanoid"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { toMm, toKg, type LengthUnit, type WeightUnit } from "@/lib/cbm"
import type { CargoItem } from "@/lib/db/schema/pallet-allocations"

interface BulkPasteButtonProps {
    onAdd: (newItems: CargoItem[]) => void
    disabled?: boolean
}

interface ParsedRow {
    label?: string
    lengthMm: number
    widthMm: number
    heightMm: number
    weightKg: number
    quantity: number
    error?: string
    lineNumber: number
    raw: string
}

/**
 * Parses tab- or comma-separated rows pasted from Excel / email packing
 * lists. Expected column orders (in either tab or comma format):
 *
 *   Label, Qty, L, W, H, Weight
 *   Qty, L, W, H, Weight  (label optional)
 *   L, W, H, Qty           (weight optional)
 *
 * Detection: rows with 4-6 fields where 4 are numeric. The first non-numeric
 * leading field is treated as label. Numeric fields land in L/W/H by order.
 *
 * Returns parsed rows with per-row error messages so the modal can preview
 * before commit.
 */
function parsePastedRows(text: string, lengthUnit: LengthUnit, weightUnit: WeightUnit): ParsedRow[] {
    // Strip empty lines + comment lines starting with `#` (the example CSV
    // uses these for instructions; useful for users editing in Excel too).
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith("#"))
    return lines.map((raw, idx): ParsedRow => {
        const lineNumber = idx + 1
        // Split on tab first (Excel paste); fall back to comma + multi-space.
        const fields = raw.includes("\t")
            ? raw.split("\t").map(f => f.trim()).filter(f => f.length > 0)
            : raw.split(/[,;]| {2,}/).map(f => f.trim()).filter(f => f.length > 0)

        if (fields.length < 4) {
            return { lineNumber, raw, lengthMm: 0, widthMm: 0, heightMm: 0, weightKg: 0, quantity: 0, error: "Need at least 4 numeric fields" }
        }

        // Detect leading label: first field is non-numeric and the rest contains ≥ 4 numbers
        let label: string | undefined
        let numericFields = fields
        const firstNumeric = !isNaN(Number(fields[0]))
        if (!firstNumeric && fields.length >= 5) {
            label = fields[0]
            numericFields = fields.slice(1)
        }

        const nums = numericFields.map(f => Number(f.replace(/[^0-9.\-]/g, "")))
        if (nums.some(n => !Number.isFinite(n) || n < 0)) {
            return { lineNumber, raw, lengthMm: 0, widthMm: 0, heightMm: 0, weightKg: 0, quantity: 0, error: "Negative or non-numeric value" }
        }

        let qty = 1
        let l: number, w: number, h: number, weightKg = 0

        if (nums.length === 4) {
            // L, W, H, Qty  (weight omitted)
            [l, w, h, qty] = nums
        } else if (nums.length >= 5) {
            // Two heuristics:
            //   (a) Qty, L, W, H, Weight  - the leading number is small (typically <500)
            //   (b) L, W, H, Weight, Qty  - the trailing number is small
            // Pick whichever has the smaller "qty" candidate.
            const leadingIsQty = nums[0] <= 999 && nums[0] < nums[nums.length - 1]
            if (leadingIsQty) {
                [qty, l, w, h, weightKg] = nums
            } else {
                [l, w, h, weightKg, qty] = nums
            }
        } else {
            return { lineNumber, raw, lengthMm: 0, widthMm: 0, heightMm: 0, weightKg: 0, quantity: 0, error: "Couldn't parse columns" }
        }

        const row: ParsedRow = {
            lineNumber, raw, label,
            lengthMm: Math.round(toMm(l, lengthUnit)),
            widthMm: Math.round(toMm(w, lengthUnit)),
            heightMm: Math.round(toMm(h, lengthUnit)),
            weightKg: toKg(weightKg, weightUnit),
            quantity: Math.max(1, Math.floor(qty)),
        }

        if ([row.lengthMm, row.widthMm, row.heightMm].some(v => v <= 0 || v > 10_000)) {
            row.error = "Dimensions out of range (0 < x ≤ 10 m)"
        }

        return row
    })
}

export function BulkPasteButton({ onAdd, disabled }: BulkPasteButtonProps) {
    const [open, setOpen] = useState(false)
    const [text, setText] = useState("")
    const [lengthUnit, setLengthUnit] = useState<LengthUnit>("cm")
    const [weightUnit, setWeightUnit] = useState<WeightUnit>("kg")
    const [busy, setBusy] = useState(false)

    const parsed = text.trim() ? parsePastedRows(text, lengthUnit, weightUnit) : []
    const valid = parsed.filter(r => !r.error)
    const invalid = parsed.filter(r => r.error)

    /**
     * Generates a sample CSV so the user has a canonical reference for the
     * format. Columns match the parser's preferred order. Includes realistic
     * SCS cargo rows so it doubles as a "what does a packing list look like"
     * teaching example.
     */
    const handleDownloadExample = () => {
        const rows = [
            "# Seairo CBM calculator - bulk import example",
            `# Columns: Label, Qty, L (${lengthUnit}), W (${lengthUnit}), H (${lengthUnit}), Weight (${weightUnit} per unit)`,
            "# Drop any leading 'Label' column if your items don't have names.",
            "# Lines starting with # are ignored.",
            "",
            "Wine 12-bottle case,24,35,30,23,16",
            "Citrus 15kg carton,36,40,30,27,15",
            "Chocolate 24-bar carton,48,40,30,20,6",
            "Trophy crate,4,120,80,80,45",
            "Mixed dry box,12,40,40,40,10",
        ].join("\n")
        const blob = new Blob([rows], { type: "text/csv;charset=utf-8" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = "seairo-cbm-bulk-import-example.csv"
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        toast.success("Example CSV downloaded")
    }

    const handleImport = () => {
        if (valid.length === 0) {
            toast.error("No valid rows to import")
            return
        }
        setBusy(true)
        try {
            const newItems: CargoItem[] = valid.map(r => ({
                id: `ci-${nanoid(8)}`,
                label: r.label ?? "",
                lengthMm: r.lengthMm,
                widthMm: r.widthMm,
                heightMm: r.heightMm,
                weightKg: r.weightKg,
                quantity: r.quantity,
            }))
            onAdd(newItems)
            toast.success(`Imported ${valid.length} row${valid.length === 1 ? "" : "s"}`)
            setText("")
            setOpen(false)
        } finally {
            setBusy(false)
        }
    }

    return (
        <>
            <Button
                variant="outline"
                size="sm"
                onClick={() => setOpen(true)}
                disabled={disabled}
                className="border-slate-200 dark:border-slate-800"
            >
                <ClipboardPaste className="h-3.5 w-3.5 mr-1.5" />
                Paste from packing list
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Paste rows from a packing list</DialogTitle>
                        <DialogDescription>
                            Paste tab-separated rows from Excel / email. Columns can be
                            <span className="font-mono"> Label, Qty, L, W, H, Weight</span> or
                            <span className="font-mono"> L, W, H, Qty</span> - we auto-detect.
                        </DialogDescription>
                    </DialogHeader>

                    <button
                        type="button"
                        onClick={handleDownloadExample}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-blue hover:underline self-start"
                    >
                        <FileDown className="h-3.5 w-3.5" />
                        Download example CSV
                    </button>

                    <div className="space-y-3">
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Dimensions</p>
                                <Select value={lengthUnit} onValueChange={v => setLengthUnit(v as LengthUnit)}>
                                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="cm">cm</SelectItem>
                                        <SelectItem value="in">in</SelectItem>
                                        <SelectItem value="m">m</SelectItem>
                                        <SelectItem value="ft">ft</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex-1">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Weight</p>
                                <Select value={weightUnit} onValueChange={v => setWeightUnit(v as WeightUnit)}>
                                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="kg">kg</SelectItem>
                                        <SelectItem value="lb">lb</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <Textarea
                            value={text}
                            onChange={e => setText(e.target.value)}
                            placeholder={"Wine 12-bottle case\t24\t35\t30\t23\t16\nCitrus 15kg carton\t36\t40\t30\t27\t15"}
                            className="min-h-[180px] font-mono text-xs bg-white dark:bg-slate-950"
                            autoFocus
                        />

                        {parsed.length > 0 && (
                            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 max-h-[200px] overflow-y-auto">
                                <div className="px-3 py-1.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
                                    <span className="text-emerald-600 dark:text-emerald-400">
                                        <Check className="inline h-3 w-3 mr-1" />
                                        {valid.length} valid
                                    </span>
                                    {invalid.length > 0 && (
                                        <span className="text-red-600 dark:text-red-400">
                                            <AlertCircle className="inline h-3 w-3 mr-1" />
                                            {invalid.length} skipped
                                        </span>
                                    )}
                                </div>
                                <ul className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                                    {parsed.map(r => (
                                        <li key={r.lineNumber} className="px-3 py-1.5 flex items-center gap-2">
                                            <span className="text-slate-400 font-mono w-5">{r.lineNumber}</span>
                                            {r.error ? (
                                                <span className="text-red-600 dark:text-red-400 flex-1 truncate" title={r.raw}>
                                                    {r.error}: {r.raw.slice(0, 60)}
                                                </span>
                                            ) : (
                                                <span className="flex-1 truncate">
                                                    <span className="font-medium">{r.label || "-"}</span>
                                                    <span className="text-slate-500 ml-2">
                                                        {r.lengthMm}×{r.widthMm}×{r.heightMm}mm · {r.quantity} × {r.weightKg.toFixed(1)}kg
                                                    </span>
                                                </span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button
                            onClick={handleImport}
                            disabled={busy || valid.length === 0}
                            className="bg-brand-blue hover:bg-brand-blue/90"
                        >
                            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Import {valid.length || ""} row{valid.length === 1 ? "" : "s"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
