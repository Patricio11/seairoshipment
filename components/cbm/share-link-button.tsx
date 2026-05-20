"use client"

import { useState } from "react"
import { Share2, Loader2, Copy, Check, AlertCircle, Trash2, ThumbsUp, PencilLine } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

interface Share {
    token: string
    calculationId: string
    expiresAt: string | null
    revokedAt: string | null
    accessCount: number
    lastAccessedAt: string | null
    allowApprove: boolean
    allowEdit: boolean
    createdAt: string
}

interface ShareLinkButtonProps {
    calculationId: string
}

function shareUrl(token: string): string {
    if (typeof window === "undefined") return ""
    return `${window.location.origin}/share/cbm/${token}`
}

const EXPIRY_PRESETS: Array<{ label: string; days: number | null }> = [
    { label: "7 days", days: 7 },
    { label: "30 days", days: 30 },
    { label: "90 days", days: 90 },
    { label: "Never (revoke manually)", days: null },
]

export function ShareLinkButton({ calculationId }: ShareLinkButtonProps) {
    const [open, setOpen] = useState(false)
    const [shares, setShares] = useState<Share[]>([])
    const [loading, setLoading] = useState(false)
    const [creating, setCreating] = useState(false)
    const [expiryDays, setExpiryDays] = useState<string>("30")
    const [allowApprove, setAllowApprove] = useState(false)
    const [allowEdit, setAllowEdit] = useState(false)
    const [copiedToken, setCopiedToken] = useState<string | null>(null)

    const refresh = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/dashboard/cbm-calculations/${calculationId}/share`, { cache: "no-store" })
            if (res.ok) {
                const d = await res.json()
                setShares(Array.isArray(d.shares) ? d.shares : [])
            }
        } catch { /* ignore */ }
        finally { setLoading(false) }
    }

    const handleOpen = (next: boolean) => {
        setOpen(next)
        if (next) refresh()
    }

    const handleCreate = async () => {
        setCreating(true)
        try {
            const expiresInDays = expiryDays === "null" ? null : Number(expiryDays)
            const res = await fetch(`/api/dashboard/cbm-calculations/${calculationId}/share`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ expiresInDays, allowApprove, allowEdit }),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
                toast.error(data.error || "Couldn't create share link")
                return
            }
            toast.success("Share link created - copy from below")
            await refresh()
            // Auto-copy the new link to clipboard
            if (data.share?.token) {
                await navigator.clipboard.writeText(shareUrl(data.share.token)).catch(() => { })
                setCopiedToken(data.share.token)
                setTimeout(() => setCopiedToken(null), 2000)
            }
        } catch {
            toast.error("Couldn't create share link")
        } finally {
            setCreating(false)
        }
    }

    const handleCopy = async (token: string) => {
        try {
            await navigator.clipboard.writeText(shareUrl(token))
            setCopiedToken(token)
            toast.success("Link copied")
            setTimeout(() => setCopiedToken(null), 2000)
        } catch {
            toast.error("Couldn't copy to clipboard")
        }
    }

    const handleRevoke = async (token: string) => {
        if (!confirm("Revoke this link? Anyone with it will get a 'link revoked' message.")) return
        try {
            const res = await fetch(
                `/api/dashboard/cbm-calculations/${calculationId}/share?token=${encodeURIComponent(token)}`,
                { method: "DELETE" }
            )
            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                toast.error(data.error || "Couldn't revoke")
                return
            }
            toast.success("Revoked")
            await refresh()
        } catch {
            toast.error("Couldn't revoke")
        }
    }

    return (
        <>
            <Button variant="outline" onClick={() => handleOpen(true)} className="border-slate-200 dark:border-slate-800">
                <Share2 className="mr-2 h-4 w-4" />
                Share
            </Button>

            <Dialog open={open} onOpenChange={handleOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Share this calculation</DialogTitle>
                        <DialogDescription>
                            Read-only links. Recipients see your cargo dimensions and the 3D view - no name, email, or notes. Audit-trailed so you can see how often each link is opened.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-3">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Expires</p>
                                <Select value={expiryDays} onValueChange={setExpiryDays}>
                                    <SelectTrigger className="h-9">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {EXPIRY_PRESETS.map(p => (
                                            <SelectItem key={p.label} value={p.days === null ? "null" : String(p.days)}>
                                                {p.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Permission toggles - default off so the link stays
                                read-only unless the owner explicitly opens it up. */}
                            <div className="space-y-2 rounded-lg border border-slate-200 dark:border-slate-800 p-3 bg-slate-50 dark:bg-slate-900/40">
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <Switch checked={allowApprove} onCheckedChange={setAllowApprove} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 text-sm font-semibold">
                                            <ThumbsUp className="h-3.5 w-3.5 text-emerald-500" />
                                            Allow approve
                                        </div>
                                        <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                                            Adds an Approve button to the share page. Viewers enter their name + email and you get notified.
                                        </p>
                                    </div>
                                </label>
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <Switch checked={allowEdit} onCheckedChange={setAllowEdit} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 text-sm font-semibold">
                                            <PencilLine className="h-3.5 w-3.5 text-amber-500" />
                                            Allow edit
                                        </div>
                                        <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                                            Viewers can update cargo items. Every save is logged and you can revert from the activity timeline.
                                        </p>
                                    </div>
                                </label>
                            </div>

                            <Button onClick={handleCreate} disabled={creating} className="bg-brand-blue hover:bg-brand-blue/90 w-full">
                                {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Share2 className="mr-2 h-4 w-4" />}
                                Generate new link
                            </Button>
                        </div>

                        <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Active links</p>
                            {loading ? (
                                <div className="flex items-center gap-2 text-xs text-slate-500 py-3">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
                                </div>
                            ) : shares.length === 0 ? (
                                <p className="text-xs text-slate-500 py-3">No active links yet.</p>
                            ) : (
                                <ul className="space-y-2 max-h-[280px] overflow-y-auto">
                                    {shares.map(s => {
                                        const expired = s.expiresAt && new Date(s.expiresAt) < new Date()
                                        return (
                                            <li key={s.token} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-2.5">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <input
                                                        readOnly
                                                        value={shareUrl(s.token)}
                                                        className="flex-1 min-w-0 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-2 py-1 text-[11px] font-mono text-slate-700 dark:text-slate-300"
                                                        onClick={e => e.currentTarget.select()}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopy(s.token)}
                                                        className="h-7 w-7 rounded-md text-slate-500 hover:text-brand-blue hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center justify-center"
                                                        aria-label="Copy"
                                                    >
                                                        {copiedToken === s.token ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRevoke(s.token)}
                                                        className="h-7 w-7 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center justify-center"
                                                        aria-label="Revoke"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                                <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-500">
                                                    <span className="flex items-center gap-1.5 flex-wrap">
                                                        Created {new Date(s.createdAt).toLocaleDateString("en-ZA")}
                                                        {s.expiresAt && (
                                                            <>
                                                                {" "}· {expired
                                                                    ? <span className="text-red-500 font-bold">Expired</span>
                                                                    : <>expires {new Date(s.expiresAt).toLocaleDateString("en-ZA")}</>
                                                                }
                                                            </>
                                                        )}
                                                        {s.allowApprove && (
                                                            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 font-semibold">
                                                                <ThumbsUp className="h-2.5 w-2.5" /> approve
                                                            </span>
                                                        )}
                                                        {s.allowEdit && (
                                                            <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 font-semibold">
                                                                <PencilLine className="h-2.5 w-2.5" /> edit
                                                            </span>
                                                        )}
                                                    </span>
                                                    <span className="font-mono">
                                                        {s.accessCount} view{s.accessCount === 1 ? "" : "s"}
                                                    </span>
                                                </div>
                                                {expired && (
                                                    <p className="mt-1 text-[10px] text-amber-600 flex items-center gap-1">
                                                        <AlertCircle className="h-3 w-3" />
                                                        Expired - viewers get a "link expired" message.
                                                    </p>
                                                )}
                                            </li>
                                        )
                                    })}
                                </ul>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
