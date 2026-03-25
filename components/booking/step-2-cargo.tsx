"use client"

import { useState, useEffect, useCallback } from "react"
import { ContainerScene } from "./container-scene"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle, Ship, ArrowLeft, ThermometerSnowflake, Boxes, MapPin, Loader2, Info, Anchor, Check, ChevronsUpDown } from "lucide-react"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { BookingFormData, ContainerSlot, SailingSchedule, MetaShipProduct } from "@/types"

interface Step2Props {
    formData: BookingFormData
    updateFormData: (data: Partial<BookingFormData>) => void
}

interface LocationOption {
    id: string
    name: string
    code: string
    country: string
    type: string
}

export function Step2Cargo({ formData, updateFormData }: Step2Props) {
    const [viewStage, setViewStage] = useState<"initial" | "pick" | "adjust">(
        formData.containerId ? "adjust" : "initial"
    )

    // Locations from DB
    const [originLocations, setOriginLocations] = useState<LocationOption[]>([])
    const [destinationLocations, setDestinationLocations] = useState<LocationOption[]>([])

    // Searchable combobox open states
    const [sailingOpen, setSailingOpen] = useState(false)
    const [productOpen, setProductOpen] = useState(false)

    // MetaShip data
    const [sailingSchedules, setSailingSchedules] = useState<SailingSchedule[]>([])
    const [loadingSchedules, setLoadingSchedules] = useState(false)
    const [products, setProducts] = useState<MetaShipProduct[]>([])
    const [loadingProducts, setLoadingProducts] = useState(false)

    // Real container data from DB
    const [availableContainers, setAvailableContainers] = useState<ContainerSlot[]>([])
    const [loadingContainers, setLoadingContainers] = useState(false)

    // Fetch locations + products on mount
    useEffect(() => {
        async function fetchLocations() {
            try {
                const [origRes, destRes] = await Promise.all([
                    fetch("/api/locations?type=ORIGIN"),
                    fetch("/api/locations?type=DESTINATION"),
                ])
                if (origRes.ok) setOriginLocations(await origRes.json())
                if (destRes.ok) setDestinationLocations(await destRes.json())
            } catch {
                console.error("Failed to fetch locations")
            }
        }
        async function fetchProducts() {
            setLoadingProducts(true)
            try {
                const res = await fetch("/api/metaship/products")
                if (res.ok) {
                    const data = await res.json()
                    setProducts(Array.isArray(data) ? data : data.data || [])
                }
            } catch {
                console.error("Failed to fetch products")
            } finally {
                setLoadingProducts(false)
            }
        }
        fetchLocations()
        fetchProducts()
    }, [])

    // Fetch sailing schedules when both ports are selected
    const fetchSchedules = useCallback(async (origin: string, destination: string) => {
        if (!origin || !destination) return
        setLoadingSchedules(true)
        setSailingSchedules([])
        try {
            const res = await fetch(
                `/api/metaship/sailing-schedules?portOfLoadValue=${origin}&finalDestinationValue=${destination}`
            )
            if (res.ok) {
                const data = await res.json()
                setSailingSchedules(Array.isArray(data) ? data : data.data || [])
            }
        } catch {
            console.error("Failed to fetch sailing schedules")
        } finally {
            setLoadingSchedules(false)
        }
    }, [])

    useEffect(() => {
        if (formData.origin && formData.destination) {
            fetchSchedules(formData.origin, formData.destination)
        }
    }, [formData.origin, formData.destination, fetchSchedules])

    const selectedContainer = availableContainers.find(c => c.id === formData.containerId)
    const containerCapacity = selectedContainer ? (selectedContainer.type === "20FT" ? 10 : 20) : 20

    const count = formData.palletCount || 0
    const remainingCapacity = selectedContainer ? containerCapacity - selectedContainer.preFilled : 20

    const handleSelectContainer = (container: ContainerSlot) => {
        const capacity = container.type === "20FT" ? 10 : 20
        const available = capacity - container.preFilled

        const minPallets = available < 5 ? 1 : 5
        const initialCount = Math.max(minPallets, Math.min(count || minPallets, available))

        updateFormData({
            containerId: container.id,
            vessel: container.vessel,
            palletCount: initialCount
        })
        setViewStage("adjust")
    }

    const handleViewAvailability = async () => {
        const route = `${formData.origin}-${formData.destination}`
        setLoadingContainers(true)
        setViewStage("pick")
        try {
            const salesRateTypeId = formData.salesRateTypeId || "srs"
            const res = await fetch(`/api/containers?route=${route}&salesRateTypeId=${salesRateTypeId}`)
            if (res.ok) {
                const data = await res.json()
                setAvailableContainers(Array.isArray(data) ? data : [])
            } else {
                setAvailableContainers([])
            }
        } catch {
            console.error("Failed to fetch containers")
            setAvailableContainers([])
        } finally {
            setLoadingContainers(false)
        }
    }

    const handleOriginChange = (val: string) => {
        updateFormData({
            origin: val,
            sailingDate: undefined,
            sailingScheduleId: undefined,
            voyageNumber: undefined,
            vesselName: undefined,
        })
    }

    const handleDestinationChange = (val: string) => {
        updateFormData({
            destination: val,
            sailingDate: undefined,
            sailingScheduleId: undefined,
            voyageNumber: undefined,
            vesselName: undefined,
        })
    }

    const handleScheduleSelect = (scheduleId: string) => {
        const schedule = sailingSchedules.find(s => s.id === scheduleId)
        if (schedule) {
            updateFormData({
                sailingScheduleId: schedule.id,
                sailingDate: schedule.etd,
                voyageNumber: schedule.voyageNumber,
                vesselName: schedule.vesselName,
                vessel: schedule.vesselName,
            })
        }
    }

    const handleProductSelect = (productId: string) => {
        const product = products.find(p => String(p.id) === productId)
        if (product) {
            updateFormData({
                commodity: String(product.id),
                commodityName: product.name,
                hsCode: product.hsCode,
                commodityDescription: product.description,
            })
        }
    }

    const getStatusColor = () => {
        if (count === 0) return "text-slate-500"
        if (count < 5) return "text-amber-500"
        if (count + (selectedContainer?.preFilled || 0) === containerCapacity) return "text-emerald-500"
        return "text-brand-blue"
    }

    const isInitialComplete = formData.salesRateTypeId && formData.origin && formData.destination && formData.sailingScheduleId && formData.commodity && formData.temperature

    // Selected product for info display
    const selectedProduct = products.find(p => String(p.id) === formData.commodity)

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
                            {/* Booking Type */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-brand-blue">
                                    <Ship className="h-4 w-4" />
                                    <span className="text-xs font-bold uppercase tracking-wider">Booking Type</span>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { id: "srs", label: "Shared Reefer Services", short: "SRS", color: "brand-blue", ring: "ring-brand-blue", bg: "bg-blue-50 dark:bg-blue-900/20", border: "border-brand-blue", text: "text-brand-blue" },
                                        { id: "scs", label: "Seairo Cargo Solutions", short: "SCS", color: "emerald-600", ring: "ring-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20", border: "border-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
                                    ].map((type) => {
                                        const selected = formData.salesRateTypeId === type.id
                                        return (
                                            <button
                                                key={type.id}
                                                type="button"
                                                onClick={() => updateFormData({ salesRateTypeId: type.id })}
                                                className={`relative flex flex-col items-start gap-1 p-4 rounded-2xl border-2 transition-all text-left cursor-pointer
                                                    ${selected
                                                        ? `${type.bg} ${type.border} ring-2 ${type.ring} ring-offset-1`
                                                        : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                                                    }`}
                                            >
                                                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${selected ? `${type.bg} ${type.text}` : "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}>
                                                    {type.short}
                                                </span>
                                                <span className={`text-sm font-bold ${selected ? type.text : "text-slate-700 dark:text-slate-300"}`}>
                                                    {type.label}
                                                </span>
                                                {selected && (
                                                    <span className={`absolute top-3 right-3 h-5 w-5 rounded-full flex items-center justify-center ${type.bg}`}>
                                                        <Check className={`h-3 w-3 ${type.text}`} />
                                                    </span>
                                                )}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Route Section */}
                            <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800">
                                <div className="flex items-center gap-2 text-brand-blue">
                                    <MapPin className="h-4 w-4" />
                                    <span className="text-xs font-bold uppercase tracking-wider">Route Details</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold">Origin Port</Label>
                                        <Select value={formData.origin} onValueChange={handleOriginChange}>
                                            <SelectTrigger className="w-full h-12 bg-white dark:bg-slate-950 font-medium">
                                                <SelectValue placeholder="Select Origin" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {originLocations.map((loc) => (
                                                    <SelectItem key={loc.id} value={loc.code}>
                                                        {loc.name} ({loc.code})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold">Destination Port</Label>
                                        <Select value={formData.destination} onValueChange={handleDestinationChange}>
                                            <SelectTrigger className="w-full h-12 bg-white dark:bg-slate-950 font-medium">
                                                <SelectValue placeholder="Select Destination" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {destinationLocations.map((loc) => (
                                                    <SelectItem key={loc.id} value={loc.code}>
                                                        {loc.name} ({loc.code})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Sailing Schedules from MetaShip */}
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold">Next Available Sailings</Label>
                                    {loadingSchedules ? (
                                        <div className="flex items-center gap-2 h-12 px-3 bg-white dark:bg-slate-950 rounded-md border text-sm text-slate-500">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Fetching sailing schedules...
                                        </div>
                                    ) : sailingSchedules.length > 0 ? (
                                        <Popover open={sailingOpen} onOpenChange={setSailingOpen}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    aria-expanded={sailingOpen}
                                                    className="w-full h-12 bg-white dark:bg-slate-950 font-medium justify-between"
                                                >
                                                    {formData.sailingScheduleId ? (
                                                        (() => {
                                                            const s = sailingSchedules.find(s => s.id === formData.sailingScheduleId)
                                                            return s ? (
                                                                <span className="flex items-center gap-2 truncate">
                                                                    <Anchor className="h-3.5 w-3.5 text-brand-blue shrink-0" />
                                                                    <span className="font-semibold">{s.vesselName}</span>
                                                                    <span className="text-slate-500">
                                                                        ETD {new Date(s.etd).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                                                                    </span>
                                                                </span>
                                                            ) : "Select sailing schedule"
                                                        })()
                                                    ) : (
                                                        <span className="text-muted-foreground">Select sailing schedule</span>
                                                    )}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                                <Command>
                                                    <CommandInput placeholder="Search vessel name or date..." />
                                                    <CommandList>
                                                        <CommandEmpty>No sailing found.</CommandEmpty>
                                                        <CommandGroup>
                                                            {sailingSchedules.map((schedule) => (
                                                                <CommandItem
                                                                    key={schedule.id}
                                                                    value={`${schedule.vesselName} ${schedule.voyageNumber} ${new Date(schedule.etd).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`}
                                                                    onSelect={() => {
                                                                        handleScheduleSelect(schedule.id)
                                                                        setSailingOpen(false)
                                                                    }}
                                                                    className="cursor-pointer"
                                                                >
                                                                    <Check
                                                                        className={cn(
                                                                            "mr-2 h-4 w-4",
                                                                            formData.sailingScheduleId === schedule.id ? "opacity-100" : "opacity-0"
                                                                        )}
                                                                    />
                                                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                                                        <Anchor className="h-3.5 w-3.5 text-brand-blue shrink-0" />
                                                                        <span className="font-semibold truncate">{schedule.vesselName}</span>
                                                                        <span className="text-slate-500 text-xs shrink-0">
                                                                            ETD {new Date(schedule.etd).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                                                                        </span>
                                                                        <span className="text-xs text-slate-400 shrink-0">
                                                                            {schedule.transitTime}d
                                                                        </span>
                                                                        {schedule.serviceType === "DIRECT" && (
                                                                            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded shrink-0">
                                                                                Direct
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                    ) : formData.origin && formData.destination ? (
                                        <div className="flex items-center gap-2 h-12 px-3 bg-white dark:bg-slate-950 rounded-md border text-sm text-slate-500">
                                            <Info className="h-4 w-4" />
                                            No sailing schedules found for this route
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 h-12 px-3 bg-white dark:bg-slate-950 rounded-md border text-sm text-slate-400">
                                            Select both ports to view available sailings
                                        </div>
                                    )}
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
                                        <Label className="text-xs font-semibold">Product</Label>
                                        {loadingProducts ? (
                                            <div className="flex items-center gap-2 h-12 px-3 bg-white dark:bg-slate-950 rounded-md border text-sm text-slate-500">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Loading products...
                                            </div>
                                        ) : (
                                            <Popover open={productOpen} onOpenChange={setProductOpen}>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        role="combobox"
                                                        aria-expanded={productOpen}
                                                        className="w-full h-12 bg-white dark:bg-slate-950 font-medium justify-between"
                                                    >
                                                        {formData.commodity ? (
                                                            <span className="truncate">
                                                                {products.find(p => String(p.id) === formData.commodity)?.name || "Select Product"}
                                                            </span>
                                                        ) : (
                                                            <span className="text-muted-foreground">Select Product</span>
                                                        )}
                                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                                    <Command>
                                                        <CommandInput placeholder="Search products..." />
                                                        <CommandList>
                                                            <CommandEmpty>No product found.</CommandEmpty>
                                                            <CommandGroup>
                                                                {products.map((product) => (
                                                                    <CommandItem
                                                                        key={product.id}
                                                                        value={`${product.name} ${product.hsCode || ""}`}
                                                                        onSelect={() => {
                                                                            handleProductSelect(String(product.id))
                                                                            setProductOpen(false)
                                                                        }}
                                                                        className="cursor-pointer"
                                                                    >
                                                                        <Check
                                                                            className={cn(
                                                                                "mr-2 h-4 w-4",
                                                                                formData.commodity === String(product.id) ? "opacity-100" : "opacity-0"
                                                                            )}
                                                                        />
                                                                        <div className="flex flex-col">
                                                                            <span className="font-medium">{product.name}</span>
                                                                            {product.hsCode && (
                                                                                <span className="text-xs text-slate-500 font-mono">{product.hsCode}</span>
                                                                            )}
                                                                        </div>
                                                                    </CommandItem>
                                                                ))}
                                                            </CommandGroup>
                                                        </CommandList>
                                                    </Command>
                                                </PopoverContent>
                                            </Popover>
                                        )}
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
                                                <SelectItem value="ambient">+18°C (Ambient)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Product info card when selected */}
                                {selectedProduct && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/30"
                                    >
                                        <div className="flex items-start gap-3">
                                            <Info className="h-4 w-4 text-brand-blue mt-0.5 shrink-0" />
                                            <div className="space-y-1">
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedProduct.name}</p>
                                                <p className="text-xs text-slate-600 dark:text-slate-400">
                                                    HS Code: <span className="font-mono font-bold text-brand-blue">{selectedProduct.hsCode}</span>
                                                </p>
                                                {selectedProduct.description && (
                                                    <p className="text-xs text-slate-500">{selectedProduct.description}</p>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
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
                                    <p className="text-sm text-slate-500">
                                        {loadingContainers
                                            ? "Searching for available containers..."
                                            : `Found ${availableContainers.length} compatible containers for ${formData.origin} → ${formData.destination}`
                                        }
                                    </p>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => setViewStage("initial")} className="text-slate-500">
                                    <ArrowLeft className="mr-2 h-4 w-4" /> Edit Route
                                </Button>
                            </div>
                        </div>

                        {loadingContainers ? (
                            <div className="flex items-center justify-center py-16 text-slate-500">
                                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                                Loading available containers...
                            </div>
                        ) : availableContainers.length === 0 ? (
                            <div className="text-center py-16">
                                <Boxes className="h-12 w-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                                <p className="font-bold text-slate-700 dark:text-slate-300">No containers available for this route yet</p>
                                <p className="text-sm text-slate-500 mt-1">Contact us for availability or check back later.</p>
                            </div>
                        ) : (
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
                                                    <span className={cn(capacity - container.preFilled < 5 ? "text-amber-500 font-bold" : "")}>
                                                        {capacity - container.preFilled} Space
                                                        {capacity - container.preFilled < 5 && " (Last spots!)"}
                                                    </span>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-brand-blue font-bold px-0 h-auto hover:bg-transparent"
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
                        )}
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
                                            min={remainingCapacity < 5 ? 1 : 5}
                                            step={1}
                                            onValueChange={(vals) => updateFormData({ palletCount: vals[0] })}
                                            className="py-4"
                                        />
                                        {remainingCapacity < 5 && (
                                            <p className="text-[10px] text-amber-500 font-bold mt-1">
                                                Only {remainingCapacity} spot{remainingCapacity !== 1 ? "s" : ""} left — minimum reduced to 1 pallet.
                                            </p>
                                        )}
                                    </div>

                                    {/* Nett Weight & Gross Weight */}
                                    <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                                        <Label className="text-[10px] uppercase tracking-widest font-black text-slate-400 block">Weight Details</Label>
                                        <div className="space-y-3">
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold text-slate-600">Nett Weight (kg)</Label>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    step={0.1}
                                                    placeholder="0.00"
                                                    value={formData.nettWeight || ""}
                                                    onChange={(e) => updateFormData({ nettWeight: parseFloat(e.target.value) || 0 })}
                                                    className="h-10 bg-slate-50 dark:bg-slate-900 font-medium"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold text-slate-600">Gross Weight (kg)</Label>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    step={0.1}
                                                    placeholder="0.00"
                                                    value={formData.grossWeight || ""}
                                                    onChange={(e) => updateFormData({ grossWeight: parseFloat(e.target.value) || 0 })}
                                                    className="h-10 bg-slate-50 dark:bg-slate-900 font-medium"
                                                />
                                            </div>
                                        </div>
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
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
