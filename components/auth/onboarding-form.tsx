"use client"

import { useState, useRef } from "react"
import { motion } from "framer-motion"
import { Building2, MapPin, Hash, Globe2, Receipt, FileCheck2, FileWarning, UploadCloud, Loader2, CheckCircle2, X, AlertTriangle, ArrowRight } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { uploadFile, STORAGE_PATHS } from "@/lib/supabase"
import { useRouter } from "next/navigation"

type DocType = "COMPANY_REG_CERT" | "PROOF_OF_ADDRESS" | "VAT_CERT"

interface UploadedDoc {
    type: DocType
    originalName: string
    url: string
    mimeType?: string
    sizeBytes?: number
}

interface InitialFields {
    companyName: string
    companyReg: string
    companyAddress: string
    companyCountry: string
    vatNumber: string
}

interface OnboardingFormProps {
    initial: InitialFields
    adminNote?: string | null
}

const DOC_META: Record<DocType, { label: string; description: string; required: boolean }> = {
    COMPANY_REG_CERT: {
        label: "Company Registration Certificate",
        description: "CIPC certificate or equivalent for your country",
        required: true,
    },
    PROOF_OF_ADDRESS: {
        label: "Proof of Address",
        description: "Utility bill, lease, or bank statement (last 3 months)",
        required: true,
    },
    VAT_CERT: {
        label: "VAT Certificate",
        description: "Optional — speeds up tax setup",
        required: false,
    },
}

