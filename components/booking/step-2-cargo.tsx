"use client"

import { useState } from "react"
import { ContainerScene } from "./container-scene"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle, Ship, ArrowLeft, ThermometerSnowflake, Boxes, MapPin } from "lucide-react"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { BookingFormData, ContainerSlot } from "@/types"

interface Step2Props {
    formData: BookingFormData
    updateFormData: (data: Partial<BookingFormData>) => void
}

// Mock containers data mapped by route for demonstration
const MOCK_STORAGE: Record<string, ContainerSlot[]> = {
    "CPT-RTM": [
        { id: "CONT-001", vessel: "MSC Orchestra", preFilled: 14, date: "Oct 28", type: "40FT" },
        { id: "CONT-003", vessel: "COSCO Shipping", preFilled: 12, date: "Nov 02", type: "40FT" },
        { id: "CONT-005", vessel: "Hapag Lloyd", preFilled: 5, date: "Nov 06", type: "40FT" },
        { id: "CONT-006", vessel: "CMA CGM Antoine", preFilled: 15, date: "Nov 10", type: "40FT" },
    ],
    "CPT-LND": [
        { id: "CONT-L01", vessel: "Atlantic Star", preFilled: 10, date: "Oct 29", type: "40FT" },
    ],
    "DUR-SIN": [
        { id: "CONT-S01", vessel: "One Integrity", preFilled: 15, date: "Oct 31", type: "40FT" },
    ],
    // Default fallback
    "DEFAULT": [
        { id: "CONT-D01", vessel: "Standard Vessel", preFilled: 10, date: "Seasonal", type: "40FT" },
    ]
}

// Mock sailing dates - will be pulled from external system
const AVAILABLE_SAILING_DATES = [
    { value: "2026-02-15", label: "Feb 15, 2026" },
    { value: "2026-02-22", label: "Feb 22, 2026" },
    { value: "2026-03-01", label: "Mar 1, 2026" },
    { value: "2026-03-08", label: "Mar 8, 2026" },
    { value: "2026-03-15", label: "Mar 15, 2026" },
    { value: "2026-03-22", label: "Mar 22, 2026" },
]

