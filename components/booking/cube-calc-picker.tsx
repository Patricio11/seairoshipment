"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Calculator, Check, AlertTriangle, ExternalLink, ChevronsUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { cn } from "@/lib/utils"
import type { CargoItem } from "@/lib/db/schema/pallet-allocations"

interface SavedCalc {
    id: string
    name: string
    totalCBM: string
    totalWeightKg: string | null
    cargoItems: CargoItem[]
    updatedAt: string
}

interface CubeCalcPickerProps {
    /** Currently selected calculation id (from formData.calculationId) */
    value: string | undefined
    onChange: (calc: { id: string; cbmVolume: number; weightKg: number; cargoItems: CargoItem[] } | null) => void
    /** Container's remaining CBM - used to disable calcs that won't fit */
    remainingCBM: number
}

export function CubeCalcPicker({ value, onChange, remainingCBM }: CubeCalcPickerProps) {
    const [calcs, setCalcs] = useState<SavedCalc[]>([])
    const [loading, setLoading] = useState(true)
    const [open, setOpen] = useState(false)

    useEffect(() => {
        let cancelled = false
        fetch("/api/dashboard/cbm-calculations", { cache: "no-store" })
            .then(r => r.ok ? r.json() : { calculations: [] })
            .then(d => { if (!cancelled && Array.isArray(d.calculations)) setCalcs(d.calculations) })
            .catch(() => { /* silent - empty state handles it */ })
            .finally(() => { if (!cancelled) setLoading(false) })
        return () => { cancelled = true }
    }, [])

    const selected = useMemo(() => calcs.find(c => c.id === value), [calcs, value])

    const selectCalc = (calc: SavedCalc) => {
        const cbm = Number(calc.totalCBM)
        const weightKg = calc.totalWeightKg ? Number(calc.totalWeightKg) : 0
        onChange({ id: calc.id, cbmVolume: cbm, weightKg, cargoItems: calc.cargoItems ?? [] })
        setOpen(false)
    }

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-sm text-slate-500 py-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading saved calculations…
            </div>
        )
    }

    if (calcs.length === 0) {
        return (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-6 text-center space-y-3">
                <div className="mx-auto h-12 w-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                    <Calculator className="h-6 w-6 text-brand-blue" />
                </div>
                <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">No saved calculations yet</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                        Cube bookings use a saved CBM calculation so dimensions and totals are unambiguous.
                    </p>
                </div>
                <Button asChild className="bg-brand-blue hover:bg-brand-blue/90" size="sm">
                    <a href="/dashboard/tools/cbm-calculator/new" target="_blank" rel="noopener noreferrer">
                        Create your first calculation
                        <ExternalLink className="ml-1.5 h-3 w-3" />
                    </a>
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between h-11 bg-white dark:bg-slate-950"
                    >
                        {selected ? (
                            <span className="flex items-center gap-2 min-w-0">
                                <Calculator className="h-4 w-4 text-brand-blue shrink-0" />
                                <span className="truncate font-medium">{selected.name}</span>
                                <span className="text-xs font-mono text-slate-500 shrink-0">
                                    {Number(selected.totalCBM).toFixed(2)} m³
                                </span>
                            </span>
                        ) : (
                            <span className="text-slate-500">Pick a saved calculation…</span>
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start">
                    <Command>
                        <CommandInput placeholder="Search calculations…" />
                        <CommandList className="max-h-[320px]">
                            <CommandEmpty>No calculations match.</CommandEmpty>
                            <CommandGroup>
                                {calcs.map(calc => {
                                    const cbm = Number(calc.totalCBM)
                                    const fits = cbm <= remainingCBM + 0.0001
                                    return (
                                        <CommandItem
                                            key={calc.id}
                                            value={`${calc.name} ${calc.id}`}
                                            onSelect={() => fits && selectCalc(calc)}
                                            disabled={!fits}
                                            className={cn("cursor-pointer", !fits && "opacity-50 cursor-not-allowed")}
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <p className="text-sm font-medium truncate">{calc.name}</p>
                                                    {value === calc.id && <Check className="h-3.5 w-3.5 text-emerald-500" />}
                                                </div>
                                                <p className="text-[10px] text-slate-500 mt-0.5">
                                                    {cbm.toFixed(2)} m³
                                                    {calc.totalWeightKg && Number(calc.totalWeightKg) > 0 && ` · ${(Number(calc.totalWeightKg) / 1000).toFixed(2)} t`}
                                                    · {(calc.cargoItems ?? []).length} item{(calc.cargoItems ?? []).length === 1 ? "" : "s"}
                                                    {!fits && (
                                                        <span className="ml-2 text-red-500 font-bold">
                                                            Doesn&apos;t fit ({(cbm - remainingCBM).toFixed(2)} m³ over)
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                        </CommandItem>
                                    )
                                })}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>

            <a
                href="/dashboard/tools/cbm-calculator/new"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-blue hover:underline"
            >
                Create a new calculation
                <ExternalLink className="h-3 w-3" />
            </a>

            {selected && (() => {
                const cbm = Number(selected.totalCBM)
                const fits = cbm <= remainingCBM + 0.0001
                return (
                    <div className={cn(
                        "rounded-xl border-2 p-3 space-y-1.5",
                        fits
                            ? "border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-900/10"
                            : "border-red-200 dark:border-red-900/40 bg-red-50/40 dark:bg-red-900/10",
                    )}>
                        <div className="flex items-center gap-2">
                            {fits ? (
                                <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                            )}
                            <span className={cn("text-xs font-bold uppercase tracking-wider", fits ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300")}>
                                {fits ? "Fits this container" : "Doesn't fit"}
                            </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 font-mono">
                            {cbm.toFixed(2)} m³ of {remainingCBM.toFixed(2)} m³ available
                            {fits
                                ? ` · ${(remainingCBM - cbm).toFixed(2)} m³ spare`
                                : ` · ${(cbm - remainingCBM).toFixed(2)} m³ over capacity`}
                        </p>
                    </div>
                )
            })()}
        </div>
    )
}
