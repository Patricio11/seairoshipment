"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, ThumbsUp, PencilLine, Activity, Undo2, MessageSquareQuote } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
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

interface ShareAction {
    id: string
    shareToken: string
    calculationId: string
    action: "APPROVED" | "EDITED"
    guestName: string
    guestEmail: string
    note: string | null
    createdAt: string
}

interface ActivityPanelProps {
    calculationId: string | null
    /** Bumped by the parent (e.g. after Save) so the panel re-fetches. */
    refreshKey?: number
    /** Called after a successful revert so the parent can reload items + totals. */
    onReverted?: () => void
}

function formatWhen(iso: string): string {
    const date = new Date(iso)
    return date.toLocaleString("en-ZA", {
        day: "numeric", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    })
}

/**
 * Owner-side timeline of guest actions against this calc's share links.
 * Renders newest-first. Edit actions get a Revert affordance that restores
 * the items snapshot captured at the time of that edit.
 */
export function ActivityPanel({ calculationId, refreshKey, onReverted }: ActivityPanelProps) {
    const [actions, setActions] = useState<ShareAction[]>([])
    const [loading, setLoading] = useState(false)
    const [revertTarget, setRevertTarget] = useState<ShareAction | null>(null)
    const [reverting, setReverting] = useState(false)

    const load = useCallback(async () => {
        if (!calculationId) return
        setLoading(true)
        try {
            const res = await fetch(`/api/dashboard/cbm-calculations/${encodeURIComponent(calculationId)}/activity`, { cache: "no-store" })
            if (res.ok) {
                const data = await res.json()
                setActions(Array.isArray(data.actions) ? data.actions : [])
            }
        } catch { /* silent */ }
        finally { setLoading(false) }
    }, [calculationId])

    useEffect(() => { load() }, [load, refreshKey])

    const handleRevert = async () => {
        if (!revertTarget || !calculationId) return
        setReverting(true)
        try {
            const res = await fetch(`/api/dashboard/cbm-calculations/${encodeURIComponent(calculationId)}/revert`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ actionId: revertTarget.id }),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
                toast.error(data.error || "Couldn't revert")
                return
            }
            toast.success(`Reverted to before ${revertTarget.guestName}'s edit`)
            setRevertTarget(null)
            await load()
            onReverted?.()
        } catch {
            toast.error("Couldn't revert")
        } finally {
            setReverting(false)
        }
    }

    if (!calculationId) return null

    return (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                <Activity className="h-4 w-4 text-brand-blue" />
                <span className="text-xs font-bold uppercase tracking-wider">Activity</span>
                {actions.length > 0 && (
                    <span className="text-[10px] font-mono text-slate-500">({actions.length})</span>
                )}
            </div>

            {loading && actions.length === 0 ? (
                <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
                </div>
            ) : actions.length === 0 ? (
                <p className="text-xs text-slate-500 py-2 leading-relaxed">
                    No approvals or edits yet. When a share-link recipient approves the calculation or saves changes, you&apos;ll see it here.
                </p>
            ) : (
                <ul className="space-y-2.5">
                    {actions.map(a => {
                        const isApproval = a.action === "APPROVED"
                        return (
                            <li
                                key={a.id}
                                className={`rounded-lg border p-3 ${
                                    isApproval
                                        ? "border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-900/10"
                                        : "border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-900/10"
                                }`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
                                            {isApproval ? (
                                                <ThumbsUp className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                            ) : (
                                                <PencilLine className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                            )}
                                            <span className="truncate">{a.guestName}</span>
                                            <span className={`text-[10px] font-bold uppercase tracking-wider ${isApproval ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                                                {isApproval ? "approved" : "edited"}
                                            </span>
                                        </div>
                                        <div className="text-[10px] text-slate-500 mt-0.5">
                                            <a
                                                href={`mailto:${a.guestEmail}`}
                                                className="hover:underline truncate"
                                            >
                                                {a.guestEmail}
                                            </a>
                                            {" · "}
                                            {formatWhen(a.createdAt)}
                                        </div>
                                        {a.note && (
                                            <div className="mt-2 text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md p-2 flex items-start gap-1.5">
                                                <MessageSquareQuote className="h-3 w-3 text-slate-400 shrink-0 mt-0.5" />
                                                <span className="leading-snug whitespace-pre-wrap">{a.note}</span>
                                            </div>
                                        )}
                                    </div>
                                    {!isApproval && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setRevertTarget(a)}
                                            className="text-amber-700 hover:text-amber-900 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900/30 h-7 px-2 shrink-0"
                                        >
                                            <Undo2 className="h-3.5 w-3.5 mr-1" />
                                            <span className="text-[11px]">Revert</span>
                                        </Button>
                                    )}
                                </div>
                            </li>
                        )
                    })}
                </ul>
            )}

            <AlertDialog open={!!revertTarget} onOpenChange={(open) => !open && setRevertTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Revert this edit?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {revertTarget && (
                                <>
                                    This will restore the cargo items to how they were
                                    <strong> before {revertTarget.guestName} saved on {formatWhen(revertTarget.createdAt)}</strong>.
                                    Any later edits (yours or another guest&apos;s) stay in place - this only undoes this one entry.
                                </>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={reverting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => { e.preventDefault(); handleRevert() }}
                            disabled={reverting}
                            className="bg-amber-500 hover:bg-amber-600"
                        >
                            {reverting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Undo2 className="mr-2 h-4 w-4" />}
                            {reverting ? "Reverting…" : "Revert"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
