import { redirect } from "next/navigation"
import { Ship } from "lucide-react"
import { getSession } from "@/lib/auth/server"
import { db } from "@/lib/db"
import { user } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { OnboardingForm } from "@/components/auth/onboarding-form"
import { EmailPendingScreen, PendingReviewScreen, ApprovedScreen, RejectedScreen } from "@/components/auth/onboarding-status-screens"

export const dynamic = "force-dynamic"

export default async function OnboardingPage() {
    const session = await getSession()
    if (!session) redirect("/")

    // Admins skip this flow entirely
    if ((session.user.role as string) === "admin") redirect("/admin")

    const [row] = await db.select().from(user).where(eq(user.id, session.user.id)).limit(1)
    if (!row) redirect("/")

    // Lazy bump: email verified but still EMAIL_PENDING → ONBOARDING_PENDING
    let status = row.vettingStatus
    if (status === "EMAIL_PENDING" && row.emailVerified) {
        await db
            .update(user)
            .set({ vettingStatus: "ONBOARDING_PENDING", updatedAt: new Date() })
            .where(eq(user.id, row.id))
        status = "ONBOARDING_PENDING"
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950">
            <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur">
                <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                        <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-brand-blue to-cyan-500 flex items-center justify-center shadow-md">
                            <Ship className="h-4 w-4 text-white" />
                        </div>
                        <span className="font-display text-base font-bold tracking-tight">Seairo</span>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Onboarding</span>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-6 py-10 sm:py-14">
                {status === "EMAIL_PENDING" && (
                    <EmailPendingScreen email={row.email} />
                )}

                {status === "ONBOARDING_PENDING" && (
                    <div className="space-y-6">
                        <div className="text-center space-y-1">
                            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                                Tell us about your company
                            </h1>
                            <p className="text-sm text-slate-500 max-w-xl mx-auto">
                                We verify every account before unlocking the dashboard. This usually takes less than a business day.
                            </p>
                        </div>
                        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 sm:p-8 shadow-sm">
                            <OnboardingForm
                                initial={{
                                    companyName: row.companyName ?? "",
                                    companyReg: row.companyReg ?? "",
                                    companyAddress: row.companyAddress ?? "",
                                    companyCountry: row.companyCountry ?? "",
                                    vatNumber: row.vatNumber ?? "",
                                }}
                                adminNote={row.vettingAdminNote}
                            />
                        </div>
                    </div>
                )}

                {status === "PENDING_REVIEW" && (
                    <PendingReviewScreen
                        companyName={row.companyName ?? ""}
                        submittedAt={row.updatedAt}
                    />
                )}

                {status === "APPROVED" && (
                    <ApprovedScreen accountNumber={row.accountNumber} />
                )}

                {status === "REJECTED" && (
                    <RejectedScreen reason={row.vettingRejectionReason} />
                )}
            </main>
        </div>
    )
}
