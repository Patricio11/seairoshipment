"use client"

import { useState } from "react"
import { Loader2, RefreshCw, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"

/**
 * Tiny inline button used by /auth/verified when an error param comes back —
 * lets the user request a fresh verification email without typing their email
 * again. Mirrors the resend logic on /auth/check-email.
 */
export function ResendVerificationButton({ email }: { email: string }) {
    const [sending, setSending] = useState(false)
    const [sent, setSent] = useState(false)

    const handleResend = async () => {
        setSending(true)
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
            setSent(true)
            toast.success("New verification email sent")
        } catch {
            toast.error("Couldn't resend — try again in a minute")
        } finally {
            setSending(false)
        }
    }

    if (sent) {
        return (
            <div className="inline-flex items-center gap-2 text-sm text-emerald-400 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                Check your inbox for the new link
            </div>
        )
    }

    return (
        <button
            onClick={handleResend}
            disabled={sending}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-3 font-semibold text-white disabled:opacity-60"
        >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {sending ? "Sending…" : "Send a new verification email"}
        </button>
    )
}
