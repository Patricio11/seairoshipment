"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { QRCodeSVG } from "qrcode.react"
import { Copy, Check, Loader2, Download, ShieldCheck, KeyRound, ScanLine, FileText, AlertCircle, LogOut } from "lucide-react"
import { toast } from "sonner"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { authClient } from "@/lib/auth/client"
import { logAuthEvent } from "@/lib/auth/events"

interface TwoFactorEnableWizardProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onEnabled?: () => void
    /**
     * When true, the wizard cannot be dismissed without finishing - used by the
     * admin forced-enrollment flow in Phase D. The close (X) button is hidden
     * and clicking outside / pressing Esc is suppressed.
     */
    forceEnroll?: boolean
    /**
     * Where to send the user after they click Done on the backup-codes step.
     * Only used when `forceEnroll` is true - in the regular Settings flow the
     * wizard just closes and the underlying page stays put. Defaults to
     * "/admin" because the only producer of forced enrollment today is the
     * admin layout gate.
     */
    forceEnrollRedirectTo?: string
}

type Step = "password" | "scan" | "verify" | "codes"

/**
 * Extracts the base32 `secret=` query param out of an otpauth:// URI so we can
 * show it under the QR for users whose authenticator app doesn't scan QRs.
 */
function secretFromOtpUri(uri: string): string {
    try {
        const u = new URL(uri)
        return u.searchParams.get("secret") || ""
    } catch {
        return ""
    }
}

function chunkSecret(secret: string): string {
    return secret.replace(/(.{4})/g, "$1 ").trim()
}

