"use client"

import { useEffect, useState } from "react"
import { Loader2, RefreshCw, Copy, Check, Download, FileText, KeyRound } from "lucide-react"
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

interface TwoFactorBackupCodesDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

type Phase = "password" | "codes"

export function TwoFactorBackupCodesDialog({ open, onOpenChange }: TwoFactorBackupCodesDialogProps) {
    const [phase, setPhase] = useState<Phase>("password")
    const [password, setPassword] = useState("")
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [codes, setCodes] = useState<string[]>([])
    const [savedConfirmed, setSavedConfirmed] = useState(false)
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        if (!open) {
            const t = setTimeout(() => {
                setPhase("password")
                setPassword("")
                setError(null)
                setBusy(false)
                setCodes([])
                setSavedConfirmed(false)
                setCopied(false)
            }, 200)
            return () => clearTimeout(t)
        }
    }, [open])

    const handleRegenerate = async () => {
        setError(null)
        if (!password) { setError("Enter your password"); return }
        setBusy(true)
        try {
            const res = await authClient.twoFactor.generateBackupCodes({ password })
            if (res.error) {
                setError(res.error.message || "Could not regenerate codes")
                return
            }
            const data = res.data as { backupCodes?: string[] } | null
            setCodes(data?.backupCodes || [])
            setPhase("codes")
            void logAuthEvent("TWO_FACTOR_BACKUP_CODES_REGENERATED")
            toast.success("New backup codes generated — old codes are no longer valid")
        } catch (e) {
            setError(e instanceof Error ? e.message : "Something went wrong")
        } finally {
            setBusy(false)
        }
    }

    const copyAll = async () => {
        await navigator.clipboard.writeText(codes.join("\n"))
        setCopied(true)
        toast.success("Backup codes copied")
        setTimeout(() => setCopied(false), 1500)
    }

    const download = () => {
        const blob = new Blob(
            [
                `Seairo Cargo — Two-Factor Backup Codes\n`,
                `Generated: ${new Date().toISOString()}\n\n`,
                `Each code can be used once. Treat them like passwords.\n\n`,
                ...codes.map((c, i) => `${String(i + 1).padStart(2, "0")}.  ${c}\n`),
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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <RefreshCw className="h-5 w-5 text-blue-500" />
                        Regenerate backup codes
                    </DialogTitle>
                    <DialogDescription>
                        {phase === "password"
                            ? "Generates 10 fresh single-use codes. Your previous codes will stop working immediately."
                            : "Your new backup codes — save them now. You won't see them again."}
                    </DialogDescription>
                </DialogHeader>

                {phase === "password" && (
                    <>
                        <div className="flex items-start gap-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
                            <KeyRound className="h-5 w-5 text-slate-500 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                Confirm your password before we issue new codes. This protects you if someone else has access to your unlocked session.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="tf-regen-pw">Current password</Label>
                            <Input
                                id="tf-regen-pw"
                                type="password"
                                value={password}
                                onChange={(e) => { setPassword(e.target.value); setError(null) }}
                                onKeyDown={(e) => { if (e.key === "Enter") handleRegenerate() }}
                                autoFocus
                            />
                        </div>
                        {error && <p className="text-sm text-red-500">{error}</p>}
                        <DialogFooter>
                            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
                            <Button onClick={handleRegenerate} disabled={busy || !password}>
                                {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Generate new codes
                            </Button>
                        </DialogFooter>
                    </>
                )}

                {phase === "codes" && (
                    <>
                        <div className="flex items-start gap-3 rounded-lg bg-amber-500/10 border border-amber-500/30 px-4 py-3 text-amber-700 dark:text-amber-300">
                            <FileText className="h-5 w-5 flex-shrink-0 mt-0.5" />
                            <div className="space-y-1 text-sm">
                                <p className="font-semibold">Save these codes now</p>
                                <p>Your old codes are no longer valid. Each new code works once.</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-sm">
                            {codes.map((c, i) => (
                                <div key={c} className="flex items-center gap-2">
                                    <span className="text-slate-400 select-none w-5 text-right">{i + 1}.</span>
                                    <span className="tracking-wider">{c}</span>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={download} className="flex-1">
                                <Download className="h-4 w-4 mr-2" /> Download .txt
                            </Button>
                            <Button variant="outline" onClick={copyAll} className="flex-1">
                                {copied ? <Check className="h-4 w-4 mr-2 text-emerald-500" /> : <Copy className="h-4 w-4 mr-2" />}
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
                            <Button
                                onClick={() => onOpenChange(false)}
                                disabled={!savedConfirmed}
                            >
                                Done
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    )
}
