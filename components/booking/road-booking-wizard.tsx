"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    MapPin, Truck, Package, Loader2, ArrowLeft, ArrowRight, Plus, X,
    Snowflake, Sun, CheckCircle2, FileText, Link2, AlertTriangle, Ruler, ShieldCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { NumericInput } from "@/components/ui/numeric-input"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { ROAD_ROUTES, ROAD_TEMP_LABELS } from "@/lib/road"

interface RoadTruck {
    id: string
    name: string
    route: string
    temperature: string | null
    categoryId: string | null
    categoryName: string | null
    departure: string | null
    arrival: string | null
    maxCapacity: number
    remaining: number
}

interface RoadProduct {
    id: string
    name: string
    hsCode: string | null
    description: string | null
    categoryId: string | null
}

interface AddressEntry {
    label?: string
    address: string
    mapsLink?: string
}

interface RoadQuoteData {
    routeLabel: string
    rateSource: "CUSTOMER" | "DEFAULT"
    transportPerPallet: number
    transportTotal: number
    additionalDropFee: number
    overhangFeePerPallet: number
    overhangTotal: number
    totalCost: number
    depositPercentage: number
    depositAmount: number
    balanceAmount: number
}

interface RoadBookingWizardProps {
    onSuccess: () => void
}

const STEPS = [
    { n: 1, label: "Route & Addresses" },
    { n: 2, label: "Cargo & Truck" },
    { n: 3, label: "Documents" },
    { n: 4, label: "Review & Confirm" },
]

