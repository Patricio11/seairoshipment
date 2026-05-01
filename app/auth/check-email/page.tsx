"use client"

import { Suspense, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { MailCheck, RefreshCw, Loader2, CheckCircle2, AlertTriangle, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

/**
 * Public landing screen shown right after signup. The user has no session yet
 * (Better Auth's requireEmailVerification blocks signin until they verify).
 * Email is passed in via ?email=<...> so the resend button knows who to email.
 */
function CheckEmailScreenInner() {
    const params = useSearchParams()
    const email = params.get("email") ?? ""
    const [resending, setResending] = useState(false)
    const [resentAt, setResentAt] = useState<number | null>(null)

    const handleResend = async () => {
        if (!email) {
            toast.error("Missing email — go back and sign up again.")
            return
        }
        setResending(true)
        try {
            const res = await fetch("/api/auth/resend-verification", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
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
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950">
            <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur">
                <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <Image
                            src="/seairo-logo.png"
                            alt="Seairo Cargo — Shared Reefer Services"
                            width={120}
                            height={40}
                            className="h-9 w-auto object-contain"
                            priority
                        />
                    </Link>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Verify Email</span>
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-6 py-12 sm:py-20">
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="text-center"
                >
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-blue to-cyan-500 shadow-lg shadow-brand-blue/20 mb-5">
                        <MailCheck className="h-7 w-7 text-white" strokeWidth={2.5} />
                    </div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                        Check your inbox
                    </h1>
                    <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
                        We just sent a verification link to:
                    </p>
                    {email ? (
                        <p className="mt-3 inline-block text-sm font-mono font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 rounded-lg py-2 px-4">
                            {email}
                        </p>
                    ) : (
                        <p className="mt-3 inline-block text-sm font-mono italic text-slate-500 bg-slate-100 dark:bg-slate-800 rounded-lg py-2 px-4">
                            (your email)
                        </p>
                    )}
                </motion.div>

                {/* Spam / junk hint — the most important UX nudge here */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                    className="mt-8 rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/70 dark:bg-amber-900/10 p-5 flex items-start gap-3"
                >
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-sm">
                        <p className="font-bold text-amber-900 dark:text-amber-200">Don&apos;t see it after a minute?</p>
                        <p className="text-amber-800/80 dark:text-amber-200/80 mt-1">
                            Check your <strong>Spam</strong> or <strong>Junk</strong> folder — the first email from a new sender often lands there. Mark us as &quot;Not spam&quot; so future approvals and shipment updates land in your inbox.
                        </p>
                    </div>
                </motion.div>

                {/* Steps */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.15 }}
                    className="mt-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6"
                >
                    <p className="text-[10px] font-black uppercase tracking-widest text-brand-blue mb-3">What&apos;s next</p>
                    <ol className="space-y-3 text-sm text-slate-700 dark:text-slate-200">
                        <Step n={1} label="Click the verification link in the email we sent" />
                        <Step n={2} label="You'll be auto-signed-in and taken to a quick onboarding form" />
                        <Step n={3} label="Our team reviews your application — typically within one business day" />
                        <Step n={4} label="Once approved, your dashboard unlocks and you can book your first shipment" />
                    </ol>
                </motion.div>

                {/* Resend */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.2 }}
                    className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3"
                >
                    <Button
                        variant="outline"
                        onClick={handleResend}
                        disabled={resending}
                        className="text-xs h-10 px-4"
                    >
                        {resending ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-2" />}
                        {resending ? "Sending…" : "Resend verification email"}
                    </Button>
                    {resentAt && (
                        <span className="text-xs text-emerald-500 font-medium flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Sent — check your inbox again
                        </span>
                    )}
                </motion.div>

                <div className="mt-10 text-center">
                    <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand-blue">
                        <ArrowLeft className="h-3 w-3" />
                        Back to home
                    </Link>
                </div>
            </main>
        </div>
    )
}

function Step({ n, label }: { n: number; label: string }) {
    return (
        <li className="flex items-start gap-3">
            <span className="shrink-0 h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-brand-blue text-[11px] font-bold flex items-center justify-center mt-0.5">{n}</span>
            <span className="leading-relaxed">{label}</span>
        </li>
    )
}

export default function CheckEmailPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-50 dark:bg-slate-950" />}>
            <CheckEmailScreenInner />
        </Suspense>
    )
}
