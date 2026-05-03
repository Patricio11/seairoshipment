"use client"

import { useEffect, useMemo, useState } from "react"
import { DocumentCard, type DocType, type DocSource } from "@/components/documents/document-card"
import { UploadDialog } from "@/components/documents/upload-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Ship, ArrowLeft, FileText, ChevronRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

type BookingStatus = "PENDING" | "DEPOSIT_PAID" | "CONFIRMED" | "SAILING" | "DELIVERED" | "CANCELLED"

interface Shipment {
    allocationId: string
    bookingRef: string
    status: BookingStatus
    route: string
    vessel: string
    voyageNumber: string | null
    etd: string | null
    eta: string | null
    createdAt: string
    docCount: number
}

type DocTypeEnum = "INVOICE" | "BOL" | "COA" | "PACKING_LIST" | "OTHER"

interface DocRow {
    id: string
    allocationId: string | null
    containerId: string | null
    originalName: string
    type: DocTypeEnum
    url: string | null
    source: DocSource
    mimeType: string | null
    sizeBytes: number | null
    uploadedAt: string
}

const STATUS_LABELS: Record<BookingStatus, string> = {
    PENDING: "Pending",
    DEPOSIT_PAID: "Deposit paid",
    CONFIRMED: "Booked",
    SAILING: "Sailing",
    DELIVERED: "Delivered",
    CANCELLED: "Cancelled",
}

const STATUS_COLORS: Record<BookingStatus, string> = {
    PENDING: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    DEPOSIT_PAID: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    CONFIRMED: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    SAILING: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    DELIVERED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
}

const TYPE_TO_LABEL: Record<DocTypeEnum, DocType> = {
    INVOICE: "Invoice",
    BOL: "BoL",
    COA: "CoA",
    PACKING_LIST: "PackingList",
    OTHER: "Other",
}

function routeLabel(route: string): string {
    const parts = route.split("-")
    if (parts.length !== 2) return route
    return `${parts[0]} → ${parts[1]}`
}

function formatDate(d: string | null): string {
    if (!d) return "—"
    return new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })
}

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

