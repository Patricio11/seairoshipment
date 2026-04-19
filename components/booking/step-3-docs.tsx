"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { UploadCloud, FileText, X, Loader2, CheckCircle2, AlertCircle, Plus } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import type { BookingFormData } from "@/types"
import { DOCUMENT_TYPES, documentLabel, DOCUMENT_TYPE_BY_CODE } from "@/lib/constants/document-types"

interface Step3Props {
    formData: BookingFormData
    updateFormData: (data: Partial<BookingFormData>) => void
}

// One file either fulfils a required-doc slot or is an ad-hoc "other" upload
interface UploadedFile {
    id: string
    file: File
    documentCode: string  // from DOCUMENT_TYPES; "OTHER" for ad-hoc
}

function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function Step3Docs({ formData, updateFormData }: Step3Props) {
    const [files, setFiles] = useState<UploadedFile[]>([])
    const [uploading, setUploading] = useState(false)
    const [requiredDocuments, setRequiredDocuments] = useState<string[]>([])
    const [loadingRequirements, setLoadingRequirements] = useState(false)

    // Per-slot ref for the hidden file input
    const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

    // Fetch the category's required-documents list
    useEffect(() => {
        if (!formData.categoryId) {
            setRequiredDocuments([])
            return
        }
        let cancelled = false
        const fetchRequirements = async () => {
            setLoadingRequirements(true)
            try {
                const res = await fetch(`/api/bookings/category-docs?categoryId=${formData.categoryId}`)
                if (!res.ok) return
                const data = await res.json()
                if (!cancelled) setRequiredDocuments(Array.isArray(data.requiredDocuments) ? data.requiredDocuments : [])
            } catch {
                // ignore
            } finally {
                if (!cancelled) setLoadingRequirements(false)
            }
        }
        fetchRequirements()
        return () => { cancelled = true }
    }, [formData.categoryId])

    // Sync file state to formData whenever it changes
    const syncToFormData = useCallback((next: UploadedFile[]) => {
        updateFormData({
            hasDocs: next.length > 0,
            files: next.map(u => u.file),
            fileEntries: next.map(u => ({ file: u.file, documentCode: u.documentCode })),
        })
    }, [updateFormData])

    const addFileForCode = (file: File | null | undefined, documentCode: string) => {
        if (!file) return
        setUploading(true)
        setTimeout(() => {
            setFiles(prev => {
                // Replace existing file for this required-doc slot (except OTHER, which appends)
                const filtered = documentCode === "OTHER"
                    ? prev
                    : prev.filter(u => u.documentCode !== documentCode)
                const next: UploadedFile[] = [...filtered, {
                    id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
                    file,
                    documentCode,
                }]
                syncToFormData(next)
                return next
            })
            setUploading(false)
        }, 300)
    }

    const removeFile = (id: string) => {
        setFiles(prev => {
            const next = prev.filter(f => f.id !== id)
            syncToFormData(next)
            return next
        })
    }

    const openPickerForCode = (code: string) => {
        inputRefs.current[code]?.click()
    }

    const fileForCode = (code: string) => files.find(f => f.documentCode === code)
    const uploadedRequired = requiredDocuments.filter(code => fileForCode(code)).length
    const otherFiles = files.filter(f => !requiredDocuments.includes(f.documentCode))

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full space-y-4 sm:space-y-6"
        >
            <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold">Consignee &amp; Documents</h3>
                <p className="text-sm text-muted-foreground">Enter the consignee and upload each required document.</p>
            </div>

            {/* Consignee details */}
            <div className="grid gap-4 md:grid-cols-2 text-left">
                <div className="space-y-2">
                    <Label>Consignee Name <span className="text-red-500">*</span></Label>
                    <Input
                        placeholder="e.g. Global Foods Ltd"
                        value={formData.consigneeName || ""}
                        onChange={(e) => updateFormData({ consigneeName: e.target.value })}
                        className="bg-white dark:bg-slate-950"
                    />
                </div>
                <div className="space-y-2">
                    <Label>Consignee Address</Label>
                    <Input
                        placeholder="Delivery Location"
                        value={formData.consigneeAddress || ""}
                        onChange={(e) => updateFormData({ consigneeAddress: e.target.value })}
                        className="bg-white dark:bg-slate-950"
                    />
                </div>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 my-4" />

            {/* Documents header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-brand-blue" />
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Required Documents</h4>
                    {formData.categoryName && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wider">
                            {formData.categoryName}
                        </span>
                    )}
                </div>
                {requiredDocuments.length > 0 && (
                    <span className={`text-xs font-mono font-bold ${uploadedRequired === requiredDocuments.length ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500"}`}>
                        {uploadedRequired}/{requiredDocuments.length} uploaded
                    </span>
                )}
            </div>

            {loadingRequirements ? (
                <div className="flex items-center justify-center py-8 text-slate-500 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading document requirements…
                </div>
            ) : requiredDocuments.length === 0 ? (
                <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/30 bg-amber-50 dark:bg-amber-900/10 text-sm flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-bold text-amber-900 dark:text-amber-300">No required documents listed</p>
                        <p className="text-xs text-amber-800 dark:text-amber-400 mt-0.5">
                            You can still upload any supporting documents using the &quot;Other Document&quot; section below.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="space-y-2">
                    {requiredDocuments.map(code => {
                        const docType = DOCUMENT_TYPE_BY_CODE.get(code)
                        const uploaded = fileForCode(code)
                        const slotId = `req-${code}`
                        return (
                            <div
                                key={code}
                                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${uploaded
                                    ? "border-emerald-200 dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-950/20"
                                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                                    }`}
                            >
                                {/* Hidden file input */}
                                <input
                                    ref={el => { inputRefs.current[code] = el }}
                                    type="file"
                                    className="hidden"
                                    onChange={(e) => {
                                        addFileForCode(e.target.files?.[0], code)
                                        e.target.value = ""
                                    }}
                                />

                                <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${uploaded
                                    ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                                    }`}>
                                    {uploaded ? <CheckCircle2 className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                                </div>

                                <div className="flex-1 min-w-0 text-left">
                                    <label htmlFor={slotId} className="text-sm font-bold text-slate-900 dark:text-slate-100 cursor-pointer">
                                        {docType?.label || code}
                                    </label>
                                    {uploaded ? (
                                        <p className="text-xs text-emerald-700 dark:text-emerald-400 truncate">
                                            {uploaded.file.name} · {formatBytes(uploaded.file.size)}
                                        </p>
                                    ) : docType?.description ? (
                                        <p className="text-[11px] text-slate-500 leading-snug">{docType.description}</p>
                                    ) : null}
                                </div>

                                {uploaded ? (
                                    <div className="flex items-center gap-1 shrink-0">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => openPickerForCode(code)}
                                            className="text-xs h-8"
                                        >
                                            Replace
                                        </Button>
                                        <button
                                            type="button"
                                            onClick={() => removeFile(uploaded.id)}
                                            className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                ) : (
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={() => openPickerForCode(code)}
                                        className="bg-brand-blue hover:bg-brand-blue/90 text-white text-xs h-8 shrink-0"
                                    >
                                        <UploadCloud className="h-3.5 w-3.5 mr-1.5" /> Upload
                                    </Button>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Other / ad-hoc uploads */}
            <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Other Documents (optional)</span>
                </div>

                {otherFiles.length > 0 && (
                    <div className="space-y-2">
                        {otherFiles.map(uf => (
                            <div
                                key={uf.id}
                                className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                            >
                                <div className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                    <FileText className="h-4 w-4 text-slate-500" />
                                </div>
                                <div className="flex-1 min-w-0 text-left">
                                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{uf.file.name}</p>
                                    <p className="text-xs text-muted-foreground">{formatBytes(uf.file.size)} · {documentLabel(uf.documentCode)}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeFile(uf.id)}
                                    className="h-7 w-7 rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 shrink-0"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <input
                    ref={el => { inputRefs.current["OTHER"] = el }}
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                        addFileForCode(e.target.files?.[0], "OTHER")
                        e.target.value = ""
                    }}
                />
                <button
                    type="button"
                    onClick={() => openPickerForCode("OTHER")}
                    disabled={uploading}
                    className="w-full py-3 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-brand-blue hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors flex items-center justify-center gap-2 text-slate-500 hover:text-brand-blue text-sm font-medium"
                >
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Upload an additional document
                </button>
            </div>

            {/* Terms & Conditions */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-6 mt-6">
                <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                    <Checkbox
                        id="terms"
                        checked={formData.agreeToTerms || false}
                        onCheckedChange={(checked) => updateFormData({ agreeToTerms: checked === true })}
                        className="mt-1"
                    />
                    <div className="flex-1">
                        <label
                            htmlFor="terms"
                            className="text-sm font-medium leading-relaxed cursor-pointer"
                        >
                            I agree to the{" "}
                            <a href="#" className="text-brand-blue hover:underline font-semibold">
                                Terms & Conditions
                            </a>
                            {" "}and{" "}
                            <a href="#" className="text-brand-blue hover:underline font-semibold">
                                Privacy Policy
                            </a>
                        </label>
                    </div>
                </div>
            </div>
        </motion.div>
    )
}

// Silence unused imports warnings when the full DOCUMENT_TYPES list isn't referenced directly
void DOCUMENT_TYPES
