"use client"

import { useState } from "react"
import { Shield } from "lucide-react"
import { TwoFactorEnableWizard } from "@/components/settings/two-factor-enable-wizard"

interface ForcedTwoFactorSetupProps {
    role: "admin" | "client"
}

/**
 * Full-page chrome for the forced-enrollment flow. The wizard itself lives
 * inside <TwoFactorEnableWizard forceEnroll />; this wrapper provides the
 * landing-page-style background and a brief explainer for context - without
 * it, the user would land on a blank page with just a dialog and no sense of
 * what's going on.
 *
 * The wizard's `forceEnroll` mode handles dismissal suppression, the sign-out
 * escape hatch in the banner, and the post-enrollment redirect to /admin
 * (set inside the wizard's handleFinish). Clients shouldn't ever land here
 * today - 2FA is only forced on admins - but we route them to /dashboard if
 * they somehow do, keeping the page safe to reuse if forcing widens later.
 */
export function ForcedTwoFactorSetup({ role }: ForcedTwoFactorSetupProps) {
    const [open, setOpen] = useState(true)

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-950 flex items-center justify-center px-4">
            <div className="max-w-md w-full text-center text-white space-y-6">
                <div className="mx-auto h-16 w-16 rounded-2xl bg-blue-500/20 flex items-center justify-center">
                    <Shield className="h-8 w-8 text-cyan-400" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold">Set up two-factor authentication</h1>
                    <p className="mt-2 text-slate-400">
                        {role === "admin"
                            ? "Two-factor authentication is required for admin accounts. Complete enrollment to access the admin area."
                            : "Set up an extra layer of security on your account before continuing."}
                    </p>
                </div>
            </div>

            <TwoFactorEnableWizard
                open={open}
                onOpenChange={setOpen}
                onEnabled={() => {
                    // No router.refresh here - the wizard's handleFinish will
                    // router.replace() onto /admin (or /dashboard), and that
                    // navigation runs the destination's server check fresh.
                    // Extra refreshes on /auth/setup-2fa would server-redirect
                    // *us* to /admin too, racing the wizard's own navigation
                    // and visibly hanging the dialog for ~1s in dev.
                }}
                forceEnroll
                forceEnrollRedirectTo={role === "admin" ? "/admin" : "/dashboard"}
            />
        </div>
    )
}
