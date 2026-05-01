"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { MailCheck, Clock, ShieldCheck, ShieldX, RefreshCw, Loader2, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

/* -------------------------------------------------------------------------- */
/* EMAIL_PENDING                                                               */
/* -------------------------------------------------------------------------- */

export function EmailPendingScreen({ email }: { email: string }) {
    const [resending, setResending] = useState(false)
    const [resentAt, setResentAt] = useState<number | null>(null)

    const handleResend = async () => {
        setResending(true)
        try {
            const res = await fetch("/api/auth/resend-verification", { method: "POST" })
            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                toast.error(data.error || "Couldn't resend — try again in a minute")
                return
            }
            setResentAt(Date.now())
            toast.success("Verification email sent")
        } catch {
            toast.error("Couldn't resend — try again in a minute")
        } finally {
            setResending(false)
        }
    }

    return (
        <StatusCard
            tone="blue"
            icon={MailCheck}
            title="Verify your email"
            sub="We sent a verification link to:"
        >
            <p className="text-sm font-mono font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 rounded-lg py-2 px-3 inline-block">
                {email}
            </p>
            <p className="text-xs text-slate-500 mt-4">
                Click the link in the email to continue. If you don&apos;t see it, check your spam folder.
            </p>
            <div className="flex items-center justify-center gap-3 mt-6">
                <Button
                    variant="outline"
                    onClick={handleResend}
                    disabled={resending}
                    className="text-xs h-9"
                >
                    {resending ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-2" />}
                    {resending ? "Sending…" : "Resend email"}
                </Button>
                {resentAt && (
                    <span className="text-xs text-emerald-500 font-medium flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Just sent
                    </span>
                )}
            </div>
        </StatusCard>
    )
}

/* -------------------------------------------------------------------------- */
/* PENDING_REVIEW                                                              */
/* -------------------------------------------------------------------------- */

export function PendingReviewScreen({ companyName, submittedAt }: { companyName: string; submittedAt?: Date | string }) {
    return (
        <StatusCard
            tone="amber"
            icon={Clock}
            title="Application under review"
            sub={`Thanks ${companyName ? `${companyName}` : ""} — our team is verifying your details.`}
        >
            <div className="space-y-3 text-left max-w-md mx-auto mt-2">
                <ChecklistItem checked label="Company information submitted" />
                <ChecklistItem checked label="Verification documents uploaded" />
                <ChecklistItem checked={false} label="Admin review (typically within 1 business day)" />
                <ChecklistItem checked={false} label="Welcome email + dashboard access" />
            </div>
            <div className="mt-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-left">
                <p className="text-xs text-slate-500">
                    We&apos;ll email you the moment your account is approved. You can close this tab — we&apos;ll let you know.
                </p>
                {submittedAt && (
                    <p className="text-[10px] text-slate-400 mt-2 font-mono">
                        Submitted {new Date(submittedAt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                )}
            </div>
        </StatusCard>
    )
}

/* -------------------------------------------------------------------------- */
/* APPROVED                                                                    */
/* -------------------------------------------------------------------------- */

export function ApprovedScreen({ accountNumber }: { accountNumber?: string | null }) {
    const router = useRouter()
    useEffect(() => {
        const t = setTimeout(() => router.replace("/dashboard"), 2500)
        return () => clearTimeout(t)
    }, [router])

    return (
        <StatusCard
            tone="emerald"
            icon={ShieldCheck}
            title="You're approved!"
            sub="Welcome to Seairo. Sending you to your dashboard…"
        >
            {accountNumber && (
                <div className="mt-4 inline-block">
                    <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Account Number</p>
                    <p className="text-base font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg py-2 px-4 border border-emerald-200 dark:border-emerald-900/30">
                        {accountNumber}
                    </p>
                </div>
            )}
            <div className="mt-6 flex justify-center">
                <Button onClick={() => router.replace("/dashboard")} className="bg-brand-blue hover:bg-brand-blue/90 text-white">
                    Go to dashboard
                </Button>
            </div>
        </StatusCard>
    )
}

/* -------------------------------------------------------------------------- */
/* REJECTED                                                                    */
/* -------------------------------------------------------------------------- */

export function RejectedScreen({ reason }: { reason?: string | null }) {
    return (
        <StatusCard
            tone="red"
            icon={ShieldX}
            title="Application not approved"
            sub="Our team reviewed your submission and were unable to approve it."
        >
            {reason && (
                <div className="mt-4 p-4 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 text-left">
                    <p className="text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400 mb-1">Reason</p>
                    <p className="text-sm text-red-900 dark:text-red-200">{reason}</p>
                </div>
            )}
            <p className="text-xs text-slate-500 mt-4">
                If you believe this was a mistake, please contact us at{" "}
                <a href="mailto:cat@seairocargo.co.za" className="font-bold text-brand-blue hover:underline">cat@seairocargo.co.za</a>.
            </p>
        </StatusCard>
    )
}

/* -------------------------------------------------------------------------- */
/* Shared card frame                                                           */
/* -------------------------------------------------------------------------- */

interface StatusCardProps {
    tone: "blue" | "emerald" | "amber" | "red"
    icon: typeof MailCheck
    title: string
    sub?: string
    children?: React.ReactNode
}

const TONE_BG: Record<StatusCardProps["tone"], string> = {
    blue: "from-brand-blue to-cyan-500",
    emerald: "from-emerald-500 to-teal-500",
    amber: "from-amber-500 to-orange-500",
    red: "from-red-500 to-rose-500",
}

function StatusCard({ tone, icon: Icon, title, sub, children }: StatusCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-center"
        >
            <div className={`inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${TONE_BG[tone]} shadow-lg shadow-black/10 mb-5`}>
                <Icon className="h-7 w-7 text-white" strokeWidth={2.5} />
            </div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">{title}</h2>
            {sub && <p className="text-sm text-slate-500 mt-1.5 max-w-md mx-auto">{sub}</p>}
            {children && <div className="mt-4">{children}</div>}
        </motion.div>
    )
}

function ChecklistItem({ checked, label }: { checked: boolean; label: string }) {
    return (
        <div className="flex items-center gap-3">
            <div className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${checked ? "bg-emerald-500 text-white" : "border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"}`}>
                {checked && <CheckCircle2 className="h-3 w-3" />}
            </div>
            <span className={`text-sm ${checked ? "text-slate-700 dark:text-slate-200 font-medium" : "text-slate-400"}`}>
                {label}
            </span>
        </div>
    )
}
