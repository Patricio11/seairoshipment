"use client"

import { useMemo, useState } from "react"
import { FileText, Loader2, Eye, Download, ChevronDown, ChevronRight, CheckCircle2, Layers, User as UserIcon } from "lucide-react"
import { documentLabel } from "@/lib/constants/document-types"

export interface AllocationDoc {
    id: string
    originalName: string
    type: string
    documentCode: string | null
    source: "CLIENT_UPLOAD" | "METASHIP_CLIENT" | "METASHIP_SHARED"
    metashipDocumentId: number | null
    metashipReference: string | null
    metashipDownloadUrl: string | null
    metashipUrlExpiresAt: string | null
    allocationId: string | null
    containerId: string | null
    status: string
    url: string | null
    uploadedAt: string
}

interface AllocationDocsProps {
    docs: AllocationDoc[]
    loading?: boolean
    onView: (doc: AllocationDoc) => void | Promise<void>
    /** If true, the "Your Uploads (drafts)" section is always visible. Defaults to false (hidden behind toggle). */
    alwaysShowDrafts?: boolean
}

/**
 * Renders an allocation's documents in three grouped sections:
 *   1. Finalised by MetaShip (METASHIP_CLIENT docs matched to this allocation)
 *   2. Container Documents (METASHIP_SHARED — visible to every client on the container)
 *   3. Your Uploads / Drafts (CLIENT_UPLOAD — hidden by default if finalised docs exist)
 */
export function AllocationDocs({ docs, loading, onView, alwaysShowDrafts }: AllocationDocsProps) {
    const [showDrafts, setShowDrafts] = useState(false)

    const { finalDocs, sharedDocs, draftDocs } = useMemo(() => {
        return {
            finalDocs: docs.filter(d => d.source === "METASHIP_CLIENT"),
            sharedDocs: docs.filter(d => d.source === "METASHIP_SHARED"),
            draftDocs: docs.filter(d => d.source === "CLIENT_UPLOAD"),
        }
    }, [docs])

    // Auto-hide drafts when finalised versions exist (clean UX per user spec)
    const hasFinalised = finalDocs.length > 0
    const draftsVisible = alwaysShowDrafts || !hasFinalised || showDrafts

    if (loading) {
        return (
            <div className="flex items-center gap-2 py-4 text-slate-500 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading documents...
            </div>
        )
    }

    if (docs.length === 0) {
        return (
            <div className="py-4 text-center text-slate-600 text-sm border border-slate-800 rounded-xl">
                No documents yet
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* 1. Finalised by MetaShip */}
            {finalDocs.length > 0 && (
                <Section
                    icon={<CheckCircle2 className="h-3 w-3 text-emerald-400" />}
                    label="Finalised by MetaShip"
                    accent="emerald"
                    count={finalDocs.length}
                >
                    {finalDocs.map(doc => (
                        <DocRow key={doc.id} doc={doc} onView={onView} />
                    ))}
                </Section>
            )}

            {/* 2. Container Documents (shared) */}
            {sharedDocs.length > 0 && (
                <Section
                    icon={<Layers className="h-3 w-3 text-sky-400" />}
                    label="Container Documents"
                    sub="Shared across all clients on this container"
                    accent="sky"
                    count={sharedDocs.length}
                >
                    {sharedDocs.map(doc => (
                        <DocRow key={doc.id} doc={doc} onView={onView} />
                    ))}
                </Section>
            )}

            {/* 3. Client uploads (drafts) */}
            {draftDocs.length > 0 && (
                <div>
                    {!alwaysShowDrafts && hasFinalised && (
                        <button
                            type="button"
                            onClick={() => setShowDrafts(v => !v)}
                            className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-slate-500 hover:text-slate-300 mb-2"
                        >
                            {showDrafts ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                            {showDrafts ? "Hide" : "Show"} original drafts ({draftDocs.length})
                        </button>
                    )}
                    {draftsVisible && (
                        <Section
                            icon={<UserIcon className="h-3 w-3 text-slate-400" />}
                            label="Client Uploads (drafts)"
                            sub={hasFinalised ? "Superseded by the finalised versions above" : undefined}
                            accent="slate"
                            count={draftDocs.length}
                            muted
                        >
                            {draftDocs.map(doc => (
                                <DocRow key={doc.id} doc={doc} onView={onView} muted />
                            ))}
                        </Section>
                    )}
                </div>
            )}
        </div>
    )
}

interface SectionProps {
    icon: React.ReactNode
    label: string
    sub?: string
    accent: "emerald" | "sky" | "slate"
    count: number
    muted?: boolean
    children: React.ReactNode
}

function Section({ icon, label, sub, accent, count, muted, children }: SectionProps) {
    const accentClass = accent === "emerald"
        ? "text-emerald-400"
        : accent === "sky"
            ? "text-sky-400"
            : "text-slate-400"
    return (
        <div className={muted ? "opacity-70" : ""}>
            <div className="flex items-center gap-1.5 mb-2">
                {icon}
                <p className={`text-[10px] font-bold uppercase tracking-wider ${accentClass}`}>{label}</p>
                <span className="text-[10px] font-mono text-slate-600">({count})</span>
            </div>
            {sub && <p className="text-[10px] text-slate-500 mb-2 italic">{sub}</p>}
            <div className="space-y-2">{children}</div>
        </div>
    )
}

interface DocRowProps {
    doc: AllocationDoc
    onView: (doc: AllocationDoc) => void | Promise<void>
    muted?: boolean
}

function DocRow({ doc, onView, muted }: DocRowProps) {
    const label = documentLabel(doc.documentCode) || doc.type.replace("_", " ")
    const href = doc.metashipDownloadUrl || doc.url
    return (
        <div className={`flex items-center gap-3 p-3 rounded-xl border ${muted ? "border-slate-800 bg-slate-900/30" : "border-slate-800 bg-slate-900"}`}>
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                <FileText className="h-4 w-4 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium truncate" title={doc.originalName}>{doc.originalName}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-[10px] text-slate-500 font-mono uppercase">{label}</span>
                    {doc.metashipReference && (
                        <>
                            <span className="text-[10px] text-slate-700">·</span>
                            <span className="text-[10px] text-slate-500 font-mono">{doc.metashipReference}</span>
                        </>
                    )}
                    <span className="text-[10px] text-slate-700">·</span>
                    <span className={`text-[10px] font-bold uppercase ${doc.status === "APPROVED" ? "text-emerald-400" : doc.status === "REJECTED" ? "text-red-400" : "text-amber-400"}`}>
                        {doc.status}
                    </span>
                </div>
            </div>
            {href && (
                <div className="flex items-center gap-1.5 shrink-0">
                    <button
                        onClick={() => onView(doc)}
                        className="h-7 w-7 rounded-lg border border-slate-700 flex items-center justify-center text-slate-400 hover:text-brand-blue hover:border-brand-blue transition-colors"
                        title="View document"
                    >
                        <Eye className="h-3.5 w-3.5" />
                    </button>
                    <a
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        className="h-7 w-7 rounded-lg border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
                        title="Download document"
                    >
                        <Download className="h-3.5 w-3.5" />
                    </a>
                </div>
            )}
        </div>
    )
}
