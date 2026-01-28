"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { ArrowLeft, Plus, Trash2, Save, Calculator, Check, ChevronsUpDown, X } from "lucide-react"
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
            // Use the actual value that would be charged per container
            const cost = item.chargeType === "PER_PALLET" && item.unitCost
                ? item.unitCost * 20
                : (item.containerCost || 0)

            totalPerContainer += cost
        })

        return {
            totalPerContainer: totalPerContainer.toFixed(2),
            totalPerPallet: (totalPerContainer / 20).toFixed(2)
        }
    }

    const totals = calculateTotals()

    const addItem = () => {
        const newItem: UIOriginChargeItem = {
            id: `new-${Date.now()}`,
            originChargeId: initialData?.id || "new",
            chargeCode: "",
            chargeName: "",
            chargeType: "PER_CONTAINER",
            category: "OTHER",
            unitCost: null,
            containerCost: null,
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

    const handleSave = () => {
        const hasEmptyNames = items.some(item => !item.chargeName.trim())
        if (hasEmptyNames) {
            toast.error("All charge items must have a name")
            return
        }

        toast.success("Origin charge rate card saved successfully!")
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
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
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
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-100 text-slate-700"
                        )}>
                            {initialData.active ? "Active" : "Inactive"}
                        </Badge>
                    )}
                    <Button onClick={handleSave} className="bg-brand-blue hover:bg-blue-700">
                        <Save className="mr-2 h-4 w-4" />
                        Save Rate Card
                    </Button>
                </div>
            </div>



            {/* Charge Items Table */}
            <Card className="overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <Calculator className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Additional Services</h3>
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
                            <TableRow className="bg-slate-100 dark:bg-slate-900">
                                <TableHead className="w-[50px]">#</TableHead>
                                <TableHead className="min-w-[400px]">
                                    <span className="font-bold">Additional Services</span>
                                    <span className="block text-xs font-normal text-slate-500">(Charge Name)</span>
                                </TableHead>
                                <TableHead className="w-[300px] text-right">
                                    <span className="font-bold">Unit Cost per Pallet</span>
                                    <span className="block text-xs font-normal text-slate-500">or Per Container</span>
                                </TableHead>
                                <TableHead className="w-[250px] text-right bg-blue-50 dark:bg-blue-900/20">
                                    <span className="font-bold">40ft HC Reefer</span>
                                    <span className="block text-xs font-normal text-slate-500">20 pallets per reefer</span>
                                </TableHead>
                                <TableHead className="w-[60px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-32 text-center text-slate-500">
                                        No charge items yet. Click &quot;Add Service&quot; to get started.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                items.map((item, index) => {
                                    // Calculate display cost for container column
                                    const containerCostDisplay = item.chargeType === "PER_PALLET" && item.unitCost
                                        ? item.unitCost * 20
                                        : item.containerCost || 0

                                    return (
                                        <TableRow key={item.id} className="group hover:bg-slate-50 dark:hover:bg-slate-900/50">
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
                                                            className="font-medium h-10 border-blue-400 focus-visible:ring-blue-400 bg-blue-50/50"
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
                                            <TableCell className="align-top py-2">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-2 flex-1 relative">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-sm">R</span>
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            value={
                                                                item.chargeType === "PER_PALLET"
                                                                    ? (item.unitCost || "")
                                                                    : (item.containerCost || "")
                                                            }
                                                            onChange={(e) => {
                                                                const value = parseFloat(e.target.value) || 0
                                                                if (item.chargeType === "PER_PALLET") {
                                                                    updateItem(item.id, {
                                                                        unitCost: value,
                                                                        containerCost: value * 20
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
                                                            const currentVal = item.chargeType === "PER_PALLET" ? item.unitCost : item.containerCost
                                                            if (value === "PER_PALLET") {
                                                                updateItem(item.id, {
                                                                    chargeType: value,
                                                                    unitCost: currentVal,
                                                                    containerCost: currentVal ? currentVal * 20 : null
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
                                                            <SelectItem value="PER_PALLET">Per Pallet</SelectItem>
                                                            <SelectItem value="PER_CONTAINER">Per Container</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right bg-slate-50 dark:bg-slate-900/30 font-mono text-lg font-black text-slate-900 dark:text-white align-middle">
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
                    <div className="border-t-4 border-slate-900 dark:border-white bg-gradient-to-r from-blue-50 to-emerald-50 dark:from-blue-900/20 dark:to-emerald-900/20 p-8">
                        <div className="flex items-center justify-between max-w-3xl ml-auto">
                            <div>
                                {/* Visual decoration or additional stats could go here */}
                            </div>
                            <div className="space-y-4 text-right">
                                <div className="flex items-baseline justify-end gap-6">
                                    <span className="text-base font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Total Cost per Container</span>
                                    <span className="font-mono text-4xl font-black text-slate-900 dark:text-white">
                                        R {parseFloat(totals.totalPerContainer).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <div className="flex items-baseline justify-end gap-6">
                                    <span className="text-sm font-semibold text-emerald-600/80 dark:text-emerald-400/80 uppercase tracking-wider">Equivalent Cost per Pallet</span>
                                    <span className="font-mono text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                        R {parseFloat(totals.totalPerPallet).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <div className="pt-2 text-xs text-slate-500 font-medium">
                                    * Calculations based on standard 40ft HC Reefer capacity (20 pallets)
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    )
}
