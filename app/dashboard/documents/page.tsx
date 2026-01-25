"use client"

import { useState } from "react"
import { DocumentCard, DocType } from "@/components/documents/document-card"
import { UploadDialog } from "@/components/documents/upload-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

// Mock Data
const allDocs = [
    { id: '1', name: 'Commercial_Invoice_SRS-001.pdf', type: 'Invoice', size: '2.4 MB', date: 'Oct 24, 2025', refId: 'SRS-001' },
    { id: '2', name: 'Bill_of_Lading_Master.pdf', type: 'BoL', size: '1.1 MB', date: 'Oct 25, 2025', refId: 'SRS-001' },
    { id: '3', name: 'Certificate_Analysis_Batch_99.pdf', type: 'CoA', size: '840 KB', date: 'Oct 25, 2025', refId: 'SRS-001' },
    { id: '4', name: 'Packing_List_Final.xlsx', type: 'PackingList', size: '45 KB', date: 'Oct 24, 2025', refId: 'SRS-001' },
    { id: '5', name: 'SRS-002_Invoice_Draft.pdf', type: 'Invoice', size: '1.8 MB', date: 'Nov 02, 2025', refId: 'SRS-002' },
    { id: '6', name: 'Insurance_Policy_Global.pdf', type: 'Other', size: '3.2 MB', date: 'Nov 01, 2025', refId: 'SRS-GEN' },
    { id: '7', name: 'Temp_Log_TIVE_SRS-002.csv', type: 'Other', size: '12 KB', date: 'Nov 12, 2025', refId: 'SRS-002' },
] as const

export default function DocumentsPage() {
    const [search, setSearch] = useState("")

    const filteredDocs = allDocs.filter(doc =>
        doc.name.toLowerCase().includes(search.toLowerCase()) ||
        doc.refId?.toLowerCase().includes(search.toLowerCase())
    )

    const renderGrid = (type?: string) => {
        const docs = type
            ? filteredDocs.filter(d => d.type === type)
            : filteredDocs

        if (docs.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="h-16 w-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                        <Search className="h-6 w-6 text-slate-400" />
                    </div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">No documents found</h3>
                    <p className="text-slate-500">Try adjusting your filters or search query.</p>
                </div>
            )
        }

        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-6">
                {docs.map((doc) => (
                    <DocumentCard
                        key={doc.id}
                        {...doc}
                        type={doc.type as DocType} // casting for simplicity with mock data
                    />
                ))}
            </div>
        )
    }

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                        Digital Vault
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">
                        Secure centralised repository for all trade documentation.
                    </p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                        <Input
                            placeholder="Search by name or ref..."
                            className="pl-9 bg-white dark:bg-slate-950"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <UploadDialog />
                </div>
            </div>

            <Tabs defaultValue="all" className="flex-1">
                <TabsList className="w-full sm:w-auto flex flex-wrap h-auto p-1 bg-slate-100 dark:bg-slate-900">
                    <TabsTrigger value="all">All Documents</TabsTrigger>
                    <TabsTrigger value="invoice">Invoices</TabsTrigger>
                    <TabsTrigger value="bol">Bills of Lading</TabsTrigger>
                    <TabsTrigger value="coa">Certificates</TabsTrigger>
                    <TabsTrigger value="packing">Packing Lists</TabsTrigger>
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
