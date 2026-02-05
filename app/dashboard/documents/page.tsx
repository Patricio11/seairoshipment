"use client"

import { useState } from "react"
import { DocumentCard, DocType } from "@/components/documents/document-card"
import { UploadDialog } from "@/components/documents/upload-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Ship, ArrowLeft, FileText, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

// Mock shipments
const SHIPMENTS = [
    { refId: "SRS-001", route: "Cape Town → Rotterdam", vessel: "MSC Orchestra", status: "Sailing", date: "Oct 24, 2025" },
    { refId: "SRS-002", route: "Cape Town → London Gateway", vessel: "Maersk Vallvik", status: "Booked", date: "Nov 02, 2025" },
    { refId: "SRS-003", route: "Durban → Singapore", vessel: "CMA CGM Blue", status: "Delivered", date: "Nov 10, 2025" },
]

// Mock documents organized by shipment
const allDocs = [
    { id: '1', name: 'Commercial_Invoice_SRS-001.pdf', type: 'Invoice', size: '2.4 MB', date: 'Oct 24, 2025', refId: 'SRS-001' },
    { id: '2', name: 'Bill_of_Lading_Master.pdf', type: 'BoL', size: '1.1 MB', date: 'Oct 25, 2025', refId: 'SRS-001' },
    { id: '3', name: 'Certificate_Analysis_Batch_99.pdf', type: 'CoA', size: '840 KB', date: 'Oct 25, 2025', refId: 'SRS-001' },
    { id: '4', name: 'Packing_List_Final.xlsx', type: 'PackingList', size: '45 KB', date: 'Oct 24, 2025', refId: 'SRS-001' },
    { id: '5', name: 'Health_Certificate_CPT.pdf', type: 'CoA', size: '620 KB', date: 'Oct 26, 2025', refId: 'SRS-001' },
    { id: '6', name: 'SRS-002_Invoice_Draft.pdf', type: 'Invoice', size: '1.8 MB', date: 'Nov 02, 2025', refId: 'SRS-002' },
    { id: '7', name: 'Temp_Log_TIVE_SRS-002.csv', type: 'Other', size: '12 KB', date: 'Nov 12, 2025', refId: 'SRS-002' },
    { id: '8', name: 'Bill_of_Lading_SRS-002.pdf', type: 'BoL', size: '980 KB', date: 'Nov 03, 2025', refId: 'SRS-002' },
    { id: '9', name: 'Commercial_Invoice_SRS-003.pdf', type: 'Invoice', size: '2.1 MB', date: 'Nov 10, 2025', refId: 'SRS-003' },
    { id: '10', name: 'Bill_of_Lading_SRS-003.pdf', type: 'BoL', size: '1.3 MB', date: 'Nov 11, 2025', refId: 'SRS-003' },
    { id: '11', name: 'CoA_Citrus_Batch_201.pdf', type: 'CoA', size: '750 KB', date: 'Nov 11, 2025', refId: 'SRS-003' },
    { id: '12', name: 'Packing_List_SRS-003.xlsx', type: 'PackingList', size: '38 KB', date: 'Nov 10, 2025', refId: 'SRS-003' },
    { id: '13', name: 'Delivery_Confirmation_SRS-003.pdf', type: 'Other', size: '220 KB', date: 'Nov 20, 2025', refId: 'SRS-003' },
] as const

const STATUS_COLORS: Record<string, string> = {
    Sailing: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    Booked: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    Delivered: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
}

