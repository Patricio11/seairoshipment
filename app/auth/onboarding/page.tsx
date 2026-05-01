import { redirect } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { getSession } from "@/lib/auth/server"
import { db } from "@/lib/db"
import { user, onboardingRequirements } from "@/lib/db/schema"
import { eq, asc } from "drizzle-orm"
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

    // Active admin-managed requirements drive the form. Fetched server-side so
    // the form has them on first render — no loading flash.
    const requirements = status === "ONBOARDING_PENDING"
        ? await db
            .select()
            .from(onboardingRequirements)
            .where(eq(onboardingRequirements.active, true))
            .orderBy(asc(onboardingRequirements.sortOrder))
        : []

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950">
            <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur">
                <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <Image
                            src="/seairo-logo.png"
                            alt="Seairo Cargo — Shared Reefer Services"
                            width={120}
                            height={40}
                            className="h-9 w-auto object-contain"
                            priority
                        />
                    </Link>
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
                                requirements={requirements.map(r => ({
                                    id: r.id,
                                    name: r.name,
                                    description: r.description,
                                    templateUrl: r.templateUrl,
                                    templateOriginalName: r.templateOriginalName,
                                    templateMimeType: r.templateMimeType,
                                    templateSizeBytes: r.templateSizeBytes,
                                    required: r.required,
                                }))}
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
