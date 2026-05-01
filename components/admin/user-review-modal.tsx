"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
    Building2, Hash, Globe2, MapPin, Receipt, FileText, ExternalLink, Mail, CheckCircle2, XCircle, MessageSquareWarning, Loader2, MailWarning, RefreshCw, Hourglass,
} from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

export interface VettingUser {
    id: string
    name: string
    email: string
    accountNumber: string | null
    companyName: string | null
    companyReg: string | null
    companyAddress: string | null
    companyCountry: string | null
    vatNumber: string | null
    vettingStatus: "EMAIL_PENDING" | "ONBOARDING_PENDING" | "PENDING_REVIEW" | "APPROVED" | "REJECTED"
    vettingRejectionReason: string | null
    vettingAdminNote: string | null
    emailVerified: boolean
    createdAt: string | Date
    updatedAt: string | Date
    documents: Array<{
        id: string
        type: "COMPANY_REG_CERT" | "PROOF_OF_ADDRESS" | "VAT_CERT" | "OTHER"
        originalName: string
        url: string
        uploadedAt: string | Date
        mimeType?: string | null
        sizeBytes?: number | null
    }>
}

interface UserReviewModalProps {
    user: VettingUser | null
    open: boolean
    onClose: () => void
    onActionComplete: () => void
}

const DOC_LABELS: Record<VettingUser["documents"][number]["type"], string> = {
    COMPANY_REG_CERT: "Company Registration",
    PROOF_OF_ADDRESS: "Proof of Address",
    VAT_CERT: "VAT Certificate",
    OTHER: "Other",
}

type Action = "approve" | "reject" | "request-changes" | "resend-verification" | null

