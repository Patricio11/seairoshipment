"use client"

import { SettingsShell } from "@/components/settings/settings-shell"
import { CompanyProfileForm } from "@/components/settings/company-profile-form"
import { NotificationPreferences } from "@/components/settings/notification-preferences"
import { SecuritySettings } from "@/components/settings/security-settings"

export default function SettingsPage() {
    return (
        <SettingsShell>
            {(activeTab) => (
                <>
                    {activeTab === "profile" && <CompanyProfileForm />}
                    {activeTab === "notifications" && <NotificationPreferences />}
                    {activeTab === "security" && <SecuritySettings />}
                </>
            )}
        </SettingsShell>
    )
}
