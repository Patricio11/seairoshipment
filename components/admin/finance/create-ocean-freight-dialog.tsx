"use client"

import { useState, useCallback, useEffect } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Plus, Loader2, Ship, Calculator, Pencil } from "lucide-react"
import { toast } from "sonner"

interface ContainerTypeData { id: string; displayName: string; active: boolean }
interface LocationData { id: string; name: string; code: string; country: string; type: string }
interface SalesRateTypeData { id: string; code: string; name: string; active: boolean }

interface CreateOceanFreightForm {
    origin: string
    destinationId: string
    destinationCountry: string
    destinationPort: string
    destinationPortCode: string
    shippingLine: string
    containerId: string
    salesRateTypeId: string
    freightUSD: number
    bafUSD: number
    ispsUSD: number
    otherSurchargesUSD: number
    rcgUSD: number
    exchangeRate: number
    buyFreightUSD: number
    buyBafUSD: number
    buyIspsUSD: number
    buyOtherSurchargesUSD: number
    buyRcgUSD: number
}

export interface OceanFreightEditData {
    id: string
    origin: string
    destinationCountry: string
    destinationPort: string
    destinationPortCode: string
    shippingLine: string
    containerId: string
    salesRateTypeId: string | null
    freightUSD: string | null
    bafUSD: string | null
    ispsUSD: string | null
    otherSurchargesUSD: string | null
    rcgUSD: string | null
    exchangeRate: string | null
    buyFreightUSD?: string | null
    buyBafUSD?: string | null
    buyIspsUSD?: string | null
    buyOtherSurchargesUSD?: string | null
    buyRcgUSD?: string | null
}

