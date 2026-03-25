"use client"

import { useState, useRef } from "react"
import { motion } from "framer-motion"
import { UploadCloud, FileText, X, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import type { BookingFormData } from "@/types"

interface Step3Props {
    formData: BookingFormData
    updateFormData: (data: Partial<BookingFormData>) => void
}

interface UploadedFile {
    file: File
    id: string
}

function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function Step3Docs({ formData, updateFormData }: Step3Props) {
    const [isDragging, setIsDragging] = useState(false)
    const [files, setFiles] = useState<UploadedFile[]>([])
    const [uploading, setUploading] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    const addFiles = (incoming: FileList | null) => {
        if (!incoming || incoming.length === 0) return
        setUploading(true)
        setTimeout(() => {
            const newFiles: UploadedFile[] = Array.from(incoming).map((f) => ({
                file: f,
                id: `${f.name}-${f.size}-${Date.now()}-${Math.random()}`,
            }))
            setFiles((prev) => {
                // Deduplicate by name+size
                const existing = new Set(prev.map((u) => `${u.file.name}-${u.file.size}`))
                const toAdd = newFiles.filter((u) => !existing.has(`${u.file.name}-${u.file.size}`))
                const next = [...prev, ...toAdd]
                updateFormData({ hasDocs: next.length > 0, files: next.map(u => u.file) })
                return next
            })
            setUploading(false)
        }, 800)
    }

    const removeFile = (id: string) => {
        setFiles((prev) => {
            const next = prev.filter((f) => f.id !== id)
            updateFormData({ hasDocs: next.length > 0, files: next.map(u => u.file) })
            return next
        })
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        addFiles(e.dataTransfer.files)
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full space-y-4 sm:space-y-6"
        >
            <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold">Docs & Review</h3>
                <p className="text-sm text-muted-foreground">Finalize shipment details and documentation.</p>
            </div>

            {/* Consignee Details */}
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

            {/* Drop zone */}
            <input
                ref={inputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => addFiles(e.target.files)}
            />
            <div
                onClick={() => !uploading && inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`
                    cursor-pointer border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all bg-slate-50/50 dark:bg-slate-900/20
                    ${isDragging ? "border-brand-blue bg-blue-50/50 dark:bg-blue-900/10 scale-105" : "border-slate-300 dark:border-slate-700 hover:border-brand-blue hover:bg-blue-50/30 dark:hover:bg-blue-900/5"}
                `}
            >
                {uploading ? (
                    <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-10 w-10 text-brand-blue animate-spin" />
                        <span className="text-sm font-medium text-brand-blue">Processing files...</span>
                    </div>
                ) : (
                    <>
                        <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                            <UploadCloud className="h-6 w-6 text-slate-500" />
                        </div>
                        <p className="font-medium text-slate-900 dark:text-slate-100">Drag & drop files here</p>
                        <p className="text-sm text-muted-foreground mt-1">or click to browse — multiple files supported</p>
                    </>
                )}
            </div>

            {/* File list */}
            {files.length > 0 && (
                <div className="space-y-2">
                    {files.map((uf) => (
                        <div
                            key={uf.id}
                            className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                        >
                            <div className="h-9 w-9 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                                <FileText className="h-4 w-4 text-brand-blue" />
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{uf.file.name}</p>
                                <p className="text-xs text-muted-foreground">{formatBytes(uf.file.size)}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => removeFile(uf.id)}
                                className="h-7 w-7 rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors shrink-0"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

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
