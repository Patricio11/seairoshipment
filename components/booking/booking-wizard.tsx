"use client"

import { useState } from "react"
import { AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ChevronRight, ChevronLeft, Check, Loader2 } from "lucide-react"
import { Step2Cargo } from "./step-2-cargo"
import { StepCostBreakdown } from "./step-cost-breakdown"
import { Step3Docs } from "./step-3-docs"
import { toast } from "sonner"
import type { BookingFormData, CostBreakdown } from "@/types"
import { bookingModalStore } from "@/hooks/use-booking-modal"
import { useAuth } from "@/lib/auth/client"
import { uploadFile, STORAGE_PATHS } from "@/lib/supabase"

const STEP_LABELS = ["Cargo & Route", "Cost & Payment", "Confirm Booking"]
const TOTAL_STEPS = 3

/** Map our specific document code to the legacy coarse enum on `documents.type`. */
function mapDocCodeToLegacyType(code: string): "INVOICE" | "BOL" | "COA" | "PACKING_LIST" | "OTHER" {
    switch (code) {
        case "COMMERCIAL_INVOICE":
        case "SUPPLIER_INVOICE": return "INVOICE"
        case "BILL_OF_LADING": return "BOL"
        case "COA": return "COA"
        case "PACKING_LIST": return "PACKING_LIST"
        default: return "OTHER"
    }
}