export function CreateOceanFreightDialog({
    defaultDestinationPort = "",
    defaultCountry = "",
    editData,
    onSuccess,
    trigger,
    controlledOpen,
    onControlledOpenChange,
}: {
    defaultDestinationPort?: string
    defaultCountry?: string
    editData?: OceanFreightEditData | null
    onSuccess?: () => void
    trigger?: React.ReactNode
    controlledOpen?: boolean
    onControlledOpenChange?: (open: boolean) => void
}) {
    const isEditMode = !!editData
    const isControlled = controlledOpen !== undefined
    const [internalOpen, setInternalOpen] = useState(false)
    const open = isControlled ? controlledOpen : internalOpen
    const setOpen = isControlled ? (v: boolean) => onControlledOpenChange?.(v) : setInternalOpen
    const [loading, setLoading] = useState(false)
    const [containers, setContainers] = useState<ContainerTypeData[]>([])
    const [locations, setLocations] = useState<LocationData[]>([])
    const [salesRateTypes, setSalesRateTypes] = useState<SalesRateTypeData[]>([])

    useEffect(() => {
        const timeout = setTimeout(async () => {
            try {
                const [cRes, lRes, sRes] = await Promise.all([
                    fetch("/api/admin/container-types"),
                    fetch("/api/admin/locations"),
                    fetch("/api/admin/sales-rate-types"),
                ])
                if (cRes.ok) setContainers(await cRes.json())
                if (lRes.ok) setLocations(await lRes.json())
                if (sRes.ok) setSalesRateTypes(await sRes.json())
            } catch { /* silently fail */ }
        }, 0)
        return () => clearTimeout(timeout)
    }, [])

    const buildInitialForm = useCallback((): CreateOceanFreightForm => {
        if (editData) {
            // Resolve destinationId from locations by matching portCode or name
            const destLoc = locations.find(l =>
                l.code === editData.destinationPortCode ||
                l.name === editData.destinationPort
            );
            // Resolve origin location by matching name
            const originLoc = locations.find(l =>
                l.type === "ORIGIN" && l.name === editData.origin
            );
            return {
                origin: originLoc ? originLoc.name : editData.origin,
                destinationId: destLoc?.id || "",
                destinationCountry: editData.destinationCountry,
                destinationPort: editData.destinationPort,
                destinationPortCode: editData.destinationPortCode,
                shippingLine: editData.shippingLine,
                containerId: editData.containerId,
                salesRateTypeId: editData.salesRateTypeId || "srs",
                freightUSD: Number(editData.freightUSD) || 0,
                bafUSD: Number(editData.bafUSD) || 0,
                ispsUSD: Number(editData.ispsUSD) || 0,
                otherSurchargesUSD: Number(editData.otherSurchargesUSD) || 0,
                rcgUSD: Number(editData.rcgUSD) || 0,
                exchangeRate: Number(editData.exchangeRate) || 15.9,
                buyFreightUSD: Number(editData.buyFreightUSD) || 0,
                buyBafUSD: Number(editData.buyBafUSD) || 0,
                buyIspsUSD: Number(editData.buyIspsUSD) || 0,
                buyOtherSurchargesUSD: Number(editData.buyOtherSurchargesUSD) || 0,
                buyRcgUSD: Number(editData.buyRcgUSD) || 0,
            }
        }
        return {
            origin: "Cape Town",
            destinationId: "",
            destinationCountry: defaultCountry,
            destinationPort: defaultDestinationPort,
            destinationPortCode: "",
            shippingLine: "MSC",
            containerId: "40ft-reefer-hc",
            salesRateTypeId: "srs",
            freightUSD: 0,
            bafUSD: 0,
            ispsUSD: 0,
            otherSurchargesUSD: 0,
            rcgUSD: 0,
            exchangeRate: 15.9,
            buyFreightUSD: 0,
            buyBafUSD: 0,
            buyIspsUSD: 0,
            buyOtherSurchargesUSD: 0,
            buyRcgUSD: 0,
        }
    }, [editData, defaultCountry, defaultDestinationPort, locations])

    const [formData, setFormData] = useState<CreateOceanFreightForm>(buildInitialForm)

    // When controlled dialog opens with edit data, or when locations finish loading, populate the form
    useEffect(() => {
        if (isControlled && controlledOpen && editData) {
            setFormData(buildInitialForm())
        }
    }, [isControlled, controlledOpen, editData, buildInitialForm, locations])

    const handleOpenChange = useCallback((isOpen: boolean) => {
        setOpen(isOpen)
        if (isOpen) {
            if (editData) {
                setFormData(buildInitialForm())
            } else {
                const foundLoc = locations.find(l =>
                    l.name === defaultDestinationPort ||
                    l.code === defaultDestinationPort
                );

                if (foundLoc) {
                    setFormData(prev => ({
                        ...prev,
                        destinationId: foundLoc.id,
                        destinationCountry: foundLoc.country,
                        destinationPort: foundLoc.name,
                        destinationPortCode: foundLoc.code,
                    }));
                } else if (defaultCountry || defaultDestinationPort) {
                    setFormData(prev => ({
                        ...prev,
                        destinationCountry: defaultCountry || prev.destinationCountry,
                        destinationPort: defaultDestinationPort || prev.destinationPort,
                    }));
                }
            }
        }
    }, [defaultDestinationPort, defaultCountry, locations, editData, buildInitialForm])

    const handleDestinationChange = (locId: string) => {
        const loc = locations.find(l => l.id === locId);
        if (loc) {
            setFormData({
                ...formData,
                destinationId: loc.id,
                destinationCountry: loc.country,
                destinationPort: loc.name,
                destinationPortCode: loc.code
            });
        }
    }

    const totalUSD = formData.freightUSD + formData.bafUSD + formData.ispsUSD + formData.otherSurchargesUSD + formData.rcgUSD
    const totalZAR = totalUSD * formData.exchangeRate
    const buyTotalUSD = formData.buyFreightUSD + formData.buyBafUSD + formData.buyIspsUSD + formData.buyOtherSurchargesUSD + formData.buyRcgUSD
    const buyTotalZAR = buyTotalUSD * formData.exchangeRate
    const marginUSD = totalUSD - buyTotalUSD

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (totalUSD <= 0) {
            toast.error("Ocean freight rate must have a total greater than zero — add at least a base freight amount")
            return
        }
        if (formData.exchangeRate <= 0) {
            toast.error("Exchange rate must be greater than zero")
            return
        }

        setLoading(true)

        try {
            const url = isEditMode
                ? `/api/admin/ocean-freight/${editData!.id}`
                : "/api/admin/ocean-freight"
            const method = isEditMode ? "PUT" : "POST"

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    salesRateTypeId: formData.salesRateTypeId,
                    origin: formData.origin,
                    destinationCountry: formData.destinationCountry,
                    destinationPort: formData.destinationPort,
                    destinationPortCode: formData.destinationPortCode,
                    shippingLine: formData.shippingLine,
                    containerId: formData.containerId,
                    freightUSD: formData.freightUSD,
                    bafUSD: formData.bafUSD,
                    ispsUSD: formData.ispsUSD,
                    otherSurchargesUSD: formData.otherSurchargesUSD,
                    rcgUSD: formData.rcgUSD,
                    exchangeRate: formData.exchangeRate,
                    buyFreightUSD: formData.buyFreightUSD,
                    buyBafUSD: formData.buyBafUSD,
                    buyIspsUSD: formData.buyIspsUSD,
                    buyOtherSurchargesUSD: formData.buyOtherSurchargesUSD,
                    buyRcgUSD: formData.buyRcgUSD,
                    effectiveFrom: new Date().toISOString().split("T")[0],
                }),
            })

            if (res.ok) {
                toast.success(isEditMode ? "Ocean Freight Rate Updated" : "Ocean Freight Rate Created", {
                    description: `Route: ${formData.origin} to ${formData.destinationPort} ${isEditMode ? "updated" : "created"} successfully.`
                })
                setOpen(false)
                onSuccess?.()
            } else {
                const data = await res.json()
                toast.error(data.error || "Failed to save freight rate")
            }
        } catch {
            toast.error("Failed to save freight rate")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            {!isControlled && (trigger ? (
                <DialogTrigger asChild>{trigger}</DialogTrigger>
            ) : (
                <DialogTrigger asChild>
                    <Button className="bg-brand-blue hover:bg-blue-700 text-white font-bold h-10 shadow-lg shadow-blue-900/20">
                        <Plus className="mr-2 h-4 w-4" /> New Freight Rate
                    </Button>
                </DialogTrigger>
            ))}
            <DialogContent
                className="sm:max-w-[780px] bg-slate-950 border-slate-800 text-white"
                onInteractOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
            >
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black tracking-tight flex items-center gap-2">
                            {isEditMode ? <Pencil className="h-5 w-5 text-blue-500" /> : <Ship className="h-5 w-5 text-blue-500" />}
                            {isEditMode ? "EDIT OCEAN FREIGHT RATE" : "NEW OCEAN FREIGHT RATE"}
                        </DialogTitle>
                        <DialogDescription className="text-slate-400 font-mono text-[10px] uppercase tracking-widest">
                            Configure Port-to-Port Freight Charges & Surcharges
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-2 gap-6 py-6 border-y border-slate-800/50 my-4">
                        {/* Left Column: Route Details */}
                        <div className="space-y-4 border-r border-slate-800/50 pr-6">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Port of Load (Origin)</Label>
                                <Select
                                    value={formData.origin}
                                    onValueChange={(val) => setFormData({ ...formData, origin: val })}
                                >
                                    <SelectTrigger className="bg-slate-900 border-slate-800 h-9 text-sm">
                                        <SelectValue placeholder="Select Origin" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                        {locations.filter(l => l.type === 'ORIGIN').map(loc => (
                                            <SelectItem key={loc.id} value={loc.name}>{loc.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Port of Destination</Label>
                                <Select
                                    value={formData.destinationId}
                                    onValueChange={handleDestinationChange}
                                >
                                    <SelectTrigger className="bg-slate-900 border-slate-800 h-9 text-sm font-bold">
                                        <SelectValue placeholder="Select Destination" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                        {locations.filter(l => l.type === 'DESTINATION').map(loc => (
                                            <SelectItem key={loc.id} value={loc.id}>
                                                {loc.name} ({loc.code})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Destination Country</Label>
                                <Input
                                    value={formData.destinationCountry}
                                    readOnly
                                    disabled
                                    className="bg-slate-950 border-slate-800 h-9 text-sm text-slate-400"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Shipping Line</Label>
                                    <Input
                                        value={formData.shippingLine}
                                        onChange={(e) => setFormData({ ...formData, shippingLine: e.target.value })}
                                        className="bg-slate-900 border-slate-800 h-9 text-sm"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Equipment Type</Label>
                                    <Select value={formData.containerId} onValueChange={(v) => setFormData({ ...formData, containerId: v })}>
                                        <SelectTrigger className="bg-slate-900 border-slate-800 h-9 text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                            {containers.filter(c => c.active).map(c => (
                                                <SelectItem key={c.id} value={c.id}>{c.displayName}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Rate Type</Label>
                                <Select value={formData.salesRateTypeId} onValueChange={(v) => setFormData({ ...formData, salesRateTypeId: v })}>
                                    <SelectTrigger className="bg-slate-900 border-slate-800 h-9 text-sm">
                                        <SelectValue placeholder="Select rate type" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                        {salesRateTypes.filter(t => t.active).map(t => (
                                            <SelectItem key={t.id} value={t.id}>{t.name} ({t.code})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Right Column: Financials */}
                        <div className="space-y-4">
                            {/* Sell Rates */}
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-2">Sell Rates (USD)</p>
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Freight</Label>
                                        <Input
                                            type="number"
                                            value={formData.freightUSD}
                                            onChange={(e) => setFormData({ ...formData, freightUSD: Number(e.target.value) })}
                                            className="bg-slate-900 border-slate-800 h-9 text-sm font-mono"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">BAF</Label>
                                        <Input
                                            type="number"
                                            value={formData.bafUSD}
                                            onChange={(e) => setFormData({ ...formData, bafUSD: Number(e.target.value) })}
                                            className="bg-slate-900 border-slate-800 h-9 text-sm font-mono"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">ISPS</Label>
                                        <Input
                                            type="number"
                                            value={formData.ispsUSD}
                                            onChange={(e) => setFormData({ ...formData, ispsUSD: Number(e.target.value) })}
                                            className="bg-slate-900 border-slate-800 h-9 text-xs font-mono"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">RCG</Label>
                                        <Input
                                            type="number"
                                            value={formData.rcgUSD}
                                            onChange={(e) => setFormData({ ...formData, rcgUSD: Number(e.target.value) })}
                                            className="bg-slate-900 border-slate-800 h-9 text-xs font-mono"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">OTHER</Label>
                                        <Input
                                            type="number"
                                            value={formData.otherSurchargesUSD}
                                            onChange={(e) => setFormData({ ...formData, otherSurchargesUSD: Number(e.target.value) })}
                                            className="bg-slate-900 border-slate-800 h-9 text-xs font-mono"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Buy Rates */}
                            <div className="border-t border-slate-800/50 pt-3">
                                <p className="text-[10px] font-black uppercase tracking-widest text-amber-400 mb-2">Buy Rates (USD)</p>
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Buy Freight</Label>
                                        <Input
                                            type="number"
                                            value={formData.buyFreightUSD}
                                            onChange={(e) => setFormData({ ...formData, buyFreightUSD: Number(e.target.value) })}
                                            className="bg-slate-900 border-amber-800/40 h-9 text-sm font-mono"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Buy BAF</Label>
                                        <Input
                                            type="number"
                                            value={formData.buyBafUSD}
                                            onChange={(e) => setFormData({ ...formData, buyBafUSD: Number(e.target.value) })}
                                            className="bg-slate-900 border-amber-800/40 h-9 text-sm font-mono"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Buy ISPS</Label>
                                        <Input
                                            type="number"
                                            value={formData.buyIspsUSD}
                                            onChange={(e) => setFormData({ ...formData, buyIspsUSD: Number(e.target.value) })}
                                            className="bg-slate-900 border-amber-800/40 h-9 text-xs font-mono"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Buy RCG</Label>
                                        <Input
                                            type="number"
                                            value={formData.buyRcgUSD}
                                            onChange={(e) => setFormData({ ...formData, buyRcgUSD: Number(e.target.value) })}
                                            className="bg-slate-900 border-amber-800/40 h-9 text-xs font-mono"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Buy OTHER</Label>
                                        <Input
                                            type="number"
                                            value={formData.buyOtherSurchargesUSD}
                                            onChange={(e) => setFormData({ ...formData, buyOtherSurchargesUSD: Number(e.target.value) })}
                                            className="bg-slate-900 border-amber-800/40 h-9 text-xs font-mono"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Summary Box */}
                            <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 space-y-2 mt-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Exchange Rate</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-slate-500">USD to ZAR:</span>
                                        <Input
                                            type="number"
                                            value={formData.exchangeRate}
                                            onChange={(e) => setFormData({ ...formData, exchangeRate: Number(e.target.value) })}
                                            className="bg-transparent border-slate-800 h-6 w-16 text-[10px] text-right font-mono p-1"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-800/50">
                                    <div>
                                        <span className="text-[10px] font-black text-blue-400 flex items-center gap-1 mb-0.5">
                                            <Calculator className="h-3 w-3" /> SELL
                                        </span>
                                        <div className="text-base font-black text-blue-400">${totalUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                        <div className="text-[10px] text-slate-500">R {totalZAR.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-black text-amber-400 mb-0.5 block">BUY</span>
                                        <div className="text-base font-black text-amber-400">${buyTotalUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                        <div className="text-[10px] text-slate-500">R {buyTotalZAR.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-black text-emerald-400 mb-0.5 block">MARGIN</span>
                                        <div className={`text-base font-black ${marginUSD >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                            ${marginUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </div>
                                        <div className="text-[10px] text-slate-500">
                                            {totalUSD > 0 ? `${((marginUSD / totalUSD) * 100).toFixed(1)}%` : "—"}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setOpen(false)}
                            className="text-slate-400 hover:text-white hover:bg-slate-900"
                        >
                            CANCEL
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-black px-8"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            {loading ? "SAVING..." : isEditMode ? "UPDATE FREIGHT RATE" : "SAVE FREIGHT RATE"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
