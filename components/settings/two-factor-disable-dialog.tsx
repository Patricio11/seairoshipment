"use client"

import { useEffect, useState } from "react"
import { Loader2, ShieldOff, AlertTriangle } from "lucide-react"
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
import { authClient } from "@/lib/auth/client"

interface TwoFactorDisableDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onDisabled?: () => void
}

export function TwoFactorDisableDialog({ open, onOpenChange, onDisabled }: TwoFactorDisableDialogProps) {
    const [password, setPassword] = useState("")
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!open) {
            const t = setTimeout(() => { setPassword(""); setError(null); setBusy(false) }, 200)
            return () => clearTimeout(t)
        }
    }, [open])

    const handleDisable = async () => {
        setError(null)
        if (!password) { setError("Enter your password"); return }
        setBusy(true)
        try {
            const res = await authClient.twoFactor.disable({ password })
            if (res.error) {
                setError(res.error.message || "Could not disable two-factor")
                return
            }
            toast.success("Two-factor authentication disabled")
            onDisabled?.()
            onOpenChange(false)
        } catch (e) {
            setError(e instanceof Error ? e.message : "Something went wrong")
        } finally {
            setBusy(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ShieldOff className="h-5 w-5 text-red-500" />
                        Disable two-factor authentication
                    </DialogTitle>
                    <DialogDescription>
                        Removes the authenticator secret and your backup codes. You can re-enable 2FA anytime from Settings.
                    </DialogDescription>
                </DialogHeader>

                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300 flex gap-2">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>Once disabled, sign-ins will only require your password. We&apos;ll email you confirming the change.</span>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="tf-disable-pw">Current password</Label>
                    <Input
                        id="tf-disable-pw"
                        type="password"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setError(null) }}
                        onKeyDown={(e) => { if (e.key === "Enter") handleDisable() }}
                        autoFocus
                    />
                </div>

                {error && <p className="text-sm text-red-500">{error}</p>}

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
                    <Button
                        onClick={handleDisable}
                        disabled={busy || !password}
                        className="bg-red-500 hover:bg-red-600 text-white"
                    >
                        {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Disable 2FA
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