export default function DocumentsPage() {
    const [shipments, setShipments] = useState<Shipment[]>([])
    const [shipmentsLoading, setShipmentsLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [selected, setSelected] = useState<Shipment | null>(null)

    // Detail-view state
    const [docs, setDocs] = useState<DocRow[]>([])
    const [docsLoading, setDocsLoading] = useState(false)

    /* ----- Fetch shipments list ----- */
    useEffect(() => {
        let cancelled = false
        fetch("/api/dashboard/documents", { cache: "no-store" })
            .then(r => r.ok ? r.json() : { shipments: [] })
            .then(d => { if (!cancelled && Array.isArray(d.shipments)) setShipments(d.shipments) })
            .catch(() => toast.error("Couldn't load shipments"))
            .finally(() => { if (!cancelled) setShipmentsLoading(false) })
        return () => { cancelled = true }
    }, [])

    /* ----- Fetch docs for selected shipment ----- */
    const refreshDocs = async (allocationId: string) => {
        setDocsLoading(true)
        try {
            const res = await fetch(`/api/bookings/${allocationId}/documents`, { cache: "no-store" })
            if (!res.ok) throw new Error("Failed to load documents")
            const data = await res.json()
            // Endpoint returns `flat` (all rows) plus the grouped buckets.
            const rows: DocRow[] = Array.isArray(data.flat) ? data.flat : []
            setDocs(rows)
            // Keep the doc count on the list view in sync after upload/delete.
            setShipments(prev => prev.map(s => s.allocationId === allocationId ? { ...s, docCount: rows.length } : s))
        } catch {
            toast.error("Couldn't load documents")
            setDocs([])
        } finally {
            setDocsLoading(false)
        }
    }

    useEffect(() => {
        if (!selected) { setDocs([]); return }
        refreshDocs(selected.allocationId)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selected?.allocationId])

    /* ----- Filtering ----- */
    const filteredShipments = useMemo(() => {
        const q = search.trim().toLowerCase()
        if (!q) return shipments
        return shipments.filter(s =>
            s.bookingRef.toLowerCase().includes(q) ||
            s.route.toLowerCase().includes(q) ||
            s.vessel.toLowerCase().includes(q),
        )
    }, [shipments, search])

    const filteredDocs = useMemo(() => {
        const q = search.trim().toLowerCase()
        if (!q) return docs
        return docs.filter(d => d.originalName.toLowerCase().includes(q))
    }, [docs, search])

    /* ----- Render document grid ----- */
    const renderGrid = (filterType?: DocTypeEnum) => {
        const list = filterType ? filteredDocs.filter(d => d.type === filterType) : filteredDocs

        if (docsLoading) {
            return (
                <div className="flex items-center justify-center py-20 text-slate-500 gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" /> Loading documents…
                </div>
            )
        }

        if (list.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="h-16 w-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                        <FileText className="h-6 w-6 text-slate-400" />
                    </div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">No documents yet</h3>
                    <p className="text-slate-500 max-w-sm mt-1">
                        {search.trim()
                            ? "No documents match your search."
                            : filterType
                                ? "No documents of this type for this shipment."
                                : "Upload an invoice, packing list, or certificate to get started."}
                    </p>
                </div>
            )
        }

        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-6">
                {list.map((doc) => (
                    <DocumentCard
                        key={doc.id}
                        id={doc.id}
                        name={doc.originalName}
                        type={TYPE_TO_LABEL[doc.type]}
                        sizeBytes={doc.sizeBytes}
                        uploadedAt={doc.uploadedAt}
                        refId={selected?.bookingRef}
                        url={doc.url}
                        source={doc.source}
                        allocationId={selected!.allocationId}
                        onDelete={() => selected && refreshDocs(selected.allocationId)}
                    />
                ))}
            </div>
        )
    }

    /* ----- List (shipment selection) view ----- */
    if (!selected) {
        return (
            <div className="space-y-6 h-full flex flex-col">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                            Digital Vault
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400">
                            Select a shipment to view its documents.
                        </p>
                    </div>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                        <Input
                            placeholder="Search shipments…"
                            className="pl-9 bg-white dark:bg-slate-950"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {shipmentsLoading ? (
                    <div className="flex items-center justify-center py-20 text-slate-500 gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" /> Loading shipments…
                    </div>
                ) : shipments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="h-16 w-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                            <Ship className="h-6 w-6 text-slate-400" />
                        </div>
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100">No shipments yet</h3>
                        <p className="text-slate-500 max-w-sm mt-1">
                            Once you book a shared reefer, you can upload and access its documents here.
                        </p>
                    </div>
                ) : filteredShipments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="h-16 w-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                            <Search className="h-6 w-6 text-slate-400" />
                        </div>
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100">No shipments match your search</h3>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredShipments.map((s) => (
                            <button
                                key={s.allocationId}
                                onClick={() => { setSelected(s); setSearch("") }}
                                className="w-full text-left group"
                            >
                                <div className="flex items-center justify-between p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-blue-300 dark:hover:border-blue-800 hover:shadow-md transition-all">
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className="h-12 w-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                                            <Ship className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-3">
                                                <span className="font-bold text-slate-900 dark:text-white font-mono">
                                                    {s.bookingRef}
                                                </span>
                                                <Badge className={`text-[10px] font-semibold border-none ${STATUS_COLORS[s.status]}`}>
                                                    {STATUS_LABELS[s.status]}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                                                {routeLabel(s.route)} · {s.vessel}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 shrink-0 pl-4">
                                        <div className="text-right hidden sm:block">
                                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                                {s.docCount} {s.docCount === 1 ? "document" : "documents"}
                                            </span>
                                            <p className="text-xs text-slate-400">{formatDate(s.etd)}</p>
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-slate-300 dark:text-slate-600 group-hover:text-blue-500 transition-colors" />
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        )
    }

    /* ----- Detail view (selected shipment) ----- */
    const counts = {
        all: filteredDocs.length,
        invoice: filteredDocs.filter(d => d.type === "INVOICE").length,
        bol: filteredDocs.filter(d => d.type === "BOL").length,
        coa: filteredDocs.filter(d => d.type === "COA").length,
        packing: filteredDocs.filter(d => d.type === "PACKING_LIST").length,
        other: filteredDocs.filter(d => d.type === "OTHER").length,
    }

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => { setSelected(null); setSearch("") }}
                        className="shrink-0"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 font-mono">
                                {selected.bookingRef}
                            </h1>
                            <Badge className={`text-xs font-semibold border-none ${STATUS_COLORS[selected.status]}`}>
                                {STATUS_LABELS[selected.status]}
                            </Badge>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400">
                            {routeLabel(selected.route)} · {selected.vessel}
                            {selected.voyageNumber ? ` · Voy ${selected.voyageNumber}` : ""}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                        <Input
                            placeholder="Search documents…"
                            className="pl-9 bg-white dark:bg-slate-950"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <UploadDialog
                        allocationId={selected.allocationId}
                        bookingRef={selected.bookingRef}
                        onUploaded={() => refreshDocs(selected.allocationId)}
                    />
                </div>
            </div>

            <Tabs defaultValue="all" className="flex-1">
                <TabsList className="w-full sm:w-auto flex flex-wrap h-auto p-1 bg-slate-100 dark:bg-slate-900">
                    <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
                    <TabsTrigger value="invoice">Invoices ({counts.invoice})</TabsTrigger>
                    <TabsTrigger value="bol">Bills of Lading ({counts.bol})</TabsTrigger>
                    <TabsTrigger value="coa">Certificates ({counts.coa})</TabsTrigger>
                    <TabsTrigger value="packing">Packing Lists ({counts.packing})</TabsTrigger>
                    {counts.other > 0 && <TabsTrigger value="other">Other ({counts.other})</TabsTrigger>}
                </TabsList>

                <TabsContent value="all" className="mt-0">{renderGrid()}</TabsContent>
                <TabsContent value="invoice" className="mt-0">{renderGrid("INVOICE")}</TabsContent>
                <TabsContent value="bol" className="mt-0">{renderGrid("BOL")}</TabsContent>
                <TabsContent value="coa" className="mt-0">{renderGrid("COA")}</TabsContent>
                <TabsContent value="packing" className="mt-0">{renderGrid("PACKING_LIST")}</TabsContent>
                <TabsContent value="other" className="mt-0">{renderGrid("OTHER")}</TabsContent>
            </Tabs>
        </div>
    )
}