export function BookingWizard({ onSuccess }: { onSuccess?: () => void }) {
    const { user } = useAuth()
    const [step, setStep] = useState(1)
    const [submitting, setSubmitting] = useState(false)
    const [costBreakdown, setCostBreakdown] = useState<CostBreakdown | null>(null)
    const [formData, setFormData] = useState<BookingFormData>({
        origin: "",
        destination: "",
        date: undefined,
        sailingScheduleId: "",
        voyageNumber: "",
        vesselName: "",
        palletCount: 5,
        commodity: "",
        commodityName: "",
        hsCode: "",
        commodityDescription: "",
        nettWeight: 0,
        grossWeight: 0,
        temperature: "",
        consigneeName: "",
        consigneeAddress: "",
        collectionAddresses: [{ address: "" }],
        hasDocs: false,
        containerId: "",
        vessel: "",
        agreeToTerms: false,
        poNumber: "",
        salesRateTypeId: "",
    })

    const updateFormData = (data: Partial<BookingFormData>) => {
        setFormData((prev) => ({ ...prev, ...data }))
    }

    const nextStep = () => {
        if (step === 1) {
            if (!formData.containerId || formData.palletCount < 1) {
                toast.error("Please select at least 1 pallet.")
                return
            }
        }
        setStep((prev) => Math.min(prev + 1, TOTAL_STEPS))
    }

    const prevStep = () => setStep((prev) => Math.max(prev - 1, 1))

    const handleSubmit = async () => {
        if (!formData.consigneeName) {
            toast.error("Consignee Name is required.")
            return
        }
        const cleanCollectionAddresses = (formData.collectionAddresses || [])
            .map(a => ({ label: a.label?.trim() || undefined, address: a.address.trim() }))
            .filter(a => a.address.length > 0)
        if (cleanCollectionAddresses.length === 0) {
            toast.error("Add at least one collection / loading address.")
            return
        }
        if (!formData.agreeToTerms) {
            toast.error("Please agree to the Terms & Conditions to continue.")
            return
        }

        setSubmitting(true)
        try {
            const res = await fetch("/api/bookings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    origin: formData.origin,
                    destination: formData.destination,
                    sailingScheduleId: formData.sailingScheduleId,
                    vessel: formData.vessel,
                    voyageNumber: formData.voyageNumber,
                    etd: formData.sailingDate,
                    palletCount: formData.palletCount,
                    productId: formData.commodity,
                    commodityName: formData.commodityName,
                    hsCode: formData.hsCode,
                    nettWeight: formData.nettWeight,
                    grossWeight: formData.grossWeight,
                    temperature: formData.temperature,
                    consigneeName: formData.consigneeName,
                    consigneeAddress: formData.consigneeAddress,
                    collectionAddresses: cleanCollectionAddresses,
                    containerId: formData.containerId,
                    poNumber: formData.poNumber || null,
                    salesRateTypeId: formData.salesRateTypeId || "srs",
                }),
            })

            const data = await res.json()

            if (!res.ok) {
                toast.error(data.error || "Failed to submit booking")
                return
            }

            // Upload documents via Supabase storage
            // Prefer fileEntries (with documentCode per file) — fall back to raw files with OTHER.
            const fileEntries: Array<{ file: File; documentCode: string }> =
                formData.fileEntries && formData.fileEntries.length > 0
                    ? formData.fileEntries
                    : (formData.files || []).map(f => ({ file: f, documentCode: "OTHER" }))
            const files = fileEntries.map(e => e.file)
            let uploadedCount = 0
            let failedCount = 0
            let firstErrorMessage = ""
            if (fileEntries.length > 0 && data.allocationId) {
                const accountPrefix = user?.accountNumber || "UNVERIFIED"
                console.log(`[booking] Uploading ${fileEntries.length} document(s) for allocation ${data.allocationId}`)
                const uploadResults = await Promise.allSettled(
                    fileEntries.map(async ({ file, documentCode }) => {
                        const prefixedName = `${accountPrefix}_${file.name}`
                        const result = await uploadFile(file, STORAGE_PATHS.BOOKING_DOCUMENTS, prefixedName)
                        if (!result.success || !result.url) {
                            throw new Error(result.error || "Upload failed")
                        }
                        const docRes = await fetch(`/api/bookings/${data.allocationId}/documents`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                originalName: prefixedName,
                                storedName: result.path,
                                url: result.url,
                                // Map our doc code to the legacy coarse type for back-compat
                                type: mapDocCodeToLegacyType(documentCode),
                                documentCode,
                            }),
                        })
                        if (!docRes.ok) {
                            const err = await docRes.json().catch(() => ({}))
                            throw new Error(err.error || `Failed to save document record (${docRes.status})`)
                        }
                    })
                )
                uploadedCount = uploadResults.filter(r => r.status === "fulfilled").length
                failedCount = uploadResults.filter(r => r.status === "rejected").length
                const firstRejected = uploadResults.find(r => r.status === "rejected")
                if (firstRejected && firstRejected.status === "rejected") {
                    firstErrorMessage = firstRejected.reason?.message || "Unknown error"
                    console.error(`[booking] ${failedCount} upload(s) failed. First error:`, firstErrorMessage)
                }
            }
            // silence unused-var warning when fileEntries path is taken
            void files

            // Show a single outcome toast
            if (files.length === 0) {
                toast.success("Booking Submitted Successfully!", {
                    description: `Reference: ${data.bookingReference} | ${data.totalPallets} pallet(s)`,
                    duration: 5000,
                })
            } else if (uploadedCount === files.length) {
                toast.success("Booking Submitted Successfully!", {
                    description: `Reference: ${data.bookingReference} | ${uploadedCount} document(s) uploaded`,
                    duration: 5000,
                })
            } else if (uploadedCount > 0) {
                toast.warning("Booking submitted, but some documents failed", {
                    description: `${uploadedCount}/${files.length} documents uploaded. Error: ${firstErrorMessage}`,
                    duration: 8000,
                })
            } else {
                toast.error("Booking submitted, but documents failed to upload", {
                    description: `Reason: ${firstErrorMessage}. Please re-upload from your bookings page.`,
                    duration: 10000,
                })
            }

            bookingModalStore.triggerRefresh()
            onSuccess?.()
        } catch (err) {
            console.error("[booking] Submit failed:", err)
            toast.error("Failed to submit booking. Please try again.")
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="max-w-4xl mx-auto w-full">
            {/* Step Indicator */}
            <div className="mb-6 sm:mb-8">
                <div className="flex items-center justify-between relative max-w-md mx-auto">
                    <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-slate-200 dark:bg-slate-800 -z-10" />

                    {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
                        <div key={s} className="flex flex-col items-center gap-1.5 bg-slate-50 dark:bg-slate-950 px-1 sm:px-2">
                            <div
                                className={`
                                h-8 w-8 sm:h-10 sm:w-10 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm transition-all
                                ${step >= s ? "bg-brand-blue text-white shadow-lg shadow-brand-blue/30 scale-110" : "bg-slate-200 text-slate-500 dark:bg-slate-800"}
                            `}
                            >
                                {step > s ? <Check className="h-4 w-4 sm:h-5 sm:w-5" /> : s}
                            </div>
                            <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-tight ${step >= s ? "text-brand-blue" : "text-slate-500"}`}>
                                {STEP_LABELS[s - 1]}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Content Container */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-xl border border-slate-100 dark:border-slate-800 min-h-[400px] sm:min-h-[500px] flex flex-col justify-between overflow-hidden">
                <div className="flex-1 overflow-y-auto">
                    <AnimatePresence mode="wait">
                        {step === 1 && <Step2Cargo key="step1" formData={formData} updateFormData={updateFormData} />}
                        {step === 2 && <StepCostBreakdown key="step2" formData={formData} updateFormData={updateFormData} onQuoteLoaded={setCostBreakdown} />}
                        {step === 3 && <Step3Docs key="step3" formData={formData} updateFormData={updateFormData} />}
                    </AnimatePresence>
                </div>

                {/* Footer Actions */}
                <div className="flex justify-between items-center pt-6 sm:pt-8 border-t border-slate-100 dark:border-slate-800 mt-6 sm:mt-8">
                    <Button
                        variant="ghost"
                        onClick={prevStep}
                        disabled={step === 1}
                        className="text-slate-500 text-sm sm:text-base h-9 sm:h-10 px-3 sm:px-4"
                    >
                        <ChevronLeft className="mr-1 sm:mr-2 h-4 w-4" />
                        Back
                    </Button>

                    {step < TOTAL_STEPS ? (
                        <Button
                            onClick={nextStep}
                            disabled={step === 2 && !costBreakdown}
                            className="bg-brand-blue hover:bg-brand-blue/90 min-w-[100px] sm:min-w-[120px] text-sm sm:text-base h-9 sm:h-10 font-bold"
                        >
                            Next Stage
                            <ChevronRight className="ml-1 sm:ml-2 h-4 w-4" />
                        </Button>
                    ) : (
                        <Button onClick={handleSubmit} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 min-w-[100px] sm:min-w-[120px] text-sm sm:text-base h-9 sm:h-10 font-bold">
                            {submitting ? (
                                <>
                                    <Loader2 className="mr-1 sm:mr-2 h-4 w-4 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    Confirm Booking
                                    <Check className="ml-1 sm:ml-2 h-4 w-4" />
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}
