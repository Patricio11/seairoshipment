import { redirect } from "next/navigation"
import Link from "next/link"
import { CheckCircle } from "lucide-react"
import { getSession } from "@/lib/auth/server"

export const dynamic = "force-dynamic"

/**
 * Landing page after Better Auth verifies the email and auto-signs the user in.
 * Server-side: read the session immediately, route them to the right place
 * with no client-hydration flash. If the session is missing for any reason
 * (auto-sign-in disabled, cookie issue, etc.) we render a manual sign-in CTA.
 */
export default async function VerifiedPage() {
    const session = await getSession()

    if (session) {
        const role = (session.user.role as string) || "client"
        if (role === "admin") {
            redirect("/admin")
        }
        // Clients land on onboarding — it figures out the right sub-view
        // (form / pending review / approved auto-redirect / rejected).
        redirect("/auth/onboarding")
    }

    // No session — extremely rare given autoSignInAfterVerification=true,
    // but show a friendly fallback so the user has a clear next step.
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-blue-950 px-4">
            <div className="w-full max-w-md">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center">
                    <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6">
                        <CheckCircle className="h-8 w-8 text-emerald-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-3">Email verified!</h1>
                    <p className="text-slate-400 mb-6">
                        Your email is now verified. Sign in to continue with onboarding.
                    </p>
                    <Link
                        href="/"
                        className="inline-block rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-3 font-semibold text-white"
                    >
                        Go to sign in
                    </Link>
                </div>
            </div>
        </div>
    )
}