function fmtR(v: number) {
    return `R ${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDate(d: string | null) {
    if (!d) return "TBD"
    return new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })
}

export function RoadBookingWizard({ onSuccess }: RoadBookingWizardProps) {
    const [step, setStep] = useState(1)
    const [submitting, setSubmitting] = useState(false)
    const [uploadingDoc, setUploadingDoc] = useState(false)

    // Step 1 - route + addresses
    const [route, setRoute] = useState("")
    const [collection, setCollection] = useState<AddressEntry>({ address: "", mapsLink: "" })
    const [delivery, setDelivery] = useState<AddressEntry>({ address: "", mapsLink: "" })
    const [extraDrop, setExtraDrop] = useState<AddressEntry | null>(null)

    // Step 2 - cargo + truck
    const [trucks, setTrucks] = useState<RoadTruck[]>([])
    const [productsList, setProductsList] = useState<RoadProduct[]>([])
    const [optionsLoading, setOptionsLoading] = useState(false)
    const [productId, setProductId] = useState("")
    const [temperature, setTemperature] = useState("")
    const [truckId, setTruckId] = useState("")
    const [palletCount, setPalletCount] = useState("")
    const [nettWeight, setNettWeight] = useState("")
    const [dims, setDims] = useState({ lengthCm: "", widthCm: "", heightCm: "" })
    const [overhang, setOverhang] = useState<"" | "YES" | "NO">("")

    // Step 3 - packing list
    const [packingList, setPackingList] = useState<File | null>(null)

    // Step 4 - quote + terms + PO
    const [quote, setQuote] = useState<RoadQuoteData | null>(null)
    const [quoteError, setQuoteError] = useState<string | null>(null)
    const [quoteLoading, setQuoteLoading] = useState(false)
    const [poNumber, setPoNumber] = useState("")
    const [agreeTerms, setAgreeTerms] = useState(false)

    // Load trucks + products whenever the corridor changes
    useEffect(() => {
        if (!route) { setTrucks([]); setProductsList([]); return }
        let cancelled = false
        setOptionsLoading(true)
        fetch(`/api/road/options?route=${encodeURIComponent(route)}`)
            .then(r => r.json())
            .then(d => {
                if (cancelled) return
                setTrucks(Array.isArray(d.trucks) ? d.trucks : [])
                setProductsList(Array.isArray(d.products) ? d.products : [])
            })
            .catch(() => { })
            .finally(() => { if (!cancelled) setOptionsLoading(false) })
        // Route change invalidates downstream picks
        setProductId(""); setTemperature(""); setTruckId("")
        return () => { cancelled = true }
    }, [route])

    const selectedProduct = productsList.find(p => p.id === productId)

    // Trucks compatible with the selected product's category
    const productTrucks = useMemo(() =>
        trucks.filter(t => !selectedProduct || t.categoryId === selectedProduct.categoryId),
        [trucks, selectedProduct])

    // Temperature options = distinct temps across compatible trucks
    const temperatureOptions = useMemo(() => {
        const set = new Set(productTrucks.map(t => t.temperature).filter((t): t is string => !!t))
        return Array.from(set)
    }, [productTrucks])

    // Trucks matching product + temperature
    const availableTrucks = useMemo(() =>
        productTrucks.filter(t => !temperature || t.temperature === temperature),
        [productTrucks, temperature])

    const selectedTruck = availableTrucks.find(t => t.id === truckId)
    const pallets = Math.floor(Number(palletCount)) || 0
    const deliveryPoints = extraDrop ? 2 : 1

    // Fetch the quote when entering step 4
    const fetchQuote = useCallback(async () => {
        if (!route || !(pallets >= 1)) return
        setQuoteLoading(true)
        setQuoteError(null)
        try {
            const params = new URLSearchParams({
                route,
                pallets: String(pallets),
                drops: String(deliveryPoints),
                overhang: overhang === "YES" ? "1" : "0",
            })
            const res = await fetch(`/api/road/quote?${params}`)
            const data = await res.json()
            if (!res.ok) {
                setQuote(null)
                setQuoteError(data.error || "Could not fetch a quote")
                return
            }
            setQuote(data)
        } catch {
            setQuote(null)
            setQuoteError("Could not fetch a quote")
        } finally {
            setQuoteLoading(false)
        }
    }, [route, pallets, deliveryPoints, overhang])

    useEffect(() => {
        if (step === 4) fetchQuote()
    }, [step, fetchQuote])

    const validateStep = (s: number): string | null => {
        if (s === 1) {
            if (!route) return "Select your route first"
            if (!collection.address.trim()) return "Collection address is required"
            if (!delivery.address.trim()) return "Delivery address is required"
            if (extraDrop && !extraDrop.address.trim()) return "Fill in the additional delivery point or remove it"
        }
        if (s === 2) {
            if (!productId) return "Select a product"
            if (!temperature) return "Select a temperature"
            if (!truckId) return "Select your truck"
            if (!(pallets >= 1)) return "Enter at least 1 pallet"
            if (selectedTruck && pallets > selectedTruck.remaining) return `This truck only has ${selectedTruck.remaining} pallet space${selectedTruck.remaining === 1 ? "" : "s"} left`
            if (!(Number(dims.lengthCm) > 0) || !(Number(dims.widthCm) > 0) || !(Number(dims.heightCm) > 0)) return "Enter the pallet dimensions"
            if (!overhang) return "Tell us whether any pallets overhang"
        }
        if (s === 3) {
            if (!packingList) return "Upload your packing list"
        }
        return null
    }

    const goNext = () => {
        const err = validateStep(step)
        if (err) { toast.error(err); return }
        setStep(s => Math.min(4, s + 1))
    }

    const handleSubmit = async () => {
        if (!agreeTerms) { toast.error("Please accept the road freight terms & conditions"); return }
        if (!quote) { toast.error(quoteError || "Waiting for your quote - try again"); return }

        setSubmitting(true)
        try {
            const deliveryAddresses: AddressEntry[] = [
                { ...delivery, label: delivery.label || "Delivery" },
                ...(extraDrop ? [{ ...extraDrop, label: extraDrop.label || "Additional drop" }] : []),
            ]
            const res = await fetch("/api/bookings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    transportMode: "ROAD",
                    containerId: truckId,
                    palletCount: pallets,
                    productId,
                    commodityName: selectedProduct?.name || null,
                    hsCode: selectedProduct?.hsCode || null,
                    nettWeight: nettWeight || null,
                    temperature,
                    collectionAddresses: [{ ...collection, label: collection.label || "Collection" }],
                    deliveryAddresses,
                    palletDimensions: {
                        lengthCm: Number(dims.lengthCm),
                        widthCm: Number(dims.widthCm),
                        heightCm: Number(dims.heightCm),
                    },
                    overhang: overhang === "YES",
                    poNumber: poNumber || null,
                }),
            })
            const data = await res.json()
            if (!res.ok) {
                toast.error(data.error || "Failed to submit booking")
                return
            }

            // Upload the packing list (server-side route bypasses storage RLS)
            let docOk = true
            if (packingList && data.allocationId) {
                setUploadingDoc(true)
                try {
                    const fd = new FormData()
                    fd.append("file", packingList)
                    fd.append("type", "PACKING_LIST")
                    fd.append("documentCode", "PACKING_LIST")
                    const up = await fetch(`/api/bookings/${data.allocationId}/upload`, { method: "POST", body: fd })
                    if (!up.ok) docOk = false
                } catch {
                    docOk = false
                } finally {
                    setUploadingDoc(false)
                }
            }

            if (docOk) {
                toast.success("Road Freight Booking Submitted!", {
                    description: `Reference: ${data.bookingReference} | ${pallets} pallet(s) · ${quote.routeLabel}`,
                    duration: 6000,
                })
            } else {
                toast.warning("Booking submitted, but the packing list failed to upload", {
                    description: `Reference: ${data.bookingReference}. Please re-upload from your bookings page.`,
                    duration: 8000,
                })
            }
            onSuccess()
        } catch {
            toast.error("Failed to submit booking")
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Step indicator */}
            <div className="flex items-center gap-1">
                {STEPS.map((s, i) => (
                    <div key={s.n} className="flex items-center flex-1 last:flex-none">
                        <div className="flex flex-col items-center gap-1">
                            <div className={cn(
                                "h-8 w-8 rounded-full flex items-center justify-center text-xs font-black transition-colors",
                                step > s.n ? "bg-emerald-500 text-white"
                                    : step === s.n ? "bg-emerald-600 text-white"
                                    : "bg-slate-200 dark:bg-slate-800 text-slate-500",
                            )}>
                                {step > s.n ? <CheckCircle2 className="h-4 w-4" /> : s.n}
                            </div>
                            <span className={cn(
                                "text-[9px] font-bold uppercase tracking-wider whitespace-nowrap",
                                step >= s.n ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400",
                            )}>
                                {s.label}
                            </span>
                        </div>
                        {i < STEPS.length - 1 && (
                            <div className={cn("h-0.5 flex-1 mx-2 mb-4 rounded", step > s.n ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-800")} />
                        )}
                    </div>
                ))}
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={step}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-5"
                >
                    {/* ── STEP 1: Route + addresses ── */}
                    {step === 1 && (
                        <>
                            <div className="space-y-2">
                                <Label className="font-bold text-slate-700 dark:text-slate-300">Route</Label>
                                <p className="text-xs text-slate-500 -mt-1">Select the corridor first - it drives your rates.</p>
                                <Select value={route} onValueChange={setRoute}>
                                    <SelectTrigger className="h-11 bg-white dark:bg-slate-950">
                                        <SelectValue placeholder="Select your route" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ROAD_ROUTES.map(r => (
                                            <SelectItem key={r.code} value={r.code}>{r.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Collection */}
                            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 bg-white dark:bg-slate-900">
                                <p className="text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                                    <MapPin className="h-3.5 w-3.5" /> Collection Address
                                </p>
                                <Textarea
                                    value={collection.address}
                                    onChange={(e) => setCollection({ ...collection, address: e.target.value })}
                                    placeholder="Street, suburb, city — where we collect the pallets"
                                    className="bg-white dark:bg-slate-950 min-h-[64px]"
                                />
                                <div className="relative">
                                    <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                    <Input
                                        value={collection.mapsLink || ""}
                                        onChange={(e) => setCollection({ ...collection, mapsLink: e.target.value })}
                                        placeholder="Optional: paste a Google Maps pin link"
                                        className="pl-9 h-9 text-xs bg-white dark:bg-slate-950"
                                    />
                                </div>
                            </div>

                            {/* Delivery */}
                            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 bg-white dark:bg-slate-900">
                                <p className="text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                                    <MapPin className="h-3.5 w-3.5" /> Delivery Address
                                </p>
                                <Textarea
                                    value={delivery.address}
                                    onChange={(e) => setDelivery({ ...delivery, address: e.target.value })}
                                    placeholder="Street, suburb, city — where the load is delivered"
                                    className="bg-white dark:bg-slate-950 min-h-[64px]"
                                />
                                <div className="relative">
                                    <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                    <Input
                                        value={delivery.mapsLink || ""}
                                        onChange={(e) => setDelivery({ ...delivery, mapsLink: e.target.value })}
                                        placeholder="Optional: paste a Google Maps pin link"
                                        className="pl-9 h-9 text-xs bg-white dark:bg-slate-950"
                                    />
                                </div>
                            </div>

                            {/* Extra drop */}
                            {extraDrop === null ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setExtraDrop({ address: "", mapsLink: "" })}
                                    className="w-full border-dashed"
                                >
                                    <Plus className="h-4 w-4 mr-2" /> Add an additional delivery point
                                </Button>
                            ) : (
                                <div className="rounded-2xl border border-amber-300 dark:border-amber-700/50 p-4 space-y-3 bg-amber-50/50 dark:bg-amber-900/10">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                                            <MapPin className="h-3.5 w-3.5" /> Additional Delivery Point
                                        </p>
                                        <button type="button" onClick={() => setExtraDrop(null)} className="text-slate-400 hover:text-red-500">
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                    <Textarea
                                        value={extraDrop.address}
                                        onChange={(e) => setExtraDrop({ ...extraDrop, address: e.target.value })}
                                        placeholder="Second delivery address"
                                        className="bg-white dark:bg-slate-950 min-h-[64px]"
                                    />
                                    <div className="relative">
                                        <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                        <Input
                                            value={extraDrop.mapsLink || ""}
                                            onChange={(e) => setExtraDrop({ ...extraDrop, mapsLink: e.target.value })}
                                            placeholder="Optional: paste a Google Maps pin link"
                                            className="pl-9 h-9 text-xs bg-white dark:bg-slate-950"
                                        />
                                    </div>
                                    <p className="text-[10px] text-amber-700 dark:text-amber-400">
                                        An additional drop fee applies - it shows on your cost sheet before you confirm.
                                    </p>
                                </div>
                            )}
                        </>
                    )}

                    {/* ── STEP 2: Cargo + truck ── */}
                    {step === 2 && (
                        <>
                            {optionsLoading ? (
                                <div className="flex items-center justify-center py-16 text-slate-500">
                                    <Loader2 className="h-6 w-6 animate-spin mr-2" /> Finding trucks on this route…
                                </div>
                            ) : trucks.length === 0 ? (
                                <div className="text-center py-12 space-y-2">
                                    <Truck className="h-10 w-10 mx-auto text-slate-300" />
                                    <p className="font-bold text-slate-700 dark:text-slate-300">No trucks available on this route yet</p>
                                    <p className="text-sm text-slate-500">Please check back later or contact us to arrange a load.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="font-bold text-slate-700 dark:text-slate-300">Product</Label>
                                            <Select value={productId} onValueChange={(v) => { setProductId(v); setTemperature(""); setTruckId("") }}>
                                                <SelectTrigger className="h-11 bg-white dark:bg-slate-950">
                                                    <SelectValue placeholder="Select product" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {productsList.map(p => (
                                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="font-bold text-slate-700 dark:text-slate-300">Temperature</Label>
                                            <Select value={temperature} onValueChange={(v) => { setTemperature(v); setTruckId("") }} disabled={!productId}>
                                                <SelectTrigger className="h-11 bg-white dark:bg-slate-950">
                                                    <SelectValue placeholder={productId ? "Select temperature" : "Pick a product first"} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {temperatureOptions.map(t => (
                                                        <SelectItem key={t} value={t}>
                                                            <span className="flex items-center gap-2">
                                                                {t === "ambient" ? <Sun className="h-3.5 w-3.5 text-amber-500" /> : <Snowflake className="h-3.5 w-3.5 text-sky-500" />}
                                                                {ROAD_TEMP_LABELS[t] ?? t}
                                                            </span>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    {/* Truck picker */}
                                    <div className="space-y-2">
                                        <Label className="font-bold text-slate-700 dark:text-slate-300">Select your truck</Label>
                                        {!temperature ? (
                                            <p className="text-xs text-slate-500 italic">Pick a product + temperature to see available trucks.</p>
                                        ) : availableTrucks.length === 0 ? (
                                            <p className="text-xs text-amber-600 dark:text-amber-400">No trucks match this temperature - try another regime.</p>
                                        ) : (
                                            <div className="grid gap-2">
                                                {availableTrucks.map(t => (
                                                    <button
                                                        key={t.id}
                                                        type="button"
                                                        onClick={() => setTruckId(t.id)}
                                                        className={cn(
                                                            "flex items-center justify-between rounded-xl border p-4 text-left transition-all",
                                                            truckId === t.id
                                                                ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 ring-1 ring-emerald-500/30"
                                                                : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-400",
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                                                <Truck className="h-5 w-5" />
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-slate-900 dark:text-white">{t.name}</p>
                                                                <p className="text-xs text-slate-500">
                                                                    Departs {fmtDate(t.departure)} · Arrives {fmtDate(t.arrival)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-lg font-black text-slate-900 dark:text-white">{t.remaining}</p>
                                                            <p className="text-[10px] uppercase font-bold text-slate-400">spaces left</p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Pallets + weight */}
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="font-bold text-slate-700 dark:text-slate-300">Pallet Count</Label>
                                            <NumericInput
                                                value={palletCount}
                                                onChange={(e) => setPalletCount(e.target.value)}
                                                placeholder={selectedTruck ? `1 - ${selectedTruck.remaining}` : "e.g. 4"}
                                                className="h-11 bg-white dark:bg-slate-950 font-mono"
                                            />
                                            <p className="text-[10px] text-slate-500">From 1 pallet - the truck takes {selectedTruck?.maxCapacity ?? 28} pallet spaces.</p>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="font-bold text-slate-700 dark:text-slate-300">Nett Weight (kg)</Label>
                                            <NumericInput
                                                value={nettWeight}
                                                onChange={(e) => setNettWeight(e.target.value)}
                                                placeholder="Total nett weight"
                                                className="h-11 bg-white dark:bg-slate-950 font-mono"
                                            />
                                        </div>
                                    </div>

                                    {/* Pallet dimensions */}
                                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 bg-white dark:bg-slate-900">
                                        <p className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                                            <Ruler className="h-3.5 w-3.5" /> Pallet Dimensions (cm)
                                        </p>
                                        <div className="grid grid-cols-3 gap-3">
                                            {([["lengthCm", "Length"], ["widthCm", "Width"], ["heightCm", "Height"]] as const).map(([key, label]) => (
                                                <div key={key} className="space-y-1">
                                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</Label>
                                                    <NumericInput
                                                        value={dims[key]}
                                                        onChange={(e) => setDims({ ...dims, [key]: e.target.value })}
                                                        placeholder="cm"
                                                        className="h-10 bg-white dark:bg-slate-950 font-mono text-center"
                                                    />
                                                </div>
                                            ))}
                                        </div>

                                        {/* Overhang */}
                                        <div className="pt-2 space-y-2">
                                            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Do any pallets overhang?</Label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {(["NO", "YES"] as const).map(v => (
                                                    <button
                                                        key={v}
                                                        type="button"
                                                        onClick={() => setOverhang(v)}
                                                        className={cn(
                                                            "h-10 rounded-lg border text-xs font-bold transition-all",
                                                            overhang === v
                                                                ? v === "YES"
                                                                    ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400"
                                                                    : "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
                                                                : "border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-400",
                                                        )}
                                                    >
                                                        {v === "YES" ? "Yes - pallets overhang" : "No overhang"}
                                                    </button>
                                                ))}
                                            </div>
                                            {overhang === "YES" && (
                                                <p className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                                    <AlertTriangle className="h-3 w-3" /> An overhang fee per pallet applies - it shows on your cost sheet.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </>
                    )}

                    {/* ── STEP 3: Packing list ── */}
                    {step === 3 && (
                        <div className="space-y-4">
                            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-6 bg-white dark:bg-slate-900 space-y-3">
                                <p className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-emerald-500" /> Packing List
                                    <span className="text-[10px] font-bold uppercase text-red-500">Required</span>
                                </p>
                                <p className="text-xs text-slate-500">
                                    We use your packing list to verify the pallet dimensions before loading. The transporter uploads the Proof of Delivery (POD) after the load.
                                </p>
                                <label className={cn(
                                    "flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-8 cursor-pointer transition-colors",
                                    packingList
                                        ? "border-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/10"
                                        : "border-slate-300 dark:border-slate-700 hover:border-emerald-400",
                                )}>
                                    <input
                                        type="file"
                                        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                                        className="hidden"
                                        onChange={(e) => {
                                            const f = e.target.files?.[0]
                                            if (f) {
                                                if (f.size > 10 * 1024 * 1024) { toast.error("Max file size is 10MB"); return }
                                                setPackingList(f)
                                            }
                                        }}
                                    />
                                    {packingList ? (
                                        <>
                                            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                                            <p className="text-sm font-bold text-slate-900 dark:text-white">{packingList.name}</p>
                                            <p className="text-[10px] text-slate-500">{(packingList.size / 1024).toFixed(0)} KB · click to replace</p>
                                        </>
                                    ) : (
                                        <>
                                            <FileText className="h-8 w-8 text-slate-400" />
                                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Click to upload your packing list</p>
                                            <p className="text-[10px] text-slate-500">PDF, Word, Excel or image · max 10MB</p>
                                        </>
                                    )}
                                </label>
                            </div>
                        </div>
                    )}

                    {/* ── STEP 4: Review + cost ── */}
                    {step === 4 && (
                        <div className="space-y-4">
                            {/* Summary */}
                            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900 space-y-2 text-sm">
                                <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Booking Summary</p>
                                <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                                    <div className="flex justify-between"><span className="text-slate-500">Route</span><span className="font-bold text-slate-900 dark:text-white">{ROAD_ROUTES.find(r => r.code === route)?.label}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-500">Truck</span><span className="font-bold text-slate-900 dark:text-white">{selectedTruck?.name}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-500">Product</span><span className="font-bold text-slate-900 dark:text-white">{selectedProduct?.name}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-500">Temperature</span><span className="font-bold text-slate-900 dark:text-white">{ROAD_TEMP_LABELS[temperature]?.split(" (")[0] ?? temperature}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-500">Pallets</span><span className="font-bold text-slate-900 dark:text-white">{pallets}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-500">Dimensions</span><span className="font-bold text-slate-900 dark:text-white font-mono">{dims.lengthCm}×{dims.widthCm}×{dims.heightCm} cm</span></div>
                                    <div className="flex justify-between"><span className="text-slate-500">Delivery points</span><span className="font-bold text-slate-900 dark:text-white">{deliveryPoints}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-500">Overhang</span><span className={cn("font-bold", overhang === "YES" ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-white")}>{overhang === "YES" ? "Yes" : "No"}</span></div>
                                </div>
                            </div>

                            {/* Cost sheet - the 3 lines */}
                            <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800/50 p-4 bg-emerald-50/50 dark:bg-emerald-900/10 space-y-2">
                                <p className="text-xs font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400 mb-2">Cost Breakdown</p>
                                {quoteLoading ? (
                                    <div className="flex items-center gap-2 text-slate-500 py-4 text-sm">
                                        <Loader2 className="h-4 w-4 animate-spin" /> Fetching your rates…
                                    </div>
                                ) : quoteError ? (
                                    <div className="flex items-start gap-2 text-amber-700 dark:text-amber-400 py-2 text-sm">
                                        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" /> {quoteError}
                                    </div>
                                ) : quote ? (
                                    <div className="space-y-1.5 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-slate-600 dark:text-slate-400">Transport cost · {pallets} pallet{pallets === 1 ? "" : "s"} × {fmtR(quote.transportPerPallet)}</span>
                                            <span className="font-bold font-mono text-slate-900 dark:text-white">{fmtR(quote.transportTotal)}</span>
                                        </div>
                                        {quote.additionalDropFee > 0 && (
                                            <div className="flex justify-between">
                                                <span className="text-slate-600 dark:text-slate-400">Additional drop fee</span>
                                                <span className="font-bold font-mono text-slate-900 dark:text-white">{fmtR(quote.additionalDropFee)}</span>
                                            </div>
                                        )}
                                        {quote.overhangTotal > 0 && (
                                            <div className="flex justify-between">
                                                <span className="text-slate-600 dark:text-slate-400">Overhang fee · {pallets} × {fmtR(quote.overhangFeePerPallet)}</span>
                                                <span className="font-bold font-mono text-slate-900 dark:text-white">{fmtR(quote.overhangTotal)}</span>
                                            </div>
                                        )}
                                        <div className="border-t border-emerald-200 dark:border-emerald-800/50 pt-2 flex justify-between">
                                            <span className="font-black text-slate-900 dark:text-white">Total</span>
                                            <span className="font-black font-mono text-lg text-emerald-700 dark:text-emerald-400">{fmtR(quote.totalCost)}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-500">{quote.depositPercentage}% deposit on confirmation</span>
                                            <span className="font-bold font-mono text-slate-700 dark:text-slate-300">{fmtR(quote.depositAmount)}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-500">{100 - quote.depositPercentage}% balance</span>
                                            <span className="font-bold font-mono text-slate-700 dark:text-slate-300">{fmtR(quote.balanceAmount)}</span>
                                        </div>
                                    </div>
                                ) : null}
                            </div>

                            {/* PO + terms */}
                            <div className="space-y-3">
                                <div className="space-y-2">
                                    <Label className="font-bold text-slate-700 dark:text-slate-300">PO Number (optional)</Label>
                                    <Input
                                        value={poNumber}
                                        onChange={(e) => setPoNumber(e.target.value)}
                                        placeholder="Your purchase order reference"
                                        className="h-11 bg-white dark:bg-slate-950"
                                    />
                                </div>

                                <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-3 bg-white dark:bg-slate-900">
                                    <Checkbox
                                        checked={agreeTerms}
                                        onCheckedChange={(v) => setAgreeTerms(v === true)}
                                        className="mt-0.5"
                                    />
                                    <span className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                        I accept the <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline">Road Freight Terms &amp; Conditions</a>.
                                        Goods in Transit insurance details are available on request and viewable at any time.
                                    </span>
                                </label>
                                <p className="text-[10px] text-slate-500 flex items-center gap-1.5">
                                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                                    Once your booking is confirmed by our team, the {quote?.depositPercentage ?? 60}% deposit becomes payable upfront.
                                </p>
                            </div>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>

            {/* Nav buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setStep(s => Math.max(1, s - 1))}
                    disabled={step === 1 || submitting}
                    className="text-slate-500"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back
                </Button>
                {step < 4 ? (
                    <Button
                        type="button"
                        onClick={goNext}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8"
                    >
                        Continue <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                ) : (
                    <Button
                        type="button"
                        onClick={handleSubmit}
                        disabled={submitting || quoteLoading || !quote}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8"
                    >
                        {submitting ? (
                            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {uploadingDoc ? "Uploading packing list…" : "Submitting…"}</>
                        ) : (
                            <><Package className="h-4 w-4 mr-2" /> Confirm Booking</>
                        )}
                    </Button>
                )}
            </div>
        </div>
    )
}
