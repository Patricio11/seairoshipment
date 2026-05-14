"use client"

import { useEffect, useMemo, useState } from "react"
import { Trash2, Plus, Box, Scale, Ruler, Layers, Container as ContainerIcon, Sparkles } from "lucide-react"
import { nanoid } from "nanoid"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { BulkPasteButton } from "@/components/cbm/bulk-paste-button"
import { cn } from "@/lib/utils"
import type { CargoItem } from "@/lib/db/schema/pallet-allocations"
import {
    type LengthUnit,
    type WeightUnit,
    toMm,
    fromMm,
    toKg,
    fromKg,
    itemCbm,
    totalCbm,
    totalWeight,
    volumetricWeightSea,
    palletEquivalent,
    sustainabilityScore,
    fitInStandardContainers,
    smallestFitContainer,
    fitInContainer,
    formatCbm,
    formatKg,
} from "@/lib/cbm"

/* -------------------------------------------------------------------------- */
/* Props                                                                       */
/* -------------------------------------------------------------------------- */

interface PresetRow {
    id: string
    name: string
    categoryId: string | null
    lengthMm: number
    widthMm: number
    heightMm: number
    weightKg: string | null
    isAdmin: boolean
    userId: string | null
}

export interface CBMCalculatorProps {
    /** Current cargo items — mm/kg canonical units. Controlled from outside. */
    value: CargoItem[]
    onChange: (next: CargoItem[]) => void
    /**
     * Optional override for the "container fit" panel. When the caller
     * (e.g. the booking wizard) is calculating against a specific container,
     * pass its interior CBM here to show a fit indicator for that exact
     * container alongside the standard 20ft/40ft/40ftHC table.
     */
    containerVolumeCBM?: number | null
    containerLabel?: string
    /**
     * When set, the cargo-item presets dropdown ranks category-matching
     * presets first. The booking wizard passes the chosen container's
     * categoryId in Phase D; the standalone calculator leaves it null.
     */
    categoryId?: string | null
    /** Read-only mode for share-link views. */
    readOnly?: boolean
}

/* -------------------------------------------------------------------------- */
/* Sane bounds                                                                 */
/* -------------------------------------------------------------------------- */
const MAX_DIMENSION_MM = 10_000  // 10 m — anything larger is almost certainly a typo
const MAX_WEIGHT_KG = 50_000     // 50 t per unit — way past realistic
const MAX_QUANTITY = 100_000

/* -------------------------------------------------------------------------- */
/* Component                                                                   */
/* -------------------------------------------------------------------------- */

