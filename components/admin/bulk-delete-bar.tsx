"use client"

import { useState } from "react"
import { Loader2, Trash2, X } from "lucide-react"
import { toast } from "sonner"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

interface BulkDeleteBarProps {
    /** How many rows are currently selected. Bar hides itself when 0. */
    count: number
    /** Singular label for the toast / dialog copy (e.g. "booking"). */
    resourceLabel: string
    /** Plural label (e.g. "bookings"). */
    resourceLabelPlural: string
    /** Endpoint that accepts { ids: string[] } and returns
     *  { deleted: string[], failed: Array<{id, reason}> } or
     *  { deleted: number, failed: number, reasons?: ... }. */
    endpoint: string
    /** The selected IDs. */
    ids: string[]
    /** Called after a successful delete so the parent can refetch + clear selection. */
    onDeleted: () => void
    /** Called when the user clicks the X to clear selection. */
    onClearSelection: () => void
}

/**
 * Floating bar that appears at the bottom of an admin list when one or more
 * rows are selected. Single primary action - delete - wired through an
 * AlertDialog confirm. Failure modes the endpoint reports come back via a
 * structured response so the toast can say "Deleted 12 of 14, 2 blocked".
 */
export function BulkDeleteBar({
    count,
    resourceLabel,
    resourceLabelPlural,
    endpoint,
    ids,
    onDeleted,
    onClearSelection,
}: BulkDeleteBarProps) {
    const [confirmOpen, setConfirmOpen] = useState(false)
    const [busy, setBusy] = useState(false)

    if (count === 0) return null

    const noun = count === 1 ? resourceLabel : resourceLabelPlural

    const handleConfirm = async () => {
        setBusy(true)
        try {
            const res = await fetch(endpoint, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ ids }),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
                toast.error(data.error || "Delete failed")
                return
            }
            const deleted = Array.isArray(data.deleted) ? data.deleted.length : Number(data.deleted ?? 0)
            const failed = Array.isArray(data.failed) ? data.failed : []
            const failedCount = failed.length

            if (deleted > 0 && failedCount === 0) {
                toast.success(`Deleted ${deleted} ${deleted === 1 ? resourceLabel : resourceLabelPlural}`)
            } else if (deleted > 0 && failedCount > 0) {
                const firstReason = failed[0]?.reason || "blocked"
                toast.warning(`Deleted ${deleted} of ${deleted + failedCount} - ${failedCount} blocked`, {
                    description: failedCount === 1 ? firstReason : `${firstReason} (+ ${failedCount - 1} more)`,
                })
            } else if (deleted === 0 && failedCount > 0) {
                const firstReason = failed[0]?.reason || "blocked"
                toast.error(`Nothing deleted - ${failedCount} blocked`, {
                    description: failedCount === 1 ? firstReason : `${firstReason} (+ ${failedCount - 1} more)`,
                })
            } else {
                toast.success("Done")
            }
            setConfirmOpen(false)
            onDeleted()
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Delete failed")
        } finally {
            setBusy(false)
        }
    }

    return (
        <>
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-slate-900 border border-slate-700 shadow-2xl rounded-2xl pl-4 pr-2 py-2">
                <button
                    onClick={onClearSelection}
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800"
                    aria-label="Clear selection"
                >
                    <X className="h-4 w-4" />
                </button>
                <span className="text-sm font-bold text-white">
                    {count} {noun} selected
                </span>
                <Button
                    size="sm"
                    onClick={() => setConfirmOpen(true)}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold"
                >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                    Delete selected
                </Button>
            </div>

            <AlertDialog open={confirmOpen} onOpenChange={(o) => !busy && setConfirmOpen(o)}>
                <AlertDialogContent className="bg-slate-950 border-slate-800 text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete {count} {noun}?</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-400">
                            This permanently removes {count === 1 ? "this" : "these"} {noun} and any
                            cascading data the single-row delete already covers (linked documents,
                            invoices, etc.). Rows with hard dependents (e.g. paid invoices) will be
                            skipped with a reason. This can&apos;t be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white" disabled={busy}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => { e.preventDefault(); handleConfirm() }}
                            disabled={busy}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            {busy && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                            Delete {count}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
