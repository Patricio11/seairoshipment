"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Smartphone, CheckCircle2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth/client"
import { TwoFactorEnableWizard } from "./two-factor-enable-wizard"
import { TwoFactorDisableDialog } from "./two-factor-disable-dialog"
import { TwoFactorBackupCodesDialog } from "./two-factor-backup-codes-dialog"

interface TwoFactorStatusCardProps {
    forceEnroll?: boolean
}

export function TwoFactorStatusCard({ forceEnroll = false }: TwoFactorStatusCardProps) {
    const { data: session, isPending, refetch } = authClient.useSession()
    const enabled = Boolean((session?.user as { twoFactorEnabled?: boolean } | undefined)?.twoFactorEnabled)

    const [enableOpen, setEnableOpen] = useState(forceEnroll)
    const [disableOpen, setDisableOpen] = useState(false)
    const [backupOpen, setBackupOpen] = useState(false)

    const onAfterChange = () => refetch()

    if (isPending) {
        return (
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 text-white relative overflow-hidden min-h-[200px] flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
        )
    }

    return (
        <>
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl -mr-32 -mt-32" />

                <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start md:items-center">
                    <div className="flex-1 space-y-4">
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                            enabled
                                ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400"
                                : forceEnroll
                                    ? "bg-amber-500/20 border border-amber-500/30 text-amber-400"
                                    : "bg-slate-500/20 border border-slate-500/30 text-slate-300"
                        }`}>
                            {enabled ? "Active & Secure" : forceEnroll ? "Required for admins" : "Recommended"}
                        </div>

                        <h4 className="text-2xl font-black">
                            {enabled ? "Two-factor authentication is on" : "Secure your account"}
                        </h4>

                        <p className="text-slate-400 text-sm leading-relaxed max-w-md">
                            {enabled
                                ? "Sign-ins to your account require a 6-digit code from your authenticator app in addition to your password."
                                : "Add a code from an authenticator app (1Password, Google Authenticator, Authy, Microsoft Authenticator) as a second step after your password."}
                        </p>

                        <div className="flex flex-wrap gap-2 pt-2">
                            {!enabled && (
                                <Button
                                    onClick={() => setEnableOpen(true)}
                                    className="bg-white text-slate-900 hover:bg-slate-100 font-bold border-none"
                                >
                                    Enable 2FA
                                </Button>
                            )}
                            {enabled && (
                                <>
                                    <Button
                                        onClick={() => setBackupOpen(true)}
                                        variant="outline"
                                        className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white font-bold"
                                    >
                                        Regenerate backup codes
                                    </Button>
                                    <Button
                                        onClick={() => setDisableOpen(true)}
                                        variant="outline"
                                        className="bg-transparent border-red-500/40 text-red-400 hover:bg-red-500/10 hover:text-red-300 font-bold"
                                    >
                                        Disable
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl shadow-2xl">
                        {enabled ? (
                            <div className="h-32 w-32 flex items-center justify-center text-emerald-500">
                                <CheckCircle2 className="h-16 w-16" />
                            </div>
                        ) : (
                            <div className="h-32 w-32 bg-slate-900 flex items-center justify-center relative overflow-hidden rounded-xl">
                                <Smartphone className="h-16 w-16 text-white/90" />
                                <motion.div
                                    animate={{ top: ["10%", "90%", "10%"] }}
                                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                    className="absolute left-2 right-2 h-0.5 bg-brand-blue shadow-[0_0_10px_2px_rgba(0,154,222,0.5)]"
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <TwoFactorEnableWizard
                open={enableOpen}
                onOpenChange={setEnableOpen}
                onEnabled={onAfterChange}
                forceEnroll={forceEnroll}
            />
            <TwoFactorDisableDialog
                open={disableOpen}
                onOpenChange={setDisableOpen}
                onDisabled={onAfterChange}
            />
            <TwoFactorBackupCodesDialog
                open={backupOpen}
                onOpenChange={setBackupOpen}
            />
        </>
    )
}
