"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NumericInput } from "@/components/ui/numeric-input"
import { Badge } from "@/components/ui/badge"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { ArrowLeft, Plus, Trash2, Save, Calculator, Check, ChevronsUpDown, X, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import type { OriginChargeItem, ChargeType } from "@/lib/types/finance"

// Predefined services from the screenshot
const PREDEFINED_SERVICES = [
    "Collection in/around Cape Town",
    "Cold storage per week and part thereof",
    "Handling in and out",
    "Transport - Table Bay to port",
    "Fuel Surcharge",
    "Genset",
    "VGM",
    "Terminal Handling",
    "Carrier Service fee",
    "Cargo Dues",
    "Bill of Lading Fee",
    "Seal fee",
    "Navis Fee",
    "Courier Fee",
    "Tracking and reporting",
    "Data Logger",
    "Port Health Inspections",
    "PPECB",
    "EUR 1",
    "NRCS",
    "EDI Fee",
    "Customs Clearance",
    "Insurance",
    "Agency Fee",
    "Facility Fee - on 30 days"
]

interface OriginChargeEditorProps {
    initialData?: {
        id: string
        salesRateTypeId: string
        originId: string
        originName: string
        country?: string
        containerId: string
        containerDisplayName: string
        /** Interior CBM of the chosen container type. Null on legacy rows. */
        containerVolumeCBM?: number | null
        /** Pallet capacity of the chosen container type. Null on legacy rows. */
        containerMaxPallets?: number | null
        cargoType?: "PALLET" | "CUBE"
        effectiveFrom: string
        effectiveTo: string | null
        currency: "ZAR"
        items: OriginChargeItem[]
        active: boolean
    }
}

// Extend item type for UI state to handle "Other" mode
interface UIOriginChargeItem extends OriginChargeItem {
    isCustomMode?: boolean
}

export function OriginChargeEditor({ initialData }: OriginChargeEditorProps) {
    const router = useRouter()
    // Cargo type drives per-unit pricing - PER_PALLET on pallet cards,
    // PER_CBM on cube cards. The "container factor" turns a per-unit cost
    // into a container-equivalent total for the summary column. Prefer the
    // actual container type's volume / pallet count (passed by the page);
    // fall back to 40ft HC defaults (67.7 m³ / 20 pallets) for legacy rows
    // where the join didn't return a value.
    const isCube = initialData?.cargoType === "CUBE"
    const perUnitChargeType: "PER_PALLET" | "PER_CBM" = isCube ? "PER_CBM" : "PER_PALLET"
    const containerFactor = isCube
        ? (initialData?.containerVolumeCBM ?? 67.7)
        : (initialData?.containerMaxPallets ?? 20)
    const containerLabel = initialData?.containerDisplayName || (isCube ? "40ft HC Cube" : "40ft HC Reefer")

    // Initialize items checking if they match predefined list or should be custom
    const [items, setItems] = useState<UIOriginChargeItem[]>(
        (initialData?.items || []).map(item => ({
            ...item,
            isCustomMode: !!item.chargeName && !PREDEFINED_SERVICES.includes(item.chargeName)
        }))
    )

    // Calculate totals
    const calculateTotals = () => {
        let totalPerContainer = 0

        items.forEach(item => {
            // Per-unit charges (PER_PALLET on pallet cards, PER_CBM on cube
            // cards) get multiplied by the container's unit capacity to give
            // a container-equivalent total for the summary.
            const cost = (item.chargeType === "PER_PALLET" || item.chargeType === "PER_CBM") && item.unitCost
                ? item.unitCost * containerFactor
                : (item.containerCost || 0)

            totalPerContainer += cost
        })

        return {
            totalPerContainer: totalPerContainer.toFixed(2),
            totalPerPallet: (totalPerContainer / containerFactor).toFixed(2),
        }
    }

    const totals = calculateTotals()

    const addItem = () => {
        const newItem: UIOriginChargeItem = {
            id: `new-${Date.now()}`,
            originChargeId: initialData?.id || "new",
            chargeCode: "",
            chargeName: "",
            // Default to the per-unit type that matches this card's cargo type
            chargeType: perUnitChargeType,
            category: "OTHER",
            unitCost: null,
            containerCost: null,
            buyUnitCost: null,
            buyContainerCost: null,
            mandatory: true,
            sortOrder: items.length + 1,
            notes: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isCustomMode: false
        }
        setItems([...items, newItem])
    }

    const updateItem = (id: string, updates: Partial<UIOriginChargeItem>) => {
        setItems(items.map(item =>
            item.id === id ? { ...item, ...updates } : item
        ))
    }

    const deleteItem = (id: string) => {
        setItems(items.filter(item => item.id !== id))
        toast.success("Charge item removed")
    }

    const [saving, setSaving] = useState(false)

    const handleSave = async () => {
        if (items.length === 0) {
            toast.error("Rate card must have at least one charge item")
            return
        }
        const hasEmptyNames = items.some(item => !item.chargeName.trim())
        if (hasEmptyNames) {
            toast.error("All charge items must have a name")
            return
        }
        const hasZeroCost = items.some(item => {
            const perUnit = item.chargeType === "PER_PALLET" || item.chargeType === "PER_CBM"
            const cost = perUnit ? (item.unitCost || 0) : (item.containerCost || 0)
            return cost <= 0
        })
        if (hasZeroCost) {
            toast.error("All charge items must have a cost greater than zero")
            return
        }

        setSaving(true)
        try {
            const isNew = !initialData?.id || initialData.id === "new"
            const url = isNew ? "/api/admin/origin-charges" : `/api/admin/origin-charges/${initialData!.id}`
            const method = isNew ? "POST" : "PUT"

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...(!isNew ? {} : {
                        salesRateTypeId: initialData?.salesRateTypeId,
                        originId: initialData?.originId,
                        originName: initialData?.originName,
                        containerId: initialData?.containerId,
                        cargoType: initialData?.cargoType ?? "PALLET",
                        effectiveFrom: initialData?.effectiveFrom,
                        effectiveTo: initialData?.effectiveTo,
                        currency: initialData?.currency,
                        active: initialData?.active,
                    }),
                    items: items.map(item => ({
                        id: item.id,
                        chargeCode: item.chargeCode,
                        chargeName: item.chargeName,
                        chargeType: item.chargeType,
                        category: item.category,
                        unitCost: item.unitCost,
                        containerCost: item.containerCost,
                        buyUnitCost: item.buyUnitCost,
                        buyContainerCost: item.buyContainerCost,
                        mandatory: item.mandatory,
                        sortOrder: item.sortOrder,
                        notes: item.notes,
                    })),
                }),
            })

            if (res.ok) {
                toast.success("Origin charge rate card saved successfully!")
                router.refresh()
                router.push("/admin/finance/origin-charges")
            } else {
                const data = await res.json()
                toast.error(data.error || "Failed to save")
            }
        } catch {
            toast.error("Failed to save rate card")
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-white">
                            {initialData ? "Edit Origin Charge Rate Card" : "New Origin Charge Rate Card"}
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">
                            {initialData?.originName || "Cape Town"}
                            {initialData?.country ? `, ${initialData.country}` : ""}
                            {" • "}
                            {initialData?.containerDisplayName || "40ft HC Reefer"}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {initialData && (
                        <Badge className={cn(
                            "font-semibold",
                            initialData.active
                                ? "bg-emerald-900/30 text-emerald-400 border border-emerald-800"
                                : "bg-slate-800 text-slate-400 border border-slate-700"
                        )}>
                            {initialData.active ? "Active" : "Inactive"}
                        </Badge>
                    )}
                    <Button onClick={handleSave} disabled={saving} className="bg-brand-blue hover:bg-brand-blue/90">
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        {saving ? "Saving…" : "Save Rate Card"}
                    </Button>
                </div>
            </div>



            {/* Charge Items Table */}
            <Card className="overflow-hidden bg-slate-900 border-slate-800 shadow-none py-0">
                <div className="p-6 border-b border-slate-800 bg-slate-950">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-blue-900/30 flex items-center justify-center">
                                <Calculator className="h-5 w-5 text-blue-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">Additional Services</h3>
                                <p className="text-xs text-slate-500">Add and configure individual charge line items</p>
                            </div>
                        </div>
                        <Button onClick={addItem} variant="outline" size="sm">
                            <Plus className="mr-2 h-4 w-4" />
                            Add Service
                        </Button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-950 border-slate-800 hover:bg-slate-950">
                                <TableHead className="w-[50px] text-slate-400 font-bold uppercase tracking-wider text-[10px]">#</TableHead>
                                <TableHead className="min-w-[300px]">
                                    <span className="text-slate-300 font-bold uppercase tracking-wider text-[10px]">Additional Services</span>
                                    <span className="block text-[10px] font-normal text-slate-500 normal-case tracking-normal">(Charge Name)</span>
                                </TableHead>
                                <TableHead className="w-[200px] text-right bg-amber-900/10">
                                    <span className="text-amber-400 font-bold uppercase tracking-wider text-[10px]">Buy Rate</span>
                                    <span className="block text-[10px] font-normal text-slate-500 normal-case tracking-normal">Cost price (ZAR)</span>
                                </TableHead>
                                <TableHead className="w-[300px] text-right">
                                    <span className="text-slate-300 font-bold uppercase tracking-wider text-[10px]">Sell Rate</span>
                                    <span className="block text-[10px] font-normal text-slate-500 normal-case tracking-normal">
                                        {isCube ? "Per m³ or Per Container" : "Per Pallet or Per Container"}
                                    </span>
                                </TableHead>
                                <TableHead className="w-[250px] text-right bg-blue-900/15">
                                    <span className="text-blue-400 font-bold uppercase tracking-wider text-[10px]">{containerLabel}</span>
                                    <span className="block text-[10px] font-normal text-slate-500 normal-case tracking-normal">
                                        {isCube ? `${containerFactor} m³ per container` : `${containerFactor} pallets per container`}
                                    </span>
                                </TableHead>
                                <TableHead className="w-[60px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.length === 0 ? (
                                <TableRow className="border-slate-800 hover:bg-transparent">
                                    <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                                        No charge items yet. Click &quot;Add Service&quot; to get started.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                items.map((item, index) => {
                                    // Calculate display cost for container column.
                                    // Per-unit rates (PER_PALLET / PER_CBM) get multiplied by the
                                    // container factor for the column showing container-equivalent total.
                                    const perUnit = item.chargeType === "PER_PALLET" || item.chargeType === "PER_CBM"
                                    const containerCostDisplay = perUnit && item.unitCost
                                        ? item.unitCost * containerFactor
                                        : item.containerCost || 0

                                    return (
                                        <TableRow key={item.id} className="group border-slate-800 hover:bg-slate-950/60">
                                            <TableCell className="font-mono text-xs text-slate-500 align-top pt-4">
                                                {index + 1}
                                            </TableCell>
                                            <TableCell className="align-top py-2">
                                                {item.isCustomMode ? (
                                                    <div className="flex items-center gap-2">
                                                        <Input
                                                            value={item.chargeName}
                                                            onChange={(e) => updateItem(item.id, { chargeName: e.target.value })}
                                                            placeholder="Enter custom service name..."
                                                            className="font-medium h-10 bg-blue-900/20 border-blue-700 text-white focus-visible:ring-blue-400"
                                                            autoFocus
                                                        />
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            onClick={() => updateItem(item.id, { isCustomMode: false, chargeName: "" })}
                                                            title="Back to list"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <Button
                                                                variant="outline"
                                                                role="combobox"
                                                                className={cn(
                                                                    "w-full justify-between font-normal h-10",
                                                                    !item.chargeName && "text-muted-foreground"
                                                                )}
                                                            >
                                                                {item.chargeName || "Select service..."}
                                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-[400px] p-0" align="start">
                                                            <Command>
                                                                <CommandInput placeholder="Search services..." />
                                                                <CommandList>
                                                                    <CommandEmpty>No service found.</CommandEmpty>
                                                                    <CommandGroup>
                                                                        {PREDEFINED_SERVICES.map((service) => (
                                                                            <CommandItem
                                                                                key={service}
                                                                                value={service}
                                                                                onSelect={(currentValue) => {
                                                                                    updateItem(item.id, {
                                                                                        chargeName: currentValue,
                                                                                        isCustomMode: false
                                                                                    })
                                                                                }}
                                                                            >
                                                                                <Check
                                                                                    className={cn(
                                                                                        "mr-2 h-4 w-4",
                                                                                        item.chargeName === service ? "opacity-100" : "opacity-0"
                                                                                    )}
                                                                                />
                                                                                {service}
                                                                            </CommandItem>
                                                                        ))}
                                                                        <CommandItem
                                                                            onSelect={() => updateItem(item.id, { isCustomMode: true, chargeName: "" })}
                                                                            className="font-semibold text-blue-600"
                                                                        >
                                                                            <Plus className="mr-2 h-4 w-4" />
                                                                            Other (Custom Entry)
                                                                        </CommandItem>
                                                                    </CommandGroup>
                                                                </CommandList>
                                                            </Command>
                                                        </PopoverContent>
                                                    </Popover>
                                                )}
                                            </TableCell>
                                            {/* Buy Rate Cell */}
                                            <TableCell className="align-top py-2 bg-amber-900/5">
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500 font-mono text-sm">R</span>
                                                    <NumericInput
                                                        value={
                                                            (item.chargeType === "PER_PALLET" || item.chargeType === "PER_CBM")
                                                                ? (item.buyUnitCost || "")
                                                                : (item.buyContainerCost || "")
                                                        }
                                                        onChange={(e) => {
                                                            const value = parseFloat(e.target.value) || 0
                                                            if (item.chargeType === "PER_PALLET" || item.chargeType === "PER_CBM") {
                                                                updateItem(item.id, {
                                                                    buyUnitCost: value,
                                                                    buyContainerCost: value * containerFactor
                                                                })
                                                            } else {
                                                                updateItem(item.id, { buyContainerCost: value })
                                                            }
                                                        }}
                                                        placeholder="0.00"
                                                        className="text-right font-mono font-bold pl-8 text-base h-10 border-amber-700 focus-visible:ring-amber-400"
                                                    />
                                                </div>
                                            </TableCell>
                                            {/* Sell Rate Cell */}
                                            <TableCell className="align-top py-2">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-2 flex-1 relative">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-sm">R</span>
                                                        <NumericInput
                                                            value={
                                                                (item.chargeType === "PER_PALLET" || item.chargeType === "PER_CBM")
                                                                    ? (item.unitCost || "")
                                                                    : (item.containerCost || "")
                                                            }
                                                            onChange={(e) => {
                                                                const value = parseFloat(e.target.value) || 0
                                                                if (item.chargeType === "PER_PALLET" || item.chargeType === "PER_CBM") {
                                                                    updateItem(item.id, {
                                                                        unitCost: value,
                                                                        containerCost: value * containerFactor
                                                                    })
                                                                } else {
                                                                    updateItem(item.id, { containerCost: value })
                                                                }
                                                            }}
                                                            placeholder="0.00"
                                                            className="text-right font-mono font-bold pl-8 text-lg h-10"
                                                        />
                                                    </div>
                                                    <Select
                                                        value={item.chargeType}
                                                        onValueChange={(value: ChargeType) => {
                                                            const wasPerUnit = item.chargeType === "PER_PALLET" || item.chargeType === "PER_CBM"
                                                            const isPerUnit = value === "PER_PALLET" || value === "PER_CBM"
                                                            const currentVal = wasPerUnit ? item.unitCost : item.containerCost
                                                            // Conversion factor reflects the actual container's capacity
                                                            // (m³ for cube cards, pallets for pallet cards).
                                                            const factor = containerFactor
                                                            if (isPerUnit) {
                                                                updateItem(item.id, {
                                                                    chargeType: value,
                                                                    unitCost: currentVal,
                                                                    containerCost: currentVal ? currentVal * factor : null
                                                                })
                                                            } else {
                                                                updateItem(item.id, {
                                                                    chargeType: value,
                                                                    unitCost: null,
                                                                    containerCost: currentVal
                                                                })
                                                            }
                                                        }}
                                                    >
                                                        <SelectTrigger className="w-[140px] h-10">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {isCube ? (
                                                                <SelectItem value="PER_CBM">Per m³</SelectItem>
                                                            ) : (
                                                                <SelectItem value="PER_PALLET">Per Pallet</SelectItem>
                                                            )}
                                                            <SelectItem value="PER_CONTAINER">Per Container</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right bg-slate-900/30 font-mono text-lg font-black text-white align-middle">
                                                R {containerCostDisplay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </TableCell>
                                            <TableCell className="align-middle">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => deleteItem(item.id)}
                                                    className="h-8 w-8 text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Totals Section */}
                {items.length > 0 && (
                    <div className="border-t border-slate-800 bg-slate-950/60 p-8">
                        <div className="flex items-center justify-between max-w-3xl ml-auto">
                            <div>
                                {/* Visual decoration or additional stats could go here */}
                            </div>
                            <div className="space-y-4 text-right">
                                <div className="flex items-baseline justify-end gap-6">
                                    <span className="text-base font-bold text-slate-400 uppercase tracking-widest">Total Cost per Container</span>
                                    <span className="font-mono text-4xl font-black text-white">
                                        R {parseFloat(totals.totalPerContainer).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <div className="flex items-baseline justify-end gap-6">
                                    <span className="text-sm font-semibold text-emerald-400/80 uppercase tracking-wider">
                                        {isCube ? "Equivalent Cost per m³" : "Equivalent Cost per Pallet"}
                                    </span>
                                    <span className="font-mono text-2xl font-bold text-emerald-400">
                                        R {parseFloat(totals.totalPerPallet).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <div className="pt-2 text-xs text-slate-500 font-medium">
                                    {isCube
                                        ? `* Calculations based on ${containerLabel} capacity (${containerFactor} m³)`
                                        : `* Calculations based on ${containerLabel} capacity (${containerFactor} pallets)`}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    )
}
