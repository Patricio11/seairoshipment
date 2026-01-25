"use client"

import { useState } from "react"
import { ContainerScene } from "./container-scene"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { motion, AnimatePresence } from "framer-motion"
import { Info, AlertCircle, CheckCircle, Ship, ArrowLeft, ThermometerSnowflake, Boxes } from "lucide-react"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"

interface Step2Props {
    formData: any
    updateFormData: (data: any) => void
}

// Mock containers for the selection stage
const MOCK_CONTAINERS = [
    { id: "CONT-001", vessel: "MSC Orchestra", preFilled: 14, date: "Oct 28" },
    { id: "CONT-002", vessel: "Maersk Line 2", preFilled: 8, date: "Oct 30" },
    { id: "CONT-003", vessel: "COSCO Shipping", preFilled: 12, date: "Nov 02" },
    { id: "CONT-004", vessel: "Evergreen", preFilled: 16, date: "Nov 05" },
]

export function Step2Cargo({ formData, updateFormData }: Step2Props) {
    const [viewStage, setViewStage] = useState<"initial" | "pick" | "adjust">(
        formData.commodity && formData.containerId ? "adjust" : formData.commodity ? "pick" : "initial"
    )

    const selectedContainer = MOCK_CONTAINERS.find(c => c.id === formData.containerId)
    const count = formData.palletCount || 0
    const maxCapacity = 20
    const remainingCapacity = selectedContainer ? maxCapacity - selectedContainer.preFilled : maxCapacity

    const handleSelectContainer = (container: typeof MOCK_CONTAINERS[0]) => {
        updateFormData({
            containerId: container.id,
            vessel: container.vessel,
            palletCount: Math.min(count, maxCapacity - container.preFilled)
        })
        setViewStage("adjust")
    }

    const getStatusColor = () => {
        if (count === 0) return "text-slate-500"
        if (count < 5) return "text-red-500"
        if (count + (selectedContainer?.preFilled || 0) === maxCapacity) return "text-emerald-500"
        return "text-brand-blue"
    }

    return (
        <div className="space-y-6">
            <AnimatePresence mode="wait">
                {/* STAGE 1: INITIAL COMMODITY SELECTION */}
                {viewStage === "initial" && (
                    <motion.div
                        key="initial"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="max-w-md mx-auto space-y-8 py-8"
                    >
                        <div className="text-center space-y-2">
                            <h3 className="text-xl font-bold">What are you shipping?</h3>
                            <p className="text-slate-500">Select your cargo type and requirements to see available space.</p>
                        </div>

                        <div className="grid gap-6">
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-slate-700">Commodity</Label>
                                <Select
                                    value={formData.commodity}
                                    onValueChange={(val) => updateFormData({ commodity: val })}
                                >
                                    <SelectTrigger className="h-14 text-lg bg-white dark:bg-slate-950 border-slate-200">
                                        <SelectValue placeholder="Select Commodity" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="fish">Frozen Fish</SelectItem>
                                        <SelectItem value="squid">Squid</SelectItem>
                                        <SelectItem value="fruit">Seasonal Fruit</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-slate-700">Storage Temperature</Label>
                                <Select
                                    value={formData.temperature}
                                    onValueChange={(val) => updateFormData({ temperature: val })}
                                >
                                    <SelectTrigger className="h-14 text-lg bg-white dark:bg-slate-950 border-slate-200">
                                        <SelectValue placeholder="Select Temperature" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="frozen">-18°C (Frozen)</SelectItem>
                                        <SelectItem value="chilled">+5°C (Chilled)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button
                                className="h-14 text-lg font-bold bg-brand-blue hover:bg-blue-700 mt-4 shadow-lg shadow-blue-500/20"
                                disabled={!formData.commodity || !formData.temperature}
                                onClick={() => setViewStage("pick")}
                            >
                                View Available Containers
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
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold">Select an Upcoming Consolidation</h3>
                                <p className="text-sm text-slate-500">Pick a container to add your cargo.</p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setViewStage("initial")}>
                                <ArrowLeft className="mr-2 h-4 w-4" /> Change Specs
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {MOCK_CONTAINERS.map((container) => (
                                <motion.div
                                    key={container.id}
                                    whileHover={{ scale: 1.02 }}
                                    className="group relative cursor-pointer"
                                    onClick={() => handleSelectContainer(container)}
                                >
                                    <div className="h-48 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm group-hover:shadow-md transition-all">
                                        <ContainerScene
                                            preFilledCount={container.preFilled}
                                            className="h-full pointer-events-none"
                                        />
                                    </div>
                                    <div className="mt-3 space-y-1">
                                        <div className="flex justify-between items-center px-1">
                                            <span className="font-bold text-sm text-slate-900 dark:text-white">{container.vessel}</span>
                                            <span className="text-[10px] font-bold bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">{container.date}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 px-1 text-xs text-slate-500">
                                            <Boxes className="h-3 w-3" />
                                            <span>{maxCapacity - container.preFilled} Pallets Space</span>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* STAGE 3: ADJUST QUANTITY */}
                {viewStage === "adjust" && selectedContainer && (
                    <motion.div
                        key="adjust"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col lg:flex-row gap-8 py-4"
                    >
                        {/* Detail Visualization */}
                        <div className="flex-1 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                        <Ship className="h-6 w-6 text-brand-blue" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-white">{selectedContainer.vessel}</h3>
                                        <p className="text-xs text-slate-500">Loading for {selectedContainer.date} departure</p>
                                    </div>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => setViewStage("pick")} className="rounded-full">
                                    <ArrowLeft className="mr-2 h-4 w-4" /> Switch Container
                                </Button>
                            </div>

                            <ContainerScene
                                preFilledCount={selectedContainer.preFilled}
                                userAddedCount={count}
                                className="h-[300px] sm:h-[450px]"
                            />
                        </div>

                        {/* Controls Sidebar */}
                        <div className="w-full lg:w-80 space-y-6">
                            <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-8">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-end">
                                        <div className="space-y-0.5">
                                            <Label className="text-xs uppercase tracking-wider font-bold text-slate-400">Total Pallets</Label>
                                            <p className="text-3xl font-black text-slate-900 dark:text-white">
                                                {count + selectedContainer.preFilled}
                                                <span className="text-sm text-slate-400 font-medium ml-1">/ 20</span>
                                            </p>
                                        </div>
                                        <div className={`text-right ${getStatusColor()}`}>
                                            <p className="text-2xl font-bold">+{count}</p>
                                            <p className="text-[10px] font-bold uppercase tracking-tight">Your Contribution</p>
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <Slider
                                            defaultValue={[count]}
                                            max={remainingCapacity}
                                            step={1}
                                            onValueChange={(vals) => updateFormData({ palletCount: vals[0] })}
                                            className="py-4"
                                        />
                                        <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                                            <span>0 Added</span>
                                            <span>{remainingCapacity} Pallets Max</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                                        <ThermometerSnowflake className="h-5 w-5 text-blue-500" />
                                        <div className="text-xs">
                                            <p className="font-bold text-slate-900 dark:text-white">Reefer Settings</p>
                                            <p className="text-slate-500">{formData.temperature === 'frozen' ? '-18°C Continuous' : '+5°C Continuous'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                                        <Info className="h-5 w-5 text-amber-500" />
                                        <div className="text-xs">
                                            <p className="font-bold text-slate-900 dark:text-white">LCL Optimization</p>
                                            <p className="text-slate-500">Shared consolidation run</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-sm text-slate-500">Estimated Total</span>
                                        <span className="text-lg font-bold text-emerald-600">${(1350 + (count * 50)).toLocaleString()}</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 leading-tight">Incl. fuel surcharge & terminal handling fees.</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