export default function DocumentsPage() {
    const [search, setSearch] = useState("")
    const [selectedShipment, setSelectedShipment] = useState<string | null>(null)

    // Filter shipments by search
    const filteredShipments = SHIPMENTS.filter(s =>
        s.refId.toLowerCase().includes(search.toLowerCase()) ||
        s.route.toLowerCase().includes(search.toLowerCase()) ||
        s.vessel.toLowerCase().includes(search.toLowerCase())
    )

    // Get docs for selected shipment
    const shipmentDocs = selectedShipment
        ? allDocs.filter(doc => doc.refId === selectedShipment)
        : []

    const selectedShipmentData = SHIPMENTS.find(s => s.refId === selectedShipment)

    const renderGrid = (type?: string) => {
        const docs = type
            ? shipmentDocs.filter(d => d.type === type)
            : shipmentDocs

        if (docs.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="h-16 w-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                        <FileText className="h-6 w-6 text-slate-400" />
                    </div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">No documents found</h3>
                    <p className="text-slate-500">No documents of this type for this shipment.</p>
                </div>
            )
        }

        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-6">
                {docs.map((doc) => (
                    <DocumentCard
                        key={doc.id}
                        {...doc}
                        type={doc.type as DocType}
                    />
                ))}
            </div>
        )
    }

    // Shipment selection view
    if (!selectedShipment) {
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
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                            <Input
                                placeholder="Search shipments..."
                                className="pl-9 bg-white dark:bg-slate-950"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <UploadDialog />
                    </div>
                </div>

                <div className="space-y-3">
                    {filteredShipments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="h-16 w-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                                <Search className="h-6 w-6 text-slate-400" />
                            </div>
                            <h3 className="font-semibold text-slate-900 dark:text-slate-100">No shipments found</h3>
                            <p className="text-slate-500">Try adjusting your search query.</p>
                        </div>
                    ) : (
                        filteredShipments.map((shipment) => {
                            const docCount = allDocs.filter(d => d.refId === shipment.refId).length
                            return (
                                <button
                                    key={shipment.refId}
                                    onClick={() => { setSelectedShipment(shipment.refId); setSearch("") }}
                                    className="w-full text-left group"
                                >
                                    <div className="flex items-center justify-between p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-blue-300 dark:hover:border-blue-800 hover:shadow-md transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                                                <Ship className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-3">
                                                    <span className="font-bold text-slate-900 dark:text-white font-mono">
                                                        {shipment.refId}
                                                    </span>
                                                    <Badge className={`text-[10px] font-semibold border-none ${STATUS_COLORS[shipment.status] || ""}`}>
                                                        {shipment.status}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                                                    {shipment.route} &middot; {shipment.vessel}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right hidden sm:block">
                                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                                    {docCount} {docCount === 1 ? "document" : "documents"}
                                                </span>
                                                <p className="text-xs text-slate-400">{shipment.date}</p>
                                            </div>
                                            <ChevronRight className="h-5 w-5 text-slate-300 dark:text-slate-600 group-hover:text-blue-500 transition-colors" />
                                        </div>
                                    </div>
                                </button>
                            )
                        })
                    )}
                </div>
            </div>
        )
    }

    // Document view for selected shipment
    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedShipment(null)}
                        className="shrink-0"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                                {selectedShipment}
                            </h1>
                            {selectedShipmentData && (
                                <Badge className={`text-xs font-semibold border-none ${STATUS_COLORS[selectedShipmentData.status] || ""}`}>
                                    {selectedShipmentData.status}
                                </Badge>
                            )}
                        </div>
                        <p className="text-slate-500 dark:text-slate-400">
                            {selectedShipmentData?.route} &middot; {selectedShipmentData?.vessel}
                        </p>
                    </div>
                </div>
                <UploadDialog />
            </div>

            <Tabs defaultValue="all" className="flex-1">
                <TabsList className="w-full sm:w-auto flex flex-wrap h-auto p-1 bg-slate-100 dark:bg-slate-900">
                    <TabsTrigger value="all">
                        All ({shipmentDocs.length})
                    </TabsTrigger>
                    <TabsTrigger value="invoice">
                        Invoices ({shipmentDocs.filter(d => d.type === "Invoice").length})
                    </TabsTrigger>
                    <TabsTrigger value="bol">
                        Bills of Lading ({shipmentDocs.filter(d => d.type === "BoL").length})
                    </TabsTrigger>
                    <TabsTrigger value="coa">
                        Certificates ({shipmentDocs.filter(d => d.type === "CoA").length})
                    </TabsTrigger>
                    <TabsTrigger value="packing">
                        Packing Lists ({shipmentDocs.filter(d => d.type === "PackingList").length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="mt-0">{renderGrid()}</TabsContent>
                <TabsContent value="invoice" className="mt-0">{renderGrid("Invoice")}</TabsContent>
                <TabsContent value="bol" className="mt-0">{renderGrid("BoL")}</TabsContent>
                <TabsContent value="coa" className="mt-0">{renderGrid("CoA")}</TabsContent>
                <TabsContent value="packing" className="mt-0">{renderGrid("PackingList")}</TabsContent>
            </Tabs>
        </div>
    )
}
