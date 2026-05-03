"use client"

import { FileText, MoreVertical, Download, Eye, Trash2, Loader2, Lock } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useState } from "react"
import { toast } from "sonner"

export type DocType = "Invoice" | "BoL" | "CoA" | "PackingList" | "Other"
export type DocSource = "CLIENT_UPLOAD" | "METASHIP_CLIENT" | "METASHIP_SHARED"

interface DocumentCardProps {
    id: string
    name: string
    type: DocType
    sizeBytes?: number | null
    uploadedAt: string | Date
    refId?: string
    url?: string | null
    source: DocSource
    allocationId: string
    onDelete?: (docId: string) => void
}

const TypeColors: Record<DocType, string> = {
    Invoice: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    BoL: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
    CoA: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
    PackingList: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
    Other: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
}

function formatSize(bytes?: number | null): string {
    if (!bytes || bytes <= 0) return "—"
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`
}

function formatDate(d: string | Date): string {
    const date = typeof d === "string" ? new Date(d) : d
    return date.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })
}

export function DocumentCard({
    id, name, type, sizeBytes, uploadedAt, refId, url, source, allocationId, onDelete,
}: DocumentCardProps) {
    const [deleting, setDeleting] = useState(false)
    const isClientUpload = source === "CLIENT_UPLOAD"
    const canOpen = !!url

    const handleOpen = () => {
        if (!url) { toast.error("No preview URL available"); return }
        window.open(url, "_blank", "noopener,noreferrer")
    }

    const handleDownload = async () => {
        if (!url) { toast.error("No download URL available"); return }
        // Anchor-based download lets the browser stream the file directly without
        // proxying through the server. `download` attr hints the filename.
        try {
            const link = document.createElement("a")
            link.href = url
            link.download = name
            link.rel = "noopener noreferrer"
            link.target = "_blank"
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
        } catch {
            toast.error("Couldn't start download")
        }
    }

    const handleDelete = async () => {
        if (!confirm(`Delete "${name}"? This can't be undone.`)) return
        setDeleting(true)
        try {
            const res = await fetch(
                `/api/bookings/${allocationId}/documents?docId=${encodeURIComponent(id)}`,
                { method: "DELETE" },
            )
            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                toast.error(data.error || "Couldn't delete document")
                return
            }
            toast.success("Document deleted")
            onDelete?.(id)
        } catch {
            toast.error("Couldn't delete document")
        } finally {
            setDeleting(false)
        }
    }

    return (
        <Card className="group hover:shadow-lg transition-all border-slate-200 dark:border-slate-800">
            <CardContent className="p-4">
                <div className="flex items-start justify-between">
                    <button
                        type="button"
                        onClick={handleOpen}
                        disabled={!canOpen}
                        className={`h-10 w-10 rounded-lg flex items-center justify-center ${TypeColors[type]} ${canOpen ? "hover:opacity-80 cursor-pointer" : "cursor-not-allowed opacity-60"}`}
                        aria-label="Open document"
                    >
                        <FileText className="h-5 w-5" />
                    </button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400" disabled={deleting}>
                                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreVertical className="h-4 w-4" />}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={handleOpen} disabled={!canOpen}>
                                <Eye className="mr-2 h-4 w-4" /> Preview
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleDownload} disabled={!canOpen}>
                                <Download className="mr-2 h-4 w-4" /> Download
                            </DropdownMenuItem>
                            {isClientUpload && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleDelete} className="text-red-500 focus:text-red-500">
                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <div className="mt-4 space-y-1">
                    <h3 className="font-medium text-slate-900 dark:text-slate-100 truncate" title={name}>
                        {name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>{formatSize(sizeBytes)}</span>
                        <span>•</span>
                        <span>{formatDate(uploadedAt)}</span>
                    </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <Badge variant="secondary" className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-none shrink-0">
                            {type}
                        </Badge>
                        {!isClientUpload && (
                            <span
                                className="text-[10px] text-slate-400 inline-flex items-center gap-0.5"
                                title={source === "METASHIP_CLIENT" ? "Issued by carrier — not editable" : "Container-level document — not editable"}
                            >
                                <Lock className="h-2.5 w-2.5" />
                                Carrier
                            </span>
                        )}
                    </div>
                    {refId && (
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-50 dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800 truncate">
                            {refId}
                        </span>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