export function UserReviewModal({ user, open, onClose, onActionComplete }: UserReviewModalProps) {
    const [pendingAction, setPendingAction] = useState<Action>(null)
    const [reasonInput, setReasonInput] = useState("")
    const [submitting, setSubmitting] = useState(false)

    if (!user) return null

    const reset = () => {
        setPendingAction(null)
        setReasonInput("")
        setSubmitting(false)
    }

    const closeAll = () => {
        reset()
        onClose()
    }

    const runAction = async () => {
        if (!user) return
        const action = pendingAction
        if (!action) return

        if ((action === "reject" || action === "request-changes") && !reasonInput.trim()) {
            toast.error(action === "reject" ? "Add a reason for rejection" : "Add a note for the client")
            return
        }

        setSubmitting(true)
        try {
            const url = `/api/admin/users/${user.id}/${action}`
            let body: Record<string, string> | undefined
            if (action === "reject") body = { reason: reasonInput.trim() }
            if (action === "request-changes") body = { note: reasonInput.trim() }

            const res = await fetch(url, {
                method: "PATCH",
                headers: body ? { "Content-Type": "application/json" } : undefined,
                body: body ? JSON.stringify(body) : undefined,
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
                toast.error(data.error || "Action failed")
                setSubmitting(false)
                return
            }

            const successCopy =
                action === "approve" ? "User approved — welcome notification sent" :
                action === "reject" ? "User rejected" :
                action === "resend-verification" ? "Verification email resent" :
                "Changes requested — user can edit & resubmit"
            toast.success(successCopy)
            onActionComplete()
            // resend-verification doesn't change state — leave modal open so admin can confirm
            if (action !== "resend-verification") closeAll()
            else setSubmitting(false)
        } catch {
            toast.error("Action failed")
            setSubmitting(false)
        }
    }

    const showReasonPrompt = pendingAction === "reject" || pendingAction === "request-changes"

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) closeAll() }}>
            <DialogContent className="bg-slate-950 border-slate-800 text-white sm:max-w-[680px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl font-black flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-brand-blue" />
                        Vetting Review
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                        {user.companyName || user.name} · <span className="font-mono text-[10px]">{user.id}</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 py-2">
                    {/* Status pill + contact line */}
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <StatusPill status={user.vettingStatus} />
                        <div className="text-xs text-slate-400 flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5" />
                            <a href={`mailto:${user.email}`} className="hover:text-white">{user.email}</a>
                            {user.emailVerified && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" aria-label="email verified" />}
                        </div>
                    </div>

                    {/* Existing rejection reason / admin note (history context) */}
                    {user.vettingStatus === "REJECTED" && user.vettingRejectionReason && (
                        <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-red-400 mb-1">Previous rejection</p>
                            <p className="text-sm text-red-200">{user.vettingRejectionReason}</p>
                        </div>
                    )}
                    {user.vettingAdminNote && (
                        <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400 mb-1">Admin note (visible to client)</p>
                            <p className="text-sm text-amber-200">{user.vettingAdminNote}</p>
                        </div>
                    )}

                    {/* Company info grid */}
                    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Company Information</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <InfoRow icon={Building2} label="Legal name" value={user.companyName} />
                            <InfoRow icon={Hash} label="Registration No." value={user.companyReg} />
                            <InfoRow icon={Globe2} label="Country" value={user.companyCountry} />
                            <InfoRow icon={Receipt} label="VAT Number" value={user.vatNumber || "—"} />
                            <InfoRow icon={MapPin} label="Physical address" value={user.companyAddress} className="sm:col-span-2" />
                        </div>
                    </div>

                    {/* Documents */}
                    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            Documents ({user.documents.length})
                        </p>
                        {user.documents.length === 0 ? (
                            <p className="text-xs text-slate-500 italic">No documents uploaded.</p>
                        ) : (
                            <div className="space-y-2">
                                {user.documents.map(doc => (
                                    <div
                                        key={doc.id}
                                        className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-950 border border-slate-800"
                                    >
                                        <div className="h-9 w-9 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                                            <FileText className="h-4 w-4 text-slate-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-brand-blue">
                                                {DOC_LABELS[doc.type]}
                                            </p>
                                            <p className="text-xs font-medium text-white truncate">{doc.originalName}</p>
                                        </div>
                                        <a
                                            href={doc.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="h-8 w-8 rounded-md border border-slate-700 flex items-center justify-center text-slate-400 hover:text-brand-blue hover:border-brand-blue"
                                            aria-label="Open"
                                        >
                                            <ExternalLink className="h-3.5 w-3.5" />
                                        </a>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Action prompts */}
                    {showReasonPrompt && (
                        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                            <p className="text-xs font-bold text-white">
                                {pendingAction === "reject" ? "Reason for rejection" : "What does the client need to fix?"}
                            </p>
                            <Textarea
                                value={reasonInput}
                                onChange={(e) => setReasonInput(e.target.value)}
                                placeholder={pendingAction === "reject"
                                    ? "e.g. Tax number on file does not match the registration"
                                    : "e.g. Proof of address is older than 3 months — please upload a recent utility bill"}
                                className="bg-slate-900 border-slate-700 text-white min-h-[88px]"
                            />
                            <p className="text-[10px] text-slate-500">
                                The client will see this {pendingAction === "reject" ? "as the rejection reason" : "as a yellow banner on the onboarding form"}.
                            </p>
                        </motion.div>
                    )}

                    {pendingAction === "resend-verification" && (
                        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 flex items-start gap-3">
                            <RefreshCw className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                            <div className="text-sm">
                                <p className="font-bold text-blue-200">Resend verification email?</p>
                                <p className="text-blue-200/70 mt-0.5">
                                    A fresh verification link will be emailed to <span className="font-mono text-blue-100">{user.email}</span>. The previous link stays valid until it expires.
                                </p>
                            </div>
                        </motion.div>
                    )}
                </div>

                {/* Status-specific informational cards (no actions) */}
                {pendingAction === null && user.vettingStatus === "EMAIL_PENDING" && (
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3">
                        <MailWarning className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                        <div className="text-sm">
                            <p className="font-bold text-amber-200">Hasn&apos;t verified email yet</p>
                            <p className="text-amber-200/70 mt-0.5">
                                The user signed up but hasn&apos;t clicked the link in their inbox. You can re-send the verification email below — it goes to <span className="font-mono text-amber-100">{user.email}</span>.
                            </p>
                        </div>
                    </div>
                )}
                {pendingAction === null && user.vettingStatus === "ONBOARDING_PENDING" && (
                    <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 flex items-start gap-3">
                        <Hourglass className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                        <div className="text-sm">
                            <p className="font-bold text-blue-200">Email verified — waiting on user</p>
                            <p className="text-blue-200/70 mt-0.5">
                                They&apos;ve confirmed their email but haven&apos;t completed the onboarding form yet. No admin action needed — the next step is on them.
                            </p>
                        </div>
                    </div>
                )}

                {/* Footer actions */}
                <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 pt-3 border-t border-slate-800 mt-2">
                    <Button variant="ghost" onClick={closeAll} className="text-slate-400 hover:text-white">Close</Button>

                    {pendingAction === null ? (
                        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
                            {/* EMAIL_PENDING — only the resend action is meaningful */}
                            {user.vettingStatus === "EMAIL_PENDING" && (
                                <Button
                                    onClick={() => setPendingAction("resend-verification")}
                                    className="bg-brand-blue hover:bg-brand-blue/90 text-white font-bold"
                                >
                                    <RefreshCw className="h-4 w-4 mr-1.5" /> Resend verification email
                                </Button>
                            )}

                            {/* PENDING_REVIEW — full action set */}
                            {user.vettingStatus === "PENDING_REVIEW" && (
                                <>
                                    <Button
                                        variant="outline"
                                        onClick={() => setPendingAction("request-changes")}
                                        className="border-amber-500/30 bg-amber-500/5 text-amber-300 hover:bg-amber-500/10 hover:text-amber-200"
                                    >
                                        <MessageSquareWarning className="h-4 w-4 mr-1.5" /> Request Changes
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => setPendingAction("reject")}
                                        className="border-red-500/30 bg-red-500/5 text-red-300 hover:bg-red-500/10 hover:text-red-200"
                                    >
                                        <XCircle className="h-4 w-4 mr-1.5" /> Reject
                                    </Button>
                                    <Button
                                        onClick={() => setPendingAction("approve")}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                                    >
                                        <CheckCircle2 className="h-4 w-4 mr-1.5" /> Approve
                                    </Button>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
                            <Button variant="ghost" onClick={() => { setPendingAction(null); setReasonInput("") }} className="text-slate-400 hover:text-white">
                                Back
                            </Button>
                            <Button
                                onClick={runAction}
                                disabled={submitting}
                                className={
                                    pendingAction === "approve" ? "bg-emerald-600 hover:bg-emerald-700 text-white font-bold" :
                                    pendingAction === "reject" ? "bg-red-600 hover:bg-red-700 text-white font-bold" :
                                    pendingAction === "resend-verification" ? "bg-brand-blue hover:bg-brand-blue/90 text-white font-bold" :
                                    "bg-amber-600 hover:bg-amber-700 text-white font-bold"
                                }
                            >
                                {submitting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null}
                                {pendingAction === "approve" && "Confirm approval"}
                                {pendingAction === "reject" && "Confirm rejection"}
                                {pendingAction === "request-changes" && "Send request"}
                                {pendingAction === "resend-verification" && "Send it now"}
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

/* ----------------------- helpers ----------------------- */

function InfoRow({ icon: Icon, label, value, className = "" }: { icon: typeof Building2; label: string; value: string | null; className?: string }) {
    return (
        <div className={`min-w-0 ${className}`}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Icon className="h-3 w-3 text-brand-blue" />
                {label}
            </p>
            <p className="text-sm text-white mt-0.5 break-words">{value || "—"}</p>
        </div>
    )
}

function StatusPill({ status }: { status: VettingUser["vettingStatus"] }) {
    const map: Record<VettingUser["vettingStatus"], { label: string; className: string }> = {
        EMAIL_PENDING: { label: "EMAIL PENDING", className: "bg-slate-500/15 text-slate-300 border-slate-500/30" },
        ONBOARDING_PENDING: { label: "ONBOARDING PENDING", className: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
        PENDING_REVIEW: { label: "PENDING REVIEW", className: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
        APPROVED: { label: "APPROVED", className: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
        REJECTED: { label: "REJECTED", className: "bg-red-500/15 text-red-300 border-red-500/30" },
    }
    const cfg = map[status]
    return <Badge className={`${cfg.className} text-[10px] uppercase tracking-widest font-black border`}>{cfg.label}</Badge>
}