export function OnboardingForm({ initial, adminNote }: OnboardingFormProps) {
    const router = useRouter()
    const [companyName, setCompanyName] = useState(initial.companyName || "")
    const [companyReg, setCompanyReg] = useState(initial.companyReg || "")
    const [companyAddress, setCompanyAddress] = useState(initial.companyAddress || "")
    const [companyCountry, setCompanyCountry] = useState(initial.companyCountry || "")
    const [vatNumber, setVatNumber] = useState(initial.vatNumber || "")
    const [docs, setDocs] = useState<Record<DocType, UploadedDoc | null>>({
        COMPANY_REG_CERT: null,
        PROOF_OF_ADDRESS: null,
        VAT_CERT: null,
    })
    const [uploading, setUploading] = useState<DocType | null>(null)
    const [submitting, setSubmitting] = useState(false)
    const inputRefs = useRef<Record<DocType, HTMLInputElement | null>>({
        COMPANY_REG_CERT: null,
        PROOF_OF_ADDRESS: null,
        VAT_CERT: null,
    })

    const handleUpload = async (type: DocType, file: File | undefined) => {
        if (!file) return
        setUploading(type)
        try {
            const result = await uploadFile(file, STORAGE_PATHS.COMPANY_DOCUMENTS)
            if (!result.success || !result.url) {
                toast.error(result.error || "Upload failed")
                return
            }
            setDocs(prev => ({
                ...prev,
                [type]: {
                    type,
                    originalName: file.name,
                    url: result.url!,
                    mimeType: file.type,
                    sizeBytes: file.size,
                },
            }))
            toast.success(`${DOC_META[type].label} uploaded`)
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Upload failed")
        } finally {
            setUploading(null)
        }
    }

    const removeDoc = (type: DocType) => {
        setDocs(prev => ({ ...prev, [type]: null }))
    }

    const requiredDocsReady = !!docs.COMPANY_REG_CERT && !!docs.PROOF_OF_ADDRESS
    const fieldsReady = !!companyName.trim() && !!companyReg.trim() && !!companyAddress.trim() && companyCountry.trim().length === 2
    const canSubmit = fieldsReady && requiredDocsReady && !submitting && !uploading

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!canSubmit) return
        setSubmitting(true)
        try {
            const documents = Object.values(docs).filter((d): d is UploadedDoc => d !== null)
            const res = await fetch("/api/auth/onboarding", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    companyName,
                    companyReg,
                    companyAddress,
                    companyCountry,
                    vatNumber,
                    documents,
                }),
            })
            const data = await res.json()
            if (!res.ok) {
                toast.error(data.error || "Failed to submit onboarding")
                return
            }
            toast.success("Application submitted", { description: "Our team will review and email you shortly." })
            router.refresh()
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to submit onboarding")
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {adminNote && (
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-3 rounded-2xl border border-amber-300 dark:border-amber-900/40 bg-amber-50/70 dark:bg-amber-900/10 p-4"
                >
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-sm">
                        <p className="font-bold text-amber-900 dark:text-amber-200">Our team asked for changes</p>
                        <p className="text-amber-800/80 dark:text-amber-200/80 mt-1">{adminNote}</p>
                    </div>
                </motion.div>
            )}

            {/* Company fields */}
            <div className="grid gap-5 sm:grid-cols-2">
                <Field icon={Building2} label="Legal Company Name" required>
                    <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme (Pty) Ltd" />
                </Field>
                <Field icon={Hash} label="Company Registration No." required>
                    <Input value={companyReg} onChange={(e) => setCompanyReg(e.target.value)} placeholder="2020/123456/07" />
                </Field>
                <Field icon={Globe2} label="Country" required hint="2-letter ISO code (e.g. ZA, NL, GB)">
                    <Input
                        value={companyCountry}
                        onChange={(e) => setCompanyCountry(e.target.value.toUpperCase().slice(0, 2))}
                        placeholder="ZA"
                        maxLength={2}
                        className="uppercase"
                    />
                </Field>
                <Field icon={Receipt} label="VAT Number" hint="Optional">
                    <Input value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} placeholder="4123456789" />
                </Field>
                <Field icon={MapPin} label="Physical Address" required className="sm:col-span-2">
                    <Input
                        value={companyAddress}
                        onChange={(e) => setCompanyAddress(e.target.value)}
                        placeholder="12 Main Road, Cape Town, 8001, South Africa"
                    />
                </Field>
            </div>

            {/* Documents */}
            <div className="space-y-3">
                <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">Verification Documents</p>
                    <p className="text-xs text-slate-500 mt-0.5">Drop in PDFs or images. Required documents must be uploaded before you can submit.</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                    {(Object.keys(DOC_META) as DocType[]).map(type => {
                        const meta = DOC_META[type]
                        const doc = docs[type]
                        const busy = uploading === type
                        return (
                            <div
                                key={type}
                                className={`rounded-2xl border-2 p-4 transition-colors ${
                                    doc
                                        ? "border-emerald-500/50 bg-emerald-50/40 dark:bg-emerald-900/10"
                                        : meta.required
                                            ? "border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-900/30"
                                            : "border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-900/20"
                                }`}
                            >
                                <div className="flex items-start justify-between gap-3 mb-3">
                                    <div className="flex items-start gap-2.5">
                                        <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${doc ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" : "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}>
                                            {doc ? <FileCheck2 className="h-4 w-4" /> : <FileWarning className="h-4 w-4" />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                                {meta.label}
                                                {meta.required && <span className="text-red-500 text-xs">*</span>}
                                            </p>
                                            <p className="text-[11px] text-slate-500 mt-0.5">{meta.description}</p>
                                        </div>
                                    </div>
                                </div>

                                {doc ? (
                                    <div className="flex items-center justify-between gap-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2">
                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                                            <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{doc.originalName}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeDoc(type)}
                                            className="shrink-0 h-7 w-7 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center justify-center"
                                            aria-label="Remove"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <input
                                            ref={(el) => { inputRefs.current[type] = el }}
                                            type="file"
                                            accept="application/pdf,image/*"
                                            className="hidden"
                                            onChange={(e) => handleUpload(type, e.target.files?.[0])}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => inputRefs.current[type]?.click()}
                                            disabled={busy}
                                            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-brand-blue hover:border-brand-blue transition-colors disabled:opacity-60"
                                        >
                                            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
                                            {busy ? "Uploading…" : "Upload file"}
                                        </button>
                                    </>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

            <div className="pt-2 flex justify-end">
                <Button
                    type="submit"
                    disabled={!canSubmit}
                    className="bg-brand-blue hover:bg-brand-blue/90 text-white font-bold h-12 px-6 rounded-xl text-sm shadow-lg shadow-brand-blue/20"
                >
                    {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ArrowRight className="h-4 w-4 mr-2" />}
                    {submitting ? "Submitting…" : "Submit for review"}
                </Button>
            </div>
        </form>
    )
}

interface FieldProps {
    icon: typeof Building2
    label: string
    hint?: string
    required?: boolean
    children: React.ReactNode
    className?: string
}

function Field({ icon: Icon, label, hint, required, children, className = "" }: FieldProps) {
    return (
        <div className={`space-y-1.5 ${className}`}>
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5 text-brand-blue" />
                {label}
                {required && <span className="text-red-500">*</span>}
                {hint && <span className="text-[10px] font-normal text-slate-400 ml-auto">{hint}</span>}
            </Label>
            {children}
        </div>
    )
}
