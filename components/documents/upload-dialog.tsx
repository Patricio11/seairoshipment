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
import { Input } from "@/components/ui/input"
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

const DOC_TYPE_LABELS: Record<string, string> = {
    invoice: "Invoice",
    bol: "BoL",
    coa: "CoA",
    packing: "PackingList",
}

function generateStoredName(
    accountNumber: string | undefined,
    docType: string,
    shipmentRef: string,
    originalName: string
): string {
    const ext = originalName.split(".").pop() || "pdf"
    const acc = accountNumber || "UNVERIFIED"
    const typeLabel = DOC_TYPE_LABELS[docType] || "Document"
    const ref = shipmentRef || "NO-REF"
    return `${acc}_${typeLabel}_${ref}.${ext}`
}

export function UploadDialog() {
    const [isOpen, setIsOpen] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const [file, setFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)
    const [docType, setDocType] = useState("")
    const [shipmentRef, setShipmentRef] = useState("")
    const { user } = useAuth()

    const storedName = file && docType
        ? generateStoredName(user?.accountNumber, docType, shipmentRef, file.name)
        : null

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0])
        }
    }

    const handleUpload = () => {
        if (!file) return
        setUploading(true)
        // TODO: integrate with UploadThing for real file storage
        setTimeout(() => {
            setUploading(false)
            toast.success("Document uploaded successfully to Vault.", {
                description: storedName ? `Saved as: ${storedName}` : undefined,
            })
            setFile(null)
            setDocType("")
            setShipmentRef("")
            setIsOpen(false)
        }, 1500)
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button className="bg-brand-blue hover:bg-brand-blue/90">
                    <UploadCloud className="mr-2 h-4 w-4" />
                    Upload Document
                </Button>
            </DialogTrigger>
            <DialogContent
                className="sm:max-w-md"
                onInteractOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
            >
                <DialogHeader>
                    <DialogTitle>Upload to Vault</DialogTitle>
                    <DialogDescription>
                        Securely upload trade documents. Supported: PDF, Excel, JPG.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Document Type</Label>
                            <Select value={docType} onValueChange={setDocType}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="invoice">Commercial Invoice</SelectItem>
                                    <SelectItem value="bol">Bill of Lading</SelectItem>
                                    <SelectItem value="coa">Certificate of Analysis</SelectItem>
                                    <SelectItem value="packing">Packing List</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Shipment Ref</Label>
                            <Input
                                placeholder="SRS-..."
                                value={shipmentRef}
                                onChange={(e) => setShipmentRef(e.target.value)}
                            />
                        </div>
                    </div>

                    <div
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                        className={`
                    border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer
                    ${isDragging ? "border-brand-blue bg-blue-50 dark:bg-blue-900/10" : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"}
                    ${file ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10" : ""}
                `}
                    >
                        {file ? (
                            <div className="flex flex-col items-center gap-2">
                                <FileText className="h-8 w-8 text-emerald-500" />
                                <span className="text-sm font-medium">{file.name}</span>
                                {storedName && (
                                    <span className="text-xs text-brand-blue font-mono bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                                        Saved as: {storedName}
                                    </span>
                                )}
                                <Button
                                    variant="link"
                                    className="text-red-500 h-auto p-0 text-xs"
                                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                                >
                                    Remove
                                </Button>
                            </div>
                        ) : (
                            <>
                                <UploadCloud className="h-8 w-8 text-slate-400 mb-2" />
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Drag & drop or Click</p>
                            </>
                        )}
                    </div>
                </div>

                <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button onClick={handleUpload} disabled={!file || uploading}>
                        {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {uploading ? "Encrypting..." : "Upload Securely"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
