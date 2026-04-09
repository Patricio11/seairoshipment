"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Shield, Key, Smartphone, QrCode, CheckCircle2 } from "lucide-react"

export function SecuritySettings() {
    const [is2FAEnabled, setIs2FAEnabled] = useState(false)
    const [showQR, setShowQR] = useState(false)

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
                        Manage your password and encryption layers.
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

                <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 text-white relative overflow-hidden">
                    {/* Decorative mesh */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl -mr-32 -mt-32" />

                    <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
                        <div className="flex-1 space-y-4">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                                {is2FAEnabled ? "Active & Secure" : "Recommended"}
                            </div>
                            <h4 className="text-2xl font-black">
                                {is2FAEnabled ? "2FA is Enabled" : "Secure your account"}
                            </h4>
                            <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
                                {is2FAEnabled
                                    ? "Your account is protected with an extra layer of security. Nice work."
                                    : "Add an extra layer of security by requiring a code from your authenticator app."}
                            </p>

                            {!is2FAEnabled && !showQR && (
                                <Button
                                    onClick={() => setShowQR(true)}
                                    className="bg-white text-slate-900 hover:bg-slate-100 font-bold border-none"
                                >
                                    Enable 2FA
                                </Button>
                            )}

                            {/* Mock Code Input to "Verify" */}
                            {showQR && !is2FAEnabled && (
                                <div className="space-y-3">
                                    <div className="flex gap-2">
                                        {[1, 2, 3, 4, 5, 6].map(i => (
                                            <div key={i} className="h-10 w-8 rounded bg-white/10 border border-white/20" />
                                        ))}
                                    </div>
                                    <Button
                                        onClick={() => setIs2FAEnabled(true)}
                                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold w-full"
                                    >
                                        Verify Code
                                    </Button>
                                </div>
                            )}
                        </div>

                        <div className="bg-white p-4 rounded-xl shadow-2xl">
                            {is2FAEnabled ? (
                                <div className="h-32 w-32 flex items-center justify-center text-emerald-500">
                                    <CheckCircle2 className="h-16 w-16" />
                                </div>
                            ) : (
                                <div className="h-32 w-32 bg-slate-900 flex items-center justify-center relative">
                                    <QrCode className="h-24 w-24 text-white opacity-90" />
                                    {/* Scan Line Animation */}
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
            </div>
        </motion.div>
    )
}