export function Step2Cargo({ formData, updateFormData }: Step2Props) {
    const [viewStage, setViewStage] = useState<"initial" | "pick" | "adjust">(
        formData.containerId ? "adjust" : "initial"
    )

    // Derived available containers based on route
    const currentRouteKey = `${formData.origin}-${formData.destination}`
    const availableContainers = (MOCK_STORAGE[currentRouteKey] || MOCK_STORAGE["DEFAULT"])

    const selectedContainer = (MOCK_STORAGE[currentRouteKey] || MOCK_STORAGE["DEFAULT"]).find(c => c.id === formData.containerId)
    // Container capacity logic: 20FT = 10 pallets, 40FT = 20 pallets
    const containerCapacity = selectedContainer ? (selectedContainer.type === "20FT" ? 10 : 20) : 20

    const count = formData.palletCount || 0
    const remainingCapacity = selectedContainer ? containerCapacity - selectedContainer.preFilled : 20

    const handleSelectContainer = (container: ContainerSlot) => {
        const capacity = container.type === "20FT" ? 10 : 20
        const available = capacity - container.preFilled

        // Ensure we start at 5, but don't exceed available space
        const initialCount = Math.max(5, Math.min(count || 5, available))

        updateFormData({
            containerId: container.id,
            vessel: container.vessel,
            palletCount: initialCount
        })
        setViewStage("adjust")
    }

    const handleViewAvailability = () => {
        setViewStage("pick")
    }

    const getStatusColor = () => {
        if (count === 0) return "text-slate-500"
        if (count < 5) return "text-amber-500"
        if (count + (selectedContainer?.preFilled || 0) === containerCapacity) return "text-emerald-500"
        return "text-brand-blue"
    }

    const isInitialComplete = formData.origin && formData.destination && formData.sailingDate && formData.commodity && formData.temperature

    return (
        <div className="space-y-6">
            <AnimatePresence mode="wait">
                {/* STAGE 1: INITIAL SPECS (ROUTE + CARGO) */}
                {viewStage === "initial" && (
                    <motion.div
                        key="initial"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="w-full space-y-8 py-4"
                    >
                        <div className="text-center space-y-2">
                            <h3 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Shipment Specifications</h3>
                            <p className="text-slate-500">Provide route and cargo details to calculate real-time availability.</p>
                        </div>

                        <div className="grid gap-8 p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                            {/* Route Section */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-brand-blue">
                                    <MapPin className="h-4 w-4" />
                                    <span className="text-xs font-bold uppercase tracking-wider">Route Details</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold">Origin Port</Label>
                                        <Select value={formData.origin} onValueChange={(val) => updateFormData({ origin: val })}>
                                            <SelectTrigger className="w-full h-12 bg-white dark:bg-slate-950 font-medium">
                                                <SelectValue placeholder="Select Origin" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="CPT">Cape Town (ZACPT)</SelectItem>
                                                <SelectItem value="DUR">Durban (ZADUR)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold">Destination Port</Label>
                                        <Select value={formData.destination} onValueChange={(val) => updateFormData({ destination: val })}>
                                            <SelectTrigger className="w-full h-12 bg-white dark:bg-slate-950 font-medium">
                                                <SelectValue placeholder="Select Destination" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="RTM">Rotterdam (NLRTM)</SelectItem>
                                                <SelectItem value="LND">London (GBLND)</SelectItem>
                                                <SelectItem value="SIN">Singapore (SGSIN)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold">Next available sailings</Label>
                                    <Select value={formData.sailingDate} onValueChange={(val) => updateFormData({ sailingDate: val })}>
                                        <SelectTrigger className="w-full h-12 bg-white dark:bg-slate-950 font-medium">
                                            <SelectValue placeholder="Select sailing date" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {AVAILABLE_SAILING_DATES.map((date) => (
                                                <SelectItem key={date.value} value={date.value}>
                                                    {date.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Cargo Section */}
                            <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                                <div className="flex items-center gap-2 text-brand-blue">
                                    <ThermometerSnowflake className="h-4 w-4" />
                                    <span className="text-xs font-bold uppercase tracking-wider">Cargo Requirements</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold">Commodity</Label>
                                        <Select value={formData.commodity} onValueChange={(val) => updateFormData({ commodity: val })}>
                                            <SelectTrigger className="w-full h-12 bg-white dark:bg-slate-950 font-medium">
                                                <SelectValue placeholder="Select Commodity" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="squid">Squid (Frozen)</SelectItem>
                                                <SelectItem value="fish">Fish (Frozen)</SelectItem>
                                                <SelectItem value="fruit">Seasonal Fruit</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold">Temperature</Label>
                                        <Select value={formData.temperature} onValueChange={(val) => updateFormData({ temperature: val })}>
                                            <SelectTrigger className="w-full h-12 bg-white dark:bg-slate-950 font-medium">
                                                <SelectValue placeholder="Select Mode" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="frozen">-18°C (Frozen)</SelectItem>
                                                <SelectItem value="chilled">+5°C (Chilled)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>

                            <Button
                                className="h-14 text-lg font-bold bg-brand-blue hover:bg-blue-700 shadow-xl shadow-blue-500/20 rounded-2xl transition-all active:scale-[0.98]"
                                disabled={!isInitialComplete}
                                onClick={handleViewAvailability}
                            >
                                Check Container Availability
                            </Button>
                        </div>
                    </motion.div>
                )}

                {/* STAGE 2: PICK A CONTAINER */}
                {viewStage === "pick" && (
                    <motion.div
                        key="pick"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.05 }}
                        className="space-y-6"
                    >
                        <div className="flex flex-col gap-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Active Consolidation Runs</h3>
                                    <p className="text-sm text-slate-500">Found {availableContainers.length} compatible containers for {formData.origin} &rarr; {formData.destination}</p>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => setViewStage("initial")} className="text-slate-500">
                                    <ArrowLeft className="mr-2 h-4 w-4" /> Edit Route
                                </Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {availableContainers.map((container) => {
                                const capacity = container.type === "20FT" ? 10 : 20
                                return (
                                    <motion.div
                                        key={container.id}
                                        whileHover={{ y: -5 }}
                                        className="group cursor-pointer"
                                        onClick={() => handleSelectContainer(container)}
                                    >
                                        <div className="h-48 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm group-hover:shadow-xl transition-all relative">
                                            <div className="absolute top-3 right-3 z-10 bg-black/60 backdrop-blur-md text-white px-2 py-0.5 rounded text-[10px] font-bold border border-white/10">
                                                {container.type}
                                            </div>
                                            <ContainerScene
                                                preFilledCount={container.preFilled}
                                                type={container.type}
                                                className="h-full pointer-events-none"
                                            />
                                        </div>
                                        <div className="mt-4 px-1">
                                            <div className="flex justify-between items-center">
                                                <span className="font-bold text-slate-900 dark:text-white uppercase tracking-tight text-sm truncate pr-2">{container.vessel}</span>
                                                <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md flex-shrink-0">{container.date}</span>
                                            </div>
                                            <div className="mt-1 flex items-center justify-between text-xs text-slate-500 font-medium">
                                                <div className="flex items-center gap-1">
                                                    <Boxes className="h-3 w-3" />
                                                    <span className={cn(capacity - container.preFilled < 5 ? "text-red-500 font-bold" : "")}>
                                                        {capacity - container.preFilled} Space
                                                        {capacity - container.preFilled < 5 && " (Min 5 req.)"}
                                                    </span>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-brand-blue font-bold px-0 h-auto hover:bg-transparent"
                                                    disabled={capacity - container.preFilled < 5}
                                                    onClick={() => handleSelectContainer(container)}
                                                >
                                                    Select &rarr;
                                                </Button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )
                            })}
                        </div>
                    </motion.div>
                )}

                {/* STAGE 3: ADJUST QUANTITY */}
                {viewStage === "adjust" && selectedContainer && (
                    <motion.div
                        key="adjust"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col lg:flex-row gap-8"
                    >
                        <div className="flex-1 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                        <Ship className="h-5 w-5 text-brand-blue" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-black text-slate-900 dark:text-white uppercase">{selectedContainer.vessel}</h3>
                                            <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">{selectedContainer.type}</span>
                                        </div>
                                        <p className="text-xs text-slate-500 font-medium">{formData.origin} to {formData.destination} | {selectedContainer.date}</p>
                                    </div>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => setViewStage("pick")} className="rounded-full shadow-sm">
                                    <ArrowLeft className="mr-2 h-4 w-4" /> Switch Container
                                </Button>
                            </div>

                            <ContainerScene
                                preFilledCount={selectedContainer.preFilled}
                                userAddedCount={count}
                                type={selectedContainer.type}
                                className="h-[300px] sm:h-[450px]"
                            />
                        </div>

                        <div className="w-full lg:w-80 space-y-6">
                            <div className="bg-white dark:bg-slate-950 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm space-y-8">
                                <div className="space-y-6">
                                    <div>
                                        <Label className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-2 block">Volume Allocation</Label>
                                        <div className="flex justify-between items-baseline mb-4">
                                            <span className="text-5xl font-black text-slate-900 dark:text-white">{count}</span>
                                            <div className="text-right">
                                                <p className="text-xs font-bold text-slate-500">Pallets</p>
                                                <p className={`text-[10px] font-black uppercase ${getStatusColor()}`}>
                                                    {count + selectedContainer.preFilled === containerCapacity ? "Limit Reached" : "Available"}
                                                </p>
                                            </div>
                                        </div>
                                        <Slider
                                            value={[count]}
                                            max={remainingCapacity}
                                            min={5}
                                            step={1}
                                            onValueChange={(vals) => updateFormData({ palletCount: vals[0] })}
                                            className="py-4"
                                            disabled={remainingCapacity < 5}
                                        />
                                        {remainingCapacity < 5 && (
                                            <p className="text-[10px] text-red-500 font-bold mt-1">
                                                Insufficient space for minimum 5 pallet booking.
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex justify-between text-xs font-bold">
                                            <span className="text-slate-400 uppercase tracking-tighter">Your Share</span>
                                            <span className="text-brand-blue">{Math.round((count / containerCapacity) * 100)}%</span>
                                        </div>
                                        <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                                            <div
                                                className="bg-slate-300 dark:bg-slate-600 h-full border-r border-white/20"
                                                style={{ width: `${(selectedContainer.preFilled / containerCapacity) * 100}%` }}
                                            />
                                            <div
                                                className="bg-brand-blue h-full transition-all duration-300"
                                                style={{ width: `${(count / containerCapacity) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
                                    <div className="flex justify-between items-center font-bold">
                                        <span className="text-xs text-slate-500 uppercase tracking-widest">Rate Est.</span>
                                        <span className="text-2xl text-emerald-600">${(1350 + (count * 50)).toLocaleString()}</span>
                                    </div>
                                    <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-2xl flex items-start gap-3">
                                        <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5" />
                                        <div className="text-[10px] font-medium text-emerald-800 dark:text-emerald-400 leading-relaxed">
                                            This consolidation secures a -15% discount compared to dedicated reefer rates.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
