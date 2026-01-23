"use client"

import { ContainerScene } from "./container-scene"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { motion } from "framer-motion"
import { Info, AlertCircle, CheckCircle } from "lucide-react"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface Step2Props {
    formData: any
    updateFormData: (data: any) => void
}

export function Step2Cargo({ formData, updateFormData }: Step2Props) {
    const count = formData.palletCount || 0
    const maxCapacity = 20

    const getStatusColor = () => {
        if (count === 0) return "text-slate-500"
        if (count < 5) return "text-red-500"
        if (count === maxCapacity) return "text-emerald-500"
        return "text-brand-blue"
    }

    const getStatusMessage = () => {
        if (count === 0) return "Container empty"
        if (count < 5) return "Minimum 5 pallets required for LCL"
        if (count === maxCapacity) return "Maximum capacity reached"
        return "Optimal loading"
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
        >
            <div className="flex flex-col md:flex-row gap-6">
                {/* Controls */}
                <div className="w-full md:w-1/3 space-y-8">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <Label className="text-lg font-semibold">Pallet Count</Label>
                            <span className={`text-2xl font-bold ${getStatusColor()}`}>{count} / {maxCapacity}</span>
                        </div>

                        <Slider
                            defaultValue={[count]}
                            max={20}
                            step={1}
                            onValueChange={(vals) => updateFormData({ palletCount: vals[0] })}
                            className="py-4"
                        />

                        <div className={`flex items-center gap-2 text-sm font-medium ${getStatusColor()}`}>
                            {count < 5 && count > 0 && <AlertCircle className="h-4 w-4" />}
                            {count === 20 && <CheckCircle className="h-4 w-4" />}
                            {count >= 5 && count < 20 && <Info className="h-4 w-4" />}
                            <span>{getStatusMessage()}</span>
                        </div>
                    </div>

                    {/* Commodity & Temp */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Commodity</Label>
                            <Select
                                value={formData.commodity}
                                onValueChange={(val) => updateFormData({ commodity: val })}
                            >
                                <SelectTrigger className="bg-white dark:bg-slate-950">
                                    <SelectValue placeholder="Select" />
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
                            <Label>Temperature</Label>
                            <Select
                                value={formData.temperature}
                                onValueChange={(val) => updateFormData({ temperature: val })}
                            >
                                <SelectTrigger className="bg-white dark:bg-slate-950">
                                    <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="frozen">-18°C (Frozen)</SelectItem>
                                    <SelectItem value="chilled">+5°C (Chilled)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="rounded-lg bg-slate-50 p-4 border border-slate-200 dark:bg-slate-900/50 dark:border-slate-800 text-sm space-y-2">
                        <div className="flex justify-between text-slate-500 dark:text-slate-400">
                            <span>Base Rate</span>
                            <span>$1,200</span>
                        </div>
                        <div className="flex justify-between text-slate-500 dark:text-slate-400">
                            <span>Fuel Surchage</span>
                            <span>$150</span>
                        </div>
                        <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between font-bold text-slate-900 dark:text-slate-100">
                            <span>Est. Total</span>
                            <span>${(1350 + (count * 50)).toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* 3D Scene */}
                <div className="w-full md:w-2/3">
                    <ContainerScene palletCount={count} />
                </div>
            </div>
        </motion.div>
    )
}
