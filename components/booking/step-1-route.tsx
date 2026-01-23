"use client"

import { CalendarIcon, MapPin } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { motion } from "framer-motion"

interface Step1Props {
    formData: any
    updateFormData: (data: any) => void
}

export function Step1Route({ formData, updateFormData }: Step1Props) {
    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
        >
            <div className="grid gap-6 md:grid-cols-2">
                {/* Origin */}
                <div className="space-y-2">
                    <Label>Origin Port</Label>
                    <Select
                        value={formData.origin}
                        onValueChange={(val) => updateFormData({ origin: val })}
                    >
                        <SelectTrigger className="h-12 bg-white dark:bg-slate-950">
                            <SelectValue placeholder="Select Origin" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="CPT">Cape Town (ZACPT)</SelectItem>
                            <SelectItem value="DUR">Durban (ZADUR)</SelectItem>
                            <SelectItem value="PLZ">Port Elizabeth (ZAPLZ)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Destination */}
                <div className="space-y-2">
                    <Label>Destination Port</Label>
                    <Select
                        value={formData.destination}
                        onValueChange={(val) => updateFormData({ destination: val })}
                    >
                        <SelectTrigger className="h-12 bg-white dark:bg-slate-950">
                            <SelectValue placeholder="Select Destination" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="RTM">Rotterdam (NLRTM)</SelectItem>
                            <SelectItem value="LND">London Gateway (GBLGP)</SelectItem>
                            <SelectItem value="ASH">Ashdod (ILASH)</SelectItem>
                            <SelectItem value="SIN">Singapore (SGSIN)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Date Picker */}
            <div className="space-y-2">
                <Label>Ready Date (CRD)</Label>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant={"outline"}
                            className={cn(
                                "w-full h-12 justify-start text-left font-normal bg-white dark:bg-slate-950",
                                !formData.date && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.date ? format(formData.date, "PPP") : <span>Pick a date</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={formData.date}
                            onSelect={(date) => updateFormData({ date })}
                            disabled={(date) => date < new Date()}
                            initialFocus
                        />
                    </PopoverContent>
                </Popover>
                <p className="text-xs text-muted-foreground">
                    *Date must be at least 21 days from today for optimal rates.
                </p>
            </div>

            {/* Visual Route Check */}
            {formData.origin && formData.destination && (
                <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 dark:bg-blue-900/10 dark:border-blue-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-brand-blue">{formData.origin}</span>
                        <div className="h-[2px] w-12 bg-slate-300 dark:bg-slate-600 relative">
                            <div className="absolute right-0 -top-1 h-2 w-2 rounded-full bg-slate-400" />
                        </div>
                        <span className="font-bold text-brand-blue">{formData.destination}</span>
                    </div>
                    <div className="text-xs font-medium text-slate-600 dark:text-slate-400">
                        Est. Transit: 18 Days
                    </div>
                </div>
            )}
        </motion.div>
    )
}
