"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { UploadCloud, FileText, Check, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Step3Props {
    formData: any
    updateFormData: (data: any) => void
}

export function Step3Docs({ formData, updateFormData }: Step3Props) {
    const [isDragging, setIsDragging] = useState(false)
    const [file, setFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            simulateUpload(e.dataTransfer.files[0])
        }
    }

    const simulateUpload = (file: File) => {
        setUploading(true)
        // Mock upload delay
        setTimeout(() => {
            setFile(file)
            setUploading(false)
            updateFormData({ hasDocs: true })
        }, 1500)
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

            <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`
                border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all bg-slate-50/50 dark:bg-slate-900/20
                ${isDragging ? "border-brand-blue bg-blue-50/50 dark:bg-blue-900/10 scale-105" : "border-slate-300 dark:border-slate-700"}
                ${file ? "border-emerald-500 bg-emerald-50/50" : ""}
            `}
            >
                {uploading ? (
                    <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-10 w-10 text-brand-blue animate-spin" />
                        <span className="text-sm font-medium text-brand-blue">Scanning document...</span>
                    </div>
                ) : file ? (
                    <div className="flex flex-col items-center gap-2">
                        <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                            <Check className="h-6 w-6" />
                        </div>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{file.name}</span>
                        <span className="text-xs text-muted-foreground">Virus scan passed</span>
                        <button
                            onClick={() => { setFile(null); updateFormData({ hasDocs: false }); }}
                            className="text-xs text-red-500 underline mt-2"
                        >
                            Remove
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                            <UploadCloud className="h-6 w-6 text-slate-500" />
                        </div>
                        <p className="font-medium text-slate-900 dark:text-slate-100">Drag & drop files here</p>
                        <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
                    </>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3 opacity-50">
                    <FileText className="h-5 w-5 text-slate-400" />
                    <div className="flex flex-col text-left">
                        <span className="text-sm font-medium">Packing List</span>
                        <span className="text-xs text-muted-foreground">Optional for quote</span>
                    </div>
                </div>
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3 bg-white dark:bg-slate-950">
                    <FileText className="h-5 w-5 text-brand-blue" />
                    <div className="flex flex-col text-left">
                        <span className="text-sm font-medium">Commercial Invoice</span>
                        <span className="text-xs text-muted-foreground">Required</span>
                    </div>
                </div>
            </div>
        </motion.div>
    )
}
