"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ChevronRight, ChevronLeft, Check } from "lucide-react"
import { Step1Route } from "./step-1-route"
import { Step2Cargo } from "./step-2-cargo"
import { Step3Docs } from "./step-3-docs"
import { toast } from "sonner"

export function BookingWizard() {
    const [step, setStep] = useState(1)
    const [formData, setFormData] = useState({
        origin: "",
        destination: "",
        date: undefined,
        palletCount: 12,
        commodity: "",
        temperature: "",
        consigneeName: "",
        consigneeAddress: "",
        hasDocs: false
    })

    const updateFormData = (data: any) => {
        setFormData((prev) => ({ ...prev, ...data }))
    }

    const nextStep = () => {
        // Validation for Step 1 (Cargo - WAS Step 2)
        if (step === 1) {
            if (formData.palletCount < 5) {
                toast.error("Minimum 5 pallets required.")
                return
            }
            if (!formData.commodity || !formData.temperature) {
                toast.error("Please select commodity and temperature.")
                return
            }
        }

        // Validation for Step 2 (Route - WAS Step 1)
        if (step === 2) {
            if (!formData.origin || !formData.destination || !formData.date) {
                toast.error("Please complete all route details.")
                return
            }
        }

        setStep((prev) => Math.min(prev + 1, 3))
    }

    const prevStep = () => setStep((prev) => Math.max(prev - 1, 1))

    const handleSubmit = () => {
        if (!formData.consigneeName) {
            toast.error("Consignee Name is required.")
            return
        }
        // Mock Submission
        toast.success("Booking Submitted Successfully! Ref: SRS-9921")
        // Reset or redirect logic here
    }

    return (
        <div className="max-w-4xl mx-auto">
            {/* Step Indicator */}
            <div className="mb-8">
                <div className="flex items-center justify-between relative">
                    <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-slate-200 dark:bg-slate-800 -z-10" />

                    {[1, 2, 3].map((s) => (
                        <div key={s} className={`flex flex-col items-center gap-2 bg-slate-50 dark:bg-slate-950 px-2`}>
                            <div
                                className={`
                            h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm transition-all
                            ${step >= s ? "bg-brand-blue text-white shadow-lg shadow-brand-blue/30 scale-110" : "bg-slate-200 text-slate-500 dark:bg-slate-800"}
                        `}
                            >
                                {step > s ? <Check className="h-5 w-5" /> : s}
                            </div>
                            <span className={`text-xs font-medium ${step >= s ? "text-brand-blue" : "text-slate-500"}`}>
                                {s === 1 && "Cargo"}
                                {s === 2 && "Route"}
                                {s === 3 && "Review"}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-slate-100 dark:border-slate-800 min-h-[500px] flex flex-col justify-between">
                <AnimatePresence mode="wait">
                    {/* Note: Components are reused but ordered differently */}
                    {step === 1 && <Step2Cargo key="step1" formData={formData} updateFormData={updateFormData} />}
                    {step === 2 && <Step1Route key="step2" formData={formData} updateFormData={updateFormData} />}
                    {step === 3 && <Step3Docs key="step3" formData={formData} updateFormData={updateFormData} />}
                </AnimatePresence>

                {/* Footer Actions */}
                <div className="flex justify-between items-center pt-8 border-t border-slate-100 dark:border-slate-800 mt-8">
                    <Button
                        variant="ghost"
                        onClick={prevStep}
                        disabled={step === 1}
                        className="text-slate-500"
                    >
                        <ChevronLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>

                    {step < 3 ? (
                        <Button onClick={nextStep} className="bg-brand-blue hover:bg-blue-700 min-w-[120px]">
                            Next Step
                            <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                    ) : (
                        <Button onClick={handleSubmit} className="bg-emerald-600 hover:bg-emerald-700 min-w-[120px]">
                            Confirm Booking
                            <Check className="ml-2 h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}