export function CBMCalculator({ value, onChange, containerVolumeCBM, containerLabel, categoryId, readOnly = false }: CBMCalculatorProps) {
    const [lengthUnit, setLengthUnit] = useState<LengthUnit>("cm")
    const [weightUnit, setWeightUnit] = useState<WeightUnit>("kg")
    const [presets, setPresets] = useState<PresetRow[]>([])
    const [presetsLoading, setPresetsLoading] = useState(false)
    const [presetOpen, setPresetOpen] = useState(false)

    // Auto-seed an empty first row so the UI never looks blank
    useEffect(() => {
        if (value.length === 0 && !readOnly) {
            onChange([blankRow()])
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Load presets once when the picker opens; refresh when categoryId changes
    useEffect(() => {
        if (readOnly) return
        let cancelled = false
        setPresetsLoading(true)
        const url = categoryId
            ? `/api/cargo-item-presets?categoryId=${encodeURIComponent(categoryId)}`
            : "/api/cargo-item-presets"
        fetch(url, { cache: "no-store" })
            .then(r => r.ok ? r.json() : { presets: [] })
            .then(d => { if (!cancelled && Array.isArray(d.presets)) setPresets(d.presets) })
            .catch(() => { /* silent — calculator still works without presets */ })
            .finally(() => { if (!cancelled) setPresetsLoading(false) })
        return () => { cancelled = true }
    }, [categoryId, readOnly])

    const applyPreset = (preset: PresetRow) => {
        const newRow: CargoItem = {
            id: `ci-${nanoid(8)}`,
            label: preset.name,
            lengthMm: preset.lengthMm,
            widthMm: preset.widthMm,
            heightMm: preset.heightMm,
            weightKg: preset.weightKg ? Number(preset.weightKg) : 0,
            quantity: 1,
        }
        // If the only existing row is the auto-seeded blank, replace it; otherwise append.
        const onlyBlank = value.length === 1 &&
            value[0].lengthMm === 0 && value[0].widthMm === 0 && value[0].heightMm === 0 &&
            (value[0].weightKg ?? 0) === 0 && !value[0].label
        onChange(onlyBlank ? [newRow] : [...value, newRow])
        setPresetOpen(false)
        toast.success(`Added "${preset.name}"`)
    }

    const applyBulkRows = (rows: CargoItem[]) => {
        // Replace blank auto-seed if it's the only existing row
        const onlyBlank = value.length === 1 &&
            value[0].lengthMm === 0 && value[0].widthMm === 0 && value[0].heightMm === 0 &&
            (value[0].weightKg ?? 0) === 0 && !value[0].label
        onChange(onlyBlank ? rows : [...value, ...rows])
    }

    const addRow = () => {
        onChange([...value, blankRow()])
    }

    const removeRow = (id: string) => {
        const next = value.filter(item => item.id !== id)
        // Never go below one row in the UI; the caller still sees the array shape.
        onChange(next.length === 0 ? [blankRow()] : next)
    }

    const updateRow = (id: string, patch: Partial<CargoItem>) => {
        onChange(value.map(item => item.id === id ? { ...item, ...patch } : item))
    }

    const totals = useMemo(() => {
        const cbm = totalCbm(value)
        const weight = totalWeight(value)
        return {
            cbm,
            weight,
            volumetricWeightKg: volumetricWeightSea(cbm),
            palletEq: palletEquivalent(cbm),
            sustainability: sustainabilityScore(weight, cbm),
        }
    }, [value])

    const standardFits = useMemo(() => fitInStandardContainers(totals.cbm), [totals.cbm])
    const smallest = useMemo(() => smallestFitContainer(totals.cbm), [totals.cbm])
    const selectedContainerFit = useMemo(() =>
        containerVolumeCBM ? fitInContainer(totals.cbm, containerVolumeCBM) : null,
        [totals.cbm, containerVolumeCBM]
    )

    return (
        <div className="space-y-4">
            {/* Unit toggles + presets picker */}
            <div className="flex flex-wrap items-center gap-3">
                <UnitToggle
                    label="Dimensions"
                    value={lengthUnit}
                    options={["cm", "in", "m", "ft"] as const}
                    onChange={setLengthUnit}
                    icon={<Ruler className="h-3.5 w-3.5" />}
                    disabled={readOnly}
                />
                <UnitToggle
                    label="Weight"
                    value={weightUnit}
                    options={["kg", "lb"] as const}
                    onChange={setWeightUnit}
                    icon={<Scale className="h-3.5 w-3.5" />}
                    disabled={readOnly}
                />
                {!readOnly && (
                    <>
                        <BulkPasteButton onAdd={applyBulkRows} />
                        <Popover open={presetOpen} onOpenChange={setPresetOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-brand-blue/40 text-brand-blue hover:bg-brand-blue/5"
                                >
                                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                                Quick add from preset
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="p-0 w-[360px]" align="end">
                            <Command>
                                <CommandInput placeholder="Search presets…" />
                                <CommandList className="max-h-[320px]">
                                    {presetsLoading ? (
                                        <CommandEmpty>Loading…</CommandEmpty>
                                    ) : presets.length === 0 ? (
                                        <CommandEmpty>
                                            No presets available yet.{" "}
                                            <span className="block text-[10px] text-slate-500 mt-1">
                                                Admin can seed the starter set at /api/admin/cargo-item-presets/seed.
                                            </span>
                                        </CommandEmpty>
                                    ) : (
                                        <CommandGroup>
                                            {presets.map(p => (
                                                <CommandItem
                                                    key={p.id}
                                                    value={`${p.name} ${p.categoryId ?? ""}`}
                                                    onSelect={() => applyPreset(p)}
                                                    className="cursor-pointer"
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-1.5">
                                                            <p className="text-sm font-medium truncate">{p.name}</p>
                                                            {!p.isAdmin && (
                                                                <span className="text-[9px] font-bold uppercase tracking-widest text-purple-500">
                                                                    Yours
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                                                            {p.lengthMm} × {p.widthMm} × {p.heightMm} mm
                                                            {p.weightKg ? ` · ${Number(p.weightKg).toFixed(1)} kg` : ""}
                                                        </p>
                                                    </div>
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    )}
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                    </>
                )}
            </div>

            {/* Rows */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="hidden md:grid grid-cols-[1fr_90px_90px_90px_110px_70px_36px] gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <span>Label (optional)</span>
                    <span>Length ({lengthUnit})</span>
                    <span>Width ({lengthUnit})</span>
                    <span>Height ({lengthUnit})</span>
                    <span>Weight ({weightUnit})</span>
                    <span>Qty</span>
                    <span></span>
                </div>
                <ul className="divide-y divide-slate-100 dark:divide-slate-900">
                    {value.map(item => (
                        <CargoRow
                            key={item.id}
                            item={item}
                            lengthUnit={lengthUnit}
                            weightUnit={weightUnit}
                            onUpdate={(patch) => updateRow(item.id, patch)}
                            onRemove={() => removeRow(item.id)}
                            disabled={readOnly}
                        />
                    ))}
                </ul>
                {!readOnly && (
                    <button
                        type="button"
                        onClick={addRow}
                        className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold text-slate-500 hover:text-brand-blue hover:bg-blue-50/40 dark:hover:bg-blue-900/10 border-t border-slate-200 dark:border-slate-800 transition-colors"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        Add cargo item
                    </button>
                )}
            </div>

            {/* Totals + sustainability */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <StatCard
                    label="Total Volume"
                    primary={formatCbm(totals.cbm)}
                    sub={`≈ ${totals.palletEq.toFixed(1)} EUR pallets`}
                    icon={<Box className="h-4 w-4 text-brand-blue" />}
                />
                <StatCard
                    label="Total Weight"
                    primary={formatKg(totals.weight)}
                    sub={`Volumetric ${formatKg(totals.volumetricWeightKg)} (sea)`}
                    icon={<Scale className="h-4 w-4 text-purple-500" />}
                />
                <StatCard
                    label="CO₂eq · ocean SCS"
                    primary={`${totals.sustainability.kgCO2eqSea.toFixed(0)} kg`}
                    sub={`~${totals.sustainability.percentLessThanAir.toFixed(0)}% less than air`}
                    icon={<Layers className="h-4 w-4 text-emerald-500" />}
                />
            </div>

            {/* Container fit panel */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
                    <ContainerIcon className="h-4 w-4 text-slate-500" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Container fit
                    </span>
                    {smallest && totals.cbm > 0 && (
                        <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                            Smallest fit · {smallest}
                        </span>
                    )}
                </div>
                <ul className="divide-y divide-slate-100 dark:divide-slate-900">
                    {selectedContainerFit && (
                        <FitRow
                            label={containerLabel || "Selected container"}
                            volumeCbm={containerVolumeCBM!}
                            fit={selectedContainerFit}
                            highlight
                        />
                    )}
                    {standardFits.map(({ container, volumeCbm, fit }) => (
                        <FitRow
                            key={container}
                            label={container === "40ftHC" ? "40ft High Cube" : container}
                            volumeCbm={volumeCbm}
                            fit={fit}
                            highlight={smallest === container && !selectedContainerFit}
                        />
                    ))}
                </ul>
            </div>
        </div>
    )

    // Lazily build a blank row in the user's currently-active unit so the
    // first row appears with the unit columns matching the header.
    function blankRow(): CargoItem {
        return {
            id: `ci-${nanoid(8)}`,
            label: "",
            lengthMm: 0,
            widthMm: 0,
            heightMm: 0,
            weightKg: 0,
            quantity: 1,
        }
    }
}

/* -------------------------------------------------------------------------- */
/* Row                                                                         */
/* -------------------------------------------------------------------------- */

interface CargoRowProps {
    item: CargoItem
    lengthUnit: LengthUnit
    weightUnit: WeightUnit
    onUpdate: (patch: Partial<CargoItem>) => void
    onRemove: () => void
    disabled?: boolean
}

function CargoRow({ item, lengthUnit, weightUnit, onUpdate, onRemove, disabled }: CargoRowProps) {
    // Each row computes its own CBM live so the user sees feedback per row
    const rowCbm = itemCbm(item)

    return (
        <li className="grid grid-cols-2 md:grid-cols-[1fr_90px_90px_90px_110px_70px_36px] gap-2 px-3 py-2.5 items-center bg-white dark:bg-slate-950">
            <Input
                value={item.label || ""}
                onChange={e => onUpdate({ label: e.target.value })}
                placeholder="e.g. Wine case"
                disabled={disabled}
                className="h-9 col-span-2 md:col-span-1"
            />
            <DimensionInput
                mm={item.lengthMm}
                unit={lengthUnit}
                onChange={mm => onUpdate({ lengthMm: mm })}
                placeholder="L"
                disabled={disabled}
            />
            <DimensionInput
                mm={item.widthMm}
                unit={lengthUnit}
                onChange={mm => onUpdate({ widthMm: mm })}
                placeholder="W"
                disabled={disabled}
            />
            <DimensionInput
                mm={item.heightMm}
                unit={lengthUnit}
                onChange={mm => onUpdate({ heightMm: mm })}
                placeholder="H"
                disabled={disabled}
            />
            <WeightInput
                kg={item.weightKg}
                unit={weightUnit}
                onChange={kg => onUpdate({ weightKg: kg })}
                disabled={disabled}
            />
            <Input
                type="number"
                min={1}
                max={MAX_QUANTITY}
                value={item.quantity || ""}
                onChange={e => {
                    const n = Number(e.target.value)
                    onUpdate({ quantity: Number.isFinite(n) && n > 0 ? Math.min(MAX_QUANTITY, Math.floor(n)) : 0 })
                }}
                disabled={disabled}
                className="h-9 text-right"
            />
            {!disabled ? (
                <button
                    type="button"
                    onClick={onRemove}
                    className="h-9 w-9 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center justify-center transition-colors"
                    aria-label="Remove row"
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </button>
            ) : (
                <span className="h-9 w-9" />
            )}
            {rowCbm > 0 && (
                <span className="col-span-2 md:col-span-7 text-[10px] font-mono text-slate-400 text-right -mt-1">
                    Row volume: {formatCbm(rowCbm)}
                </span>
            )}
        </li>
    )
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function DimensionInput({ mm, unit, onChange, placeholder, disabled }: {
    mm: number; unit: LengthUnit; onChange: (mm: number) => void; placeholder: string; disabled?: boolean
}) {
    // We round display to a sensible precision for the unit so re-rendering
    // doesn't mutate what the user typed beyond visible precision.
    const decimals = unit === "m" || unit === "ft" ? 2 : 1
    const displayValue = mm > 0 ? Number(fromMm(mm, unit).toFixed(decimals)) : ""

    return (
        <Input
            type="number"
            min={0}
            step={unit === "m" || unit === "ft" ? 0.01 : 0.1}
            value={displayValue}
            onChange={e => {
                const raw = Number(e.target.value)
                if (!Number.isFinite(raw) || raw < 0) {
                    onChange(0)
                    return
                }
                const next = Math.min(MAX_DIMENSION_MM, toMm(raw, unit))
                onChange(next)
            }}
            placeholder={placeholder}
            disabled={disabled}
            className="h-9 text-right"
        />
    )
}

function WeightInput({ kg, unit, onChange, disabled }: {
    kg: number; unit: WeightUnit; onChange: (kg: number) => void; disabled?: boolean
}) {
    const displayValue = kg > 0 ? Number(fromKg(kg, unit).toFixed(2)) : ""

    return (
        <Input
            type="number"
            min={0}
            step={0.1}
            value={displayValue}
            onChange={e => {
                const raw = Number(e.target.value)
                if (!Number.isFinite(raw) || raw < 0) {
                    onChange(0)
                    return
                }
                onChange(Math.min(MAX_WEIGHT_KG, toKg(raw, unit)))
            }}
            placeholder={`Wt (${unit})`}
            disabled={disabled}
            className="h-9 text-right"
        />
    )
}

function UnitToggle<T extends string>({ label, value, options, onChange, icon, disabled }: {
    label: string
    value: T
    options: readonly T[]
    onChange: (next: T) => void
    icon?: React.ReactNode
    disabled?: boolean
}) {
    return (
        <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 pl-2 flex items-center gap-1">
                {icon}
                {label}
            </span>
            {options.map(opt => (
                <button
                    key={opt}
                    type="button"
                    onClick={() => !disabled && onChange(opt)}
                    disabled={disabled}
                    className={cn(
                        "px-2 py-1 text-xs font-bold rounded-md transition-colors",
                        opt === value
                            ? "bg-brand-blue text-white"
                            : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300",
                        disabled && "opacity-60 cursor-not-allowed"
                    )}
                >
                    {opt}
                </button>
            ))}
        </div>
    )
}

function StatCard({ label, primary, sub, icon }: {
    label: string; primary: string; sub: string; icon: React.ReactNode
}) {
    return (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center shrink-0">
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
                <p className="text-lg font-black text-slate-900 dark:text-white">{primary}</p>
                <p className="text-[11px] text-slate-500 truncate">{sub}</p>
            </div>
        </div>
    )
}

function FitRow({ label, volumeCbm, fit, highlight }: {
    label: string; volumeCbm: number; fit: ReturnType<typeof fitInContainer>; highlight?: boolean
}) {
    const percentFull = Math.max(0, Math.min(100, fit.percentFull))
    const barColor = !fit.fits ? "bg-red-500" : fit.percentFull > 85 ? "bg-amber-500" : "bg-emerald-500"
    return (
        <li className={cn(
            "px-4 py-2.5 flex items-center gap-4 bg-white dark:bg-slate-950",
            highlight && "bg-emerald-50/40 dark:bg-emerald-900/10"
        )}>
            <div className="w-32 shrink-0 flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{label}</span>
                <span className="text-[10px] font-mono text-slate-400">{volumeCbm.toFixed(1)} m³</span>
            </div>
            <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div className={cn("h-full transition-all", barColor)} style={{ width: `${percentFull}%` }} />
            </div>
            <div className="w-32 text-right shrink-0">
                <p className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                    {fit.percentFull.toFixed(0)}% full
                </p>
                <p className="text-[10px] text-slate-400">
                    {fit.fits
                        ? `${fit.remainingCbm.toFixed(2)} m³ spare`
                        : `${Math.abs(fit.remainingCbm).toFixed(2)} m³ over`
                    }
                </p>
            </div>
        </li>
    )
}
