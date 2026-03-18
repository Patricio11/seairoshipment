"use client"

import { useState, useCallback } from "react"
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
import { ArrowLeft, Plus, Trash2, Save, Calculator, Check, ChevronsUpDown, X, ArrowRightLeft } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import type { DestinationCharge, DestinationChargeItem } from "@/lib/types/finance"

// Predefined services from the requirements
const PREDEFINED_DESTINATION_SERVICES = [
    "Delivery to cold store Kent",
    "Genset",
    "Documentation",
    "Port Charges",
    "THC",
    "Customs Entry",
    "Carrier Terminal Fees",
    "Unpack",
    "Delivery to cold store Dublin",
    "Delivery",
    "Terminal Handling Charge"
]

interface DestinationChargeEditorProps {
    initialData?: DestinationCharge
}

// Extend item type for UI state to handle "Other" mode
interface UIDestinationChargeItem extends DestinationChargeItem {
    isCustomMode?: boolean
}

export function DestinationChargeEditor({ initialData }: DestinationChargeEditorProps) {
    const router = useRouter()

    // Form State
    const [currency, setCurrency] = useState<'GBP' | 'EUR' | 'USD'>(initialData?.currency || 'GBP')
    const [exchangeRate, setExchangeRate] = useState<number>(initialData?.exchangeRateToZAR || 22.30)

    // Initialize items with custom mode check
    const [items, setItems] = useState<UIDestinationChargeItem[]>(
        (initialData?.items || []).map(item => ({
            ...item,
            isCustomMode: !!item.chargeName && !PREDEFINED_DESTINATION_SERVICES.includes(item.chargeName)
        }))
    )

    // Recalculate ZAR amounts when ROE changes
    const handleExchangeRateChange = useCallback((newRate: number) => {
        setExchangeRate(newRate)
        setItems(prevItems =>
            prevItems.map(item => ({
                ...item,
                amountZAR: item.amountLocal * newRate
            }))
        )
    }, [])

    // Calculate totals
    const calculateTotals = () => {
        const totalLocal = items.reduce((sum, item) => sum + (item.amountLocal || 0), 0)
        const totalZAR = items.reduce((sum, item) => sum + (item.amountZAR || 0), 0)

        return {
            totalLocal,
            totalZAR,
            perPalletZAR: totalZAR / 20 // Assuming 20 pallets
        }
    }

    const totals = calculateTotals()

    const addItem = () => {
        const newItem: UIDestinationChargeItem = {
            id: `new-${Date.now()}`,
            destinationChargeId: initialData?.id || "new",
            chargeCode: "",
            chargeName: "",
            chargeType: "PER_CONTAINER",
            amountLocal: 0,
            amountZAR: 0,
            sortOrder: items.length + 1,
            notes: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isCustomMode: false
        }
        setItems([...items, newItem])
    }

    const updateItem = (id: string, updates: Partial<UIDestinationChargeItem>) => {
        setItems(items.map(item => {
            if (item.id !== id) return item;

            const updatedItem = { ...item, ...updates };

            // If amountLocal changed, valid recalculation of ZAR
            if ('amountLocal' in updates) {
                updatedItem.amountZAR = (updatedItem.amountLocal || 0) * exchangeRate;
            }

            return updatedItem;
        }))
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
        const hasZeroAmount = items.some(item => (item.amountLocal || 0) <= 0)
        if (hasZeroAmount) {
            toast.error("All charge items must have an amount greater than zero")
            return
        }

        setSaving(true)
        try {
            const isNew = !initialData?.id || initialData.id === "new"
            const url = isNew ? "/api/admin/destination-charges" : `/api/admin/destination-charges/${initialData!.id}`
            const method = isNew ? "POST" : "PUT"

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...(!isNew ? {} : {
                        salesRateTypeId: initialData?.salesRateTypeId,
                        destinationId: initialData?.destinationId,
                        destinationName: initialData?.destinationName,
                        destinationPortCode: initialData?.destinationPortCode,
                        containerId: initialData?.containerId,
                        effectiveFrom: initialData?.effectiveFrom,
                        effectiveTo: initialData?.effectiveTo,
                    }),
                    currency,
                    exchangeRateToZAR: exchangeRate,
                    active: initialData?.active !== false,
                    items: items.map(item => ({
                        id: item.id,
                        chargeCode: item.chargeCode || "",
                        chargeName: item.chargeName,
                        chargeType: item.chargeType || "PER_CONTAINER",
                        amountLocal: item.amountLocal,
                        amountZAR: item.amountZAR,
                        sortOrder: item.sortOrder,
                        notes: item.notes,
                    })),
                }),
            })

            if (res.ok) {
                toast.success("Destination charge rate card saved successfully!")
                router.push("/admin/finance/destination-charges")
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
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                            {initialData ? "Edit Destination Charges (DAP)" : "New Destination Charges (DAP)"}
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">
                            {initialData?.salesRateTypeName && (
                                <span className="font-semibold text-blue-600">{initialData.salesRateTypeName} • </span>
                            )}
                            {initialData?.destinationName || "London Gateway"}
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

            {/* Main Settings Card */}
            <Card className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-500">Destination Port</label>
                        <Input
                            value={initialData?.destinationName || "London Gateway"}
                            disabled
                            className="bg-slate-50 font-medium"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-500">Currency</label>
                        <Select
                            value={currency}
                            onValueChange={(val: 'GBP' | 'EUR' | 'USD') => setCurrency(val)}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="GBP">GBP (£)</SelectItem>
                                <SelectItem value="EUR">EUR (€)</SelectItem>
                                <SelectItem value="USD">USD ($)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-500">Exchange Rate (To ZAR)</label>
                        <div className="relative">
                            <ArrowRightLeft className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                type="number"
                                step="0.01"
                                value={exchangeRate}
                                onChange={(e) => handleExchangeRateChange(parseFloat(e.target.value) || 0)}
                                className="pl-9 font-mono font-bold"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                                1 {currency} = R {exchangeRate}
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Charge Items Table */}
            <Card className="overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <Calculator className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">DAP Charges</h3>
                                <p className="text-xs text-slate-500">Configure charges at destination port</p>
                            </div>
                        </div>
                        <Button onClick={addItem} variant="outline" size="sm">
                            <Plus className="mr-2 h-4 w-4" />
                            Add Item
                        </Button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-100 dark:bg-slate-900">
                                <TableHead className="w-[50px]">#</TableHead>
                                <TableHead className="min-w-[400px]">
                                    <span className="font-bold">Charge Description</span>
                                </TableHead>
                                <TableHead className="w-[200px] text-right">
                                    <span className="font-bold">Amount ({currency})</span>
                                </TableHead>
                                <TableHead className="w-[250px] text-right bg-blue-50 dark:bg-blue-900/20">
                                    <span className="font-bold">Amount (ZAR)</span>
                                    <span className="block text-xs font-normal text-slate-500 max-w-[200px] truncate ml-auto">
                                        @{exchangeRate.toFixed(2)} ROE
                                    </span>
                                </TableHead>
                                <TableHead className="w-[60px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-32 text-center text-slate-500">
                                        No charge items yet. Click &quot;Add Item&quot; to get started.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                items.map((item, index) => (
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
                                                        placeholder="Enter charge name..."
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
                                                            {item.chargeName || "Select charge..."}
                                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-[400px] p-0" align="start">
                                                        <Command>
                                                            <CommandInput placeholder="Search charges..." />
                                                            <CommandList>
                                                                <CommandEmpty>No charge found.</CommandEmpty>
                                                                <CommandGroup>
                                                                    {PREDEFINED_DESTINATION_SERVICES.map((service) => (
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
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-sm">
                                                    {currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : '$'}
                                                </span>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    value={item.amountLocal || ""}
                                                    onChange={(e) => updateItem(item.id, { amountLocal: parseFloat(e.target.value) || 0 })}
                                                    placeholder="0.00"
                                                    className="text-right font-mono font-bold pl-8 text-lg h-10"
                                                />
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right bg-slate-50 dark:bg-slate-900/30 font-mono text-lg font-black text-slate-900 dark:text-white align-middle">
                                            R {item.amountZAR.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Totals Section */}
                {items.length > 0 && (
                    <div className="border-t-4 border-slate-900 dark:border-white bg-gradient-to-r from-blue-50 to-emerald-50 dark:from-blue-900/20 dark:to-emerald-900/20 p-8">
                        <div className="flex items-center justify-between max-w-3xl ml-auto">
                            <div></div>
                            <div className="space-y-4 text-right">
                                <div className="flex items-baseline justify-end gap-6">
                                    <span className="text-base font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                                        Total ({currency})
                                    </span>
                                    <span className="font-mono text-4xl font-black text-slate-900 dark:text-white">
                                        {currency} {totals.totalLocal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <div className="flex items-baseline justify-end gap-6 text-emerald-600 dark:text-emerald-400">
                                    <span className="text-sm font-semibold uppercase tracking-wider">
                                        Total (ZAR)
                                    </span>
                                    <span className="font-mono text-3xl font-bold">
                                        R {totals.totalZAR.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <div className="flex items-baseline justify-end gap-6 text-slate-500">
                                    <span className="text-xs font-medium uppercase tracking-wider">
                                        Per Pallet (ZAR)
                                    </span>
                                    <span className="font-mono text-xl font-bold">
                                        R {totals.perPalletZAR.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    )
}
