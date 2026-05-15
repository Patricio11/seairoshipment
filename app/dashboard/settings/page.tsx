"use client"

import { useEffect } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { SettingsShell } from "@/components/settings/settings-shell"
import { CompanyProfileForm } from "@/components/settings/company-profile-form"
import { NotificationPreferences } from "@/components/settings/notification-preferences"
import { SecuritySettings } from "@/components/settings/security-settings"

export default function SettingsPage() {
    const params = useSearchParams()
    const router = useRouter()
    const pathname = usePathname()

    // When the admin layout redirects with ?force=1, jump straight to the
    // Security tab and force the 2FA wizard open. This lets us keep the wizard
    // logic local to the component instead of routing the admin to a separate
    // page.
    const forceTwoFactor = params.get("force") === "1"
    const initialTab = forceTwoFactor ? "security" : undefined

    // Clean the `?force=1` param out of the URL after we've consumed it so a
    // refresh after enrollment doesn't get stuck re-opening the wizard.
    useEffect(() => {
        if (forceTwoFactor) {
            const t = setTimeout(() => router.replace(pathname), 100)
            return () => clearTimeout(t)
        }
    }, [forceTwoFactor, pathname, router])

    return (
        <SettingsShell initialTab={initialTab}>
            {(activeTab) => (
                <>
                    {activeTab === "profile" && <CompanyProfileForm />}
                    {activeTab === "notifications" && <NotificationPreferences />}
                    {activeTab === "security" && <SecuritySettings forceTwoFactorEnroll={forceTwoFactor} />}
                </>
            )}
        </SettingsShell>
    )
}
