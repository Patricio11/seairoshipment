"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ShieldCheck, KeyRound, ArrowRight, Loader2 } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { authClient } from "@/lib/auth/client"

type Mode = "totp" | "backup"

/**
 * Sanitises a `?next=` query param. We accept only same-origin paths starting
 * with "/" and reject "//foo" (protocol-relative URLs) and absolute URLs to
 * stop an open-redirect attack via the sign-in flow.
 */
function safeNext(next: string | null): string {
    if (!next) return "/dashboard"
    if (!next.startsWith("/")) return "/dashboard"
    if (next.startsWith("//")) return "/dashboard"
    return next
}

export function TwoFactorForm() {
    const router = useRouter()
    const params = useSearchParams()
    const next = safeNext(params.get("next"))

    const [mode, setMode] = useState<Mode>("totp")
    const [code, setCode] = useState("")
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const inputRef = useRef<HTMLInputElement | null>(null)

    useEffect(() => {
        // Focus on mount and when toggling modes so the user lands ready to type.
        inputRef.current?.focus()
    }, [mode])

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (mode === "totp") {
            if (!/^\d{6}$/.test(code)) { setError("Enter the 6-digit code from your authenticator app"); return }
        } else {
            if (code.trim().length < 4) { setError("Enter one of your backup codes"); return }
        }

        setBusy(true)
        try {
            const res = mode === "totp"
                ? await authClient.twoFactor.verifyTotp({ code })
                : await authClient.twoFactor.verifyBackupCode({ code: code.trim() })

            if (res.error) {
                setError(res.error.message || "That code didn't match — try the latest one")
                setCode("")
                return
            }

            toast.success("Signed in")
            router.push(next)
            router.refresh()
        } catch (e) {
            setError(e instanceof Error ? e.message : "Verification failed")
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-6">
                {mode === "totp"
                    ? <ShieldCheck className="h-7 w-7 text-cyan-400" />
                    : <KeyRound className="h-7 w-7 text-cyan-400" />}
            </div>

            <h1 className="text-2xl font-bold text-white text-center mb-2">
                {mode === "totp" ? "Two-step verification" : "Use a backup code"}
            </h1>
            <p className="text-slate-400 text-sm text-center mb-8">
                {mode === "totp"
                    ? "Enter the 6-digit code from your authenticator app to finish signing in."
                    : "Backup codes are single-use. Once you've used this one, regenerate the rest from Settings."}
            </p>

            <form onSubmit={onSubmit} className="space-y-5">
                <div className="space-y-2">
                    <label htmlFor="tf-code" className="text-sm font-semibold text-slate-300">
                        {mode === "totp" ? "Verification code" : "Backup code"}
                    </label>
                    <input
                        ref={inputRef}
                        id="tf-code"
                        name="code"
                        autoComplete="one-time-code"
                        inputMode={mode === "totp" ? "numeric" : "text"}
                        pattern={mode === "totp" ? "\\d{6}" : undefined}
                        maxLength={mode === "totp" ? 6 : 20}
                        placeholder={mode === "totp" ? "123 456" : "XXXX-XXXX"}
                        value={code}
                        onChange={(e) => {
                            const v = mode === "totp"
                                ? e.target.value.replace(/\D/g, "").slice(0, 6)
                                : e.target.value.slice(0, 20)
                            setCode(v)
                            setError(null)
                        }}
                        className="w-full rounded-xl border border-white/10 bg-white/5 py-4 px-4 text-center text-2xl tracking-[0.4em] font-mono text-white placeholder-slate-600 backdrop-blur-xl transition-all focus:border-cyan-400/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
                        required
                    />
                </div>

                {error && <p className="text-sm text-red-400 text-center">{error}</p>}

                <button
                    type="submit"
                    disabled={busy || !code}
                    className="w-full rounded-xl bg-brand-blue py-4 font-display text-lg font-semibold text-white shadow-lg shadow-brand-blue/50 transition-all hover:bg-brand-blue/90 hover:shadow-brand-blue/75 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                >
                    {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
                    {busy ? "Verifying..." : "Continue"}
                </button>
            </form>

            <div className="mt-6 flex flex-col gap-3 text-center text-sm">
                <button
                    type="button"
                    onClick={() => { setMode(mode === "totp" ? "backup" : "totp"); setCode(""); setError(null) }}
                    className="font-semibold text-cyan-400 hover:text-cyan-300"
                >
                    {mode === "totp" ? "Use a backup code instead" : "Use my authenticator app"}
                </button>
                <Link href="/" className="text-slate-400 hover:text-white">
                    Cancel and sign in again
                </Link>
            </div>
        </div>
    )
}
