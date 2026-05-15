"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Shield, Key, Smartphone } from "lucide-react"
import { TwoFactorStatusCard } from "./two-factor-status-card"

interface SecuritySettingsProps {
    /**
     * When true, forces the 2FA enable wizard open on mount and prevents the user
     * from dismissing it. Used by the admin forced-enrollment flow in Phase D
     * (`/dashboard/settings?force=1` redirect from the admin layout).
     */
    forceTwoFactorEnroll?: boolean
}

export function SecuritySettings({ forceTwoFactorEnroll = false }: SecuritySettingsProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8 max-w-2xl"
        >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Security & Access</h2>
                    <p className="text-sm text-slate-500 mt-1">
                        Manage your password and two-factor authentication.
                    </p>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-slate-800 flex items-center justify-center">
                    <Shield className="h-6 w-6 text-emerald-500" />
                </div>
            </div>

            {/* Password Change Section */}
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <Key className="h-5 w-5 text-slate-500" />
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white">Change Password</h3>
                </div>

                <div className="bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="currentPass">Current Password</Label>
                        <Input type="password" id="currentPass" className="bg-white dark:bg-slate-950" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="newPass">New Password</Label>
                            <Input type="password" id="newPass" className="bg-white dark:bg-slate-950" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmPass">Confirm New Password</Label>
                            <Input type="password" id="confirmPass" className="bg-white dark:bg-slate-950" />
                        </div>
                    </div>
                    <div className="pt-2 flex justify-end">
                        <Button variant="outline" className="font-bold">
                            Update Password
                        </Button>
                    </div>
                </div>
            </div>

            {/* 2FA Section */}
            <div className="space-y-6 pt-4">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <Smartphone className="h-5 w-5 text-slate-500" />
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white">Two-Factor Authentication</h3>
                </div>

                <TwoFactorStatusCard forceEnroll={forceTwoFactorEnroll} />
            </div>
        </motion.div>
    )
}
