"use client"

import { useState } from "react"
import { UploadCloud, FileText, Loader2 } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth/client"
import { uploadFile, STORAGE_PATHS } from "@/lib/supabase"

// Maps the UI's friendly value → the documents.type pgEnum value
const DOC_TYPE_TO_ENUM: Record<string, "INVOICE" | "BOL" | "COA" | "PACKING_LIST" | "OTHER"> = {
    invoice: "INVOICE",
    bol: "BOL",
    coa: "COA",
    packing: "PACKING_LIST",
    other: "OTHER",
}

const DOC_TYPE_LABEL: Record<string, string> = {
    invoice: "Invoice",
    bol: "BoL",
    coa: "CoA",
    packing: "PackingList",
    other: "Document",
}

function generateStoredName(
    accountNumber: string | undefined,
    docType: string,
    bookingRef: string,
    originalName: string,
): string {
    const ext = originalName.includes(".") ? originalName.split(".").pop() : "pdf"
    const acc = accountNumber || "UNVERIFIED"
    const typeLabel = DOC_TYPE_LABEL[docType] || "Document"
    const ref = bookingRef || "NO-REF"
    return `${acc}_${typeLabel}_${ref}.${ext}`
}

interface UploadDialogProps {
    /** Required to know which shipment the upload attaches to */
    allocationId: string
    /** Booking ref for the stored-name template + UI context */
    bookingRef: string
    /** Fired after a successful upload so the parent can refresh its doc list */
    onUploaded?: () => void
}

export function UploadDialog({ allocationId, bookingRef, onUploaded }: UploadDialogProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const [file, setFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)
    const [docType, setDocType] = useState("")
    const { user } = useAuth()

    const storedName = file && docType
        ? generateStoredName(user?.accountNumber, docType, bookingRef, file.name)
        : null

    const reset = () => {
        setFile(null)
        setDocType("")
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0])
        }
    }

    const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) setFile(e.target.files[0])
        // allow re-picking the same file later
        e.target.value = ""
    }

    const handleUpload = async () => {
        if (!file) { toast.error("Choose a file to upload"); return }
        if (!docType) { toast.error("Pick a document type"); return }

        setUploading(true)
        try {
            const finalName = storedName ?? file.name
            const result = await uploadFile(file, STORAGE_PATHS.BOOKING_DOCUMENTS, finalName)
            if (!result.success || !result.url) {
                toast.error(result.error || "Upload failed")
                return
            }

            const res = await fetch(`/api/bookings/${allocationId}/documents`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    originalName: file.name,
                    storedName: finalName,
                    url: result.url,
                    type: DOC_TYPE_TO_ENUM[docType] ?? "OTHER",
                    mimeType: file.type || null,
                    sizeBytes: file.size,
                }),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
                toast.error(data.error || "Saved file but couldn't link it to the shipment")
                return
            }

            toast.success("Document uploaded", { description: `Saved as: ${finalName}` })
            reset()
            setIsOpen(false)
            onUploaded?.()
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Upload failed")
        } finally {
            setUploading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) reset() }}>
            <DialogTrigger asChild>
                <Button className="bg-brand-blue hover:bg-brand-blue/90">
                    <UploadCloud className="mr-2 h-4 w-4" />
                    Upload Document
                </Button>
            </DialogTrigger>
            <DialogContent
                className="sm:max-w-md"
                onInteractOutside={(e) => uploading && e.preventDefault()}
                onEscapeKeyDown={(e) => uploading && e.preventDefault()}
            >
                <DialogHeader>
                    <DialogTitle>Upload to Vault — {bookingRef}</DialogTitle>
                    <DialogDescription>
                        Securely upload trade documents for this shipment. Supported: PDF, Excel, JPG, PNG.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label>Document type</Label>
                        <Select value={docType} onValueChange={setDocType}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="invoice">Commercial Invoice</SelectItem>
                                <SelectItem value="bol">Bill of Lading</SelectItem>
                                <SelectItem value="coa">Certificate of Analysis</SelectItem>
                                <SelectItem value="packing">Packing List</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <label
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                        className={`
                            block border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer
                            ${isDragging ? "border-brand-blue bg-blue-50 dark:bg-blue-900/10" : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"}
                            ${file ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10" : ""}
                        `}
                    >
                        <input
                            type="file"
                            className="hidden"
                            accept="application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/jpeg,image/png"
                            onChange={handleFilePick}
                        />
                        {file ? (
                            <div className="flex flex-col items-center gap-2">
                                <FileText className="h-8 w-8 text-emerald-500" />
                                <span className="text-sm font-medium">{file.name}</span>
                                <span className="text-xs text-slate-500">
                                    {(file.size / 1024).toFixed(0)} KB · {file.type || "Unknown type"}
                                </span>
                                {storedName && (
                                    <span className="text-xs text-brand-blue font-mono bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                                        Saved as: {storedName}
                                    </span>
                                )}
                                <Button
                                    type="button"
                                    variant="link"
                                    className="text-red-500 h-auto p-0 text-xs"
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setFile(null) }}
                                >
                                    Remove
                                </Button>
                            </div>
                        ) : (
                            <>
                                <UploadCloud className="h-8 w-8 text-slate-400 mb-2" />
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Drag &amp; drop or click to select</p>
                                <p className="text-xs text-slate-400 mt-1">Max size 10 MB</p>
                            </>
                        )}
                    </label>
                </div>

                <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setIsOpen(false)} disabled={uploading}>Cancel</Button>
                    <Button onClick={handleUpload} disabled={!file || !docType || uploading}>
                        {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {uploading ? "Uploading…" : "Upload"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