export function TwoFactorEnableWizard({ open, onOpenChange, onEnabled, forceEnroll = false, forceEnrollRedirectTo = "/admin" }: TwoFactorEnableWizardProps) {
    const router = useRouter()
    const [step, setStep] = useState<Step>("password")
    const [password, setPassword] = useState("")
    const [code, setCode] = useState("")
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [totpUri, setTotpUri] = useState<string>("")
    const [backupCodes, setBackupCodes] = useState<string[]>([])
    const [savedConfirmed, setSavedConfirmed] = useState(false)
    const [copiedSecret, setCopiedSecret] = useState(false)
    const [copiedCodes, setCopiedCodes] = useState(false)

    const secret = useMemo(() => secretFromOtpUri(totpUri), [totpUri])

    const resetAll = () => {
        setStep("password")
        setPassword("")
        setCode("")
        setBusy(false)
        setError(null)
        setTotpUri("")
        setBackupCodes([])
        setSavedConfirmed(false)
        setCopiedSecret(false)
        setCopiedCodes(false)
    }

    useEffect(() => {
        if (!open) {
            // Wipe state on close so a re-open starts clean
            const t = setTimeout(resetAll, 200)
            return () => clearTimeout(t)
        }
    }, [open])

    const handleOpenChange = (next: boolean) => {
        if (!next && forceEnroll && step !== "codes") {
            // Admin forced flow: only allow closing after the codes step.
            return
        }
        onOpenChange(next)
    }

    // Step 1 - password gate → calls /two-factor/enable which returns totpURI + backupCodes
    const handlePassword = async () => {
        setError(null)
        if (!password) { setError("Enter your password"); return }
        setBusy(true)
        try {
            const res = await authClient.twoFactor.enable({ password })
            if (res.error) {
                setError(res.error.message || "Could not start enrollment")
                return
            }
            const data = res.data as { totpURI?: string; backupCodes?: string[] } | null
            if (!data?.totpURI) {
                setError("No setup details returned - try again")
                return
            }
            setTotpUri(data.totpURI)
            setBackupCodes(data.backupCodes || [])
            setStep("scan")
        } catch (e) {
            setError(e instanceof Error ? e.message : "Something went wrong")
        } finally {
            setBusy(false)
        }
    }

    // Step 3 - verify the 6-digit code → flips twoFactorEnabled = true server-side
    const handleVerify = async () => {
        setError(null)
        if (!/^\d{6}$/.test(code)) { setError("Enter the 6-digit code from your app"); return }
        setBusy(true)
        try {
            const res = await authClient.twoFactor.verifyTotp({ code })
            if (res.error) {
                setError(res.error.message || "Code did not match - try the latest code")
                return
            }
            // Fire the audit + confirmation-email side-effect. Don't await -
            // the user's flow is done, this is housekeeping.
            void logAuthEvent("TWO_FACTOR_ENABLED")
            toast.success("Two-factor authentication enabled")
            setStep("codes")
        } catch (e) {
            setError(e instanceof Error ? e.message : "Verification failed")
        } finally {
            setBusy(false)
        }
    }

    const copySecret = async () => {
        await navigator.clipboard.writeText(secret)
        setCopiedSecret(true)
        setTimeout(() => setCopiedSecret(false), 1500)
    }

    const copyAllCodes = async () => {
        await navigator.clipboard.writeText(backupCodes.join("\n"))
        setCopiedCodes(true)
        toast.success("Backup codes copied")
        setTimeout(() => setCopiedCodes(false), 1500)
    }

    const downloadCodes = () => {
        const blob = new Blob(
            [
                `Seairo Cargo - Two-Factor Backup Codes\n`,
                `Generated: ${new Date().toISOString()}\n\n`,
                `Each code can be used once. Treat them like passwords.\n\n`,
                ...backupCodes.map((c, i) => `${String(i + 1).padStart(2, "0")}.  ${c}\n`),
            ],
            { type: "text/plain" }
        )
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `seairo-2fa-backup-codes-${new Date().toISOString().slice(0, 10)}.txt`
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
    }

    const handleFinish = () => {
        if (!savedConfirmed) return
        onEnabled?.()
        onOpenChange(false)
        if (forceEnroll) {
            // Forced flow: navigate to the producer's chosen destination
            // (admin layout uses /admin; could widen to other gates later).
            // `replace` so back-button doesn't return to /auth/setup-2fa,
            // and no explicit refresh - the destination's server layout
            // runs a fresh DB check on its own GET.
            router.replace(forceEnrollRedirectTo)
        }
    }

    const handleSignOut = async () => {
        try {
            await authClient.signOut()
        } finally {
            router.push("/")
            router.refresh()
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent
                showCloseButton={!(forceEnroll && step !== "codes")}
                className="sm:max-w-lg"
                onInteractOutside={(e) => {
                    if (forceEnroll && step !== "codes") e.preventDefault()
                }}
                onEscapeKeyDown={(e) => {
                    if (forceEnroll && step !== "codes") e.preventDefault()
                }}
            >
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-emerald-500" />
                        Enable two-factor authentication
                    </DialogTitle>
                    <DialogDescription>
                        Step {{ password: 1, scan: 2, verify: 3, codes: 4 }[step]} of 4
                        {forceEnroll && step !== "codes" && " - required for admin accounts"}
                    </DialogDescription>
                </DialogHeader>

                {forceEnroll && step !== "codes" && (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300 flex flex-col gap-2">
                        <div className="flex gap-2">
                            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                            <span>Two-factor authentication is required for admin accounts. Complete the steps to continue.</span>
                        </div>
                        <button
                            type="button"
                            onClick={handleSignOut}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold underline-offset-2 hover:underline self-start ml-6"
                        >
                            <LogOut className="h-3 w-3" />
                            Sign out instead
                        </button>
                    </div>
                )}

                {step === "password" && (
                    <div className="space-y-4">
                        <div className="flex items-start gap-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
                            <KeyRound className="h-5 w-5 text-slate-500 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                Confirm your password before we generate your authenticator secret. This stops anyone with access to your unlocked session from locking you out.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="tf-pw">Current password</Label>
                            <Input
                                id="tf-pw"
                                type="password"
                                value={password}
                                onChange={(e) => { setPassword(e.target.value); setError(null) }}
                                onKeyDown={(e) => { if (e.key === "Enter") handlePassword() }}
                                autoFocus
                            />
                        </div>
                        {error && <p className="text-sm text-red-500">{error}</p>}
                        <DialogFooter>
                            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy || forceEnroll}>Cancel</Button>
                            <Button onClick={handlePassword} disabled={busy || !password}>
                                {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Continue
                            </Button>
                        </DialogFooter>
                    </div>
                )}

                {step === "scan" && (
                    <div className="space-y-4">
                        <div className="flex items-start gap-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
                            <ScanLine className="h-5 w-5 text-slate-500 flex-shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    Scan this QR with an authenticator app - 1Password, Google Authenticator, Authy, or Microsoft Authenticator all work.
                                </p>
                                <p className="text-xs text-slate-500">Can&apos;t scan? Use the setup key below instead.</p>
                            </div>
                        </div>
                        <div className="flex flex-col items-center gap-4 py-2">
                            <div className="bg-white p-4 rounded-2xl border border-slate-200">
                                {totpUri && (
                                    <QRCodeSVG value={totpUri} size={192} bgColor="#ffffff" fgColor="#0f172a" level="M" />
                                )}
                            </div>
                            {secret && (
                                <div className="w-full">
                                    <Label className="text-xs uppercase tracking-wider text-slate-500">Setup key</Label>
                                    <div className="flex items-center gap-2 mt-1">
                                        <code className="flex-1 px-3 py-2 rounded-md bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-sm tracking-wider break-all">
                                            {chunkSecret(secret)}
                                        </code>
                                        <Button variant="outline" size="sm" onClick={copySecret} className="flex-shrink-0">
                                            {copiedSecret ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setStep("password")}>Back</Button>
                            <Button onClick={() => setStep("verify")}>I&apos;ve added the account</Button>
                        </DialogFooter>
                    </div>
                )}

                {step === "verify" && (
                    <div className="space-y-4">
                        <div className="flex items-start gap-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
                            <ShieldCheck className="h-5 w-5 text-slate-500 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                Enter the current 6-digit code from your authenticator app to confirm it&apos;s set up correctly.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="tf-code">Verification code</Label>
                            <Input
                                id="tf-code"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                pattern="\d{6}"
                                maxLength={6}
                                value={code}
                                onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(null) }}
                                onKeyDown={(e) => { if (e.key === "Enter") handleVerify() }}
                                className="text-center text-2xl tracking-[0.5em] font-mono"
                                autoFocus
                            />
                        </div>
                        {error && <p className="text-sm text-red-500">{error}</p>}
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setStep("scan")}>Back</Button>
                            <Button onClick={handleVerify} disabled={busy || code.length !== 6}>
                                {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Verify & enable
                            </Button>
                        </DialogFooter>
                    </div>
                )}

                {step === "codes" && (
                    <div className="space-y-4">
                        <div className="flex items-start gap-3 rounded-lg bg-amber-500/10 border border-amber-500/30 px-4 py-3 text-amber-700 dark:text-amber-300">
                            <FileText className="h-5 w-5 flex-shrink-0 mt-0.5" />
                            <div className="space-y-1 text-sm">
                                <p className="font-semibold">Save your backup codes now</p>
                                <p>These are the only way to sign in if you lose access to your authenticator app. Each code works once. You won&apos;t see them again.</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-sm">
                            {backupCodes.map((c, i) => (
                                <div key={c} className="flex items-center gap-2">
                                    <span className="text-slate-400 select-none w-5 text-right">{i + 1}.</span>
                                    <span className="tracking-wider">{c}</span>
                                </div>
                            ))}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button variant="outline" onClick={downloadCodes} className="flex-1">
                                <Download className="h-4 w-4 mr-2" /> Download .txt
                            </Button>
                            <Button variant="outline" onClick={copyAllCodes} className="flex-1">
                                {copiedCodes ? <Check className="h-4 w-4 mr-2 text-emerald-500" /> : <Copy className="h-4 w-4 mr-2" />}
                                Copy all
                            </Button>
                        </div>
                        <label className="flex items-start gap-3 cursor-pointer rounded-lg border border-slate-200 dark:border-slate-800 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                            <Checkbox
                                checked={savedConfirmed}
                                onCheckedChange={(v) => setSavedConfirmed(v === true)}
                                className="mt-0.5"
                            />
                            <span className="text-sm text-slate-700 dark:text-slate-300">
                                I&apos;ve saved these codes somewhere safe.
                            </span>
                        </label>
                        <DialogFooter>
                            <Button onClick={handleFinish} disabled={!savedConfirmed}>
                                Done
                            </Button>
                        </DialogFooter>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
