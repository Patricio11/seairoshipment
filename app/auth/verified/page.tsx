import { redirect } from "next/navigation"
import Link from "next/link"
import { CheckCircle, AlertTriangle } from "lucide-react"
import { getSession } from "@/lib/auth/server"
import { ResendVerificationButton } from "@/components/auth/resend-verification-button"

export const dynamic = "force-dynamic"

/**
 * Landing page after Better Auth verifies the email and auto-signs the user in.
 *
 * Three branches in order:
 *  1. Verification token came back with `?error=...` - surface it with a
 *     resend CTA so the user can request a fresh link. Without this, a stale
 *     or already-used token silently lands here and the user sees a "looks
 *     fine" message that isn't.
 *  2. Session exists - verification succeeded, route to the user's home.
 *  3. No session, no error - extremely rare given autoSignInAfterVerification,
 *     show a manual sign-in CTA.
 */
export default async function VerifiedPage({
    searchParams,
}: {
    searchParams: Promise<{ error?: string; email?: string }>
}) {
    const { error, email } = await searchParams

    if (error) {
        // Better Auth uses error codes like INVALID_TOKEN, EXPIRED_TOKEN, etc.
        // Map them to a friendly sentence; fall back to the raw code so the
        // user can still tell support what they saw.
        const friendly =
            error === "EXPIRED_TOKEN" || error === "TOKEN_EXPIRED"
                ? "This verification link has expired."
                : error === "INVALID_TOKEN" || error === "USED_TOKEN"
                    ? "This verification link is no longer valid - it may have been used already."
                    : `Verification failed (${error}).`
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-blue-950 px-4">
                <div className="w-full max-w-md">
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center">
                        <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mb-6">
                            <AlertTriangle className="h-8 w-8 text-amber-400" />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-3">Verification link issue</h1>
                        <p className="text-slate-400 mb-6">{friendly}</p>
                        {email ? (
                            <ResendVerificationButton email={email} />
                        ) : (
                            <Link
                                href="/"
                                className="inline-block rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-3 font-semibold text-white"
                            >
                                Back to sign in
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    const session = await getSession()

    if (session) {
        const role = (session.user.role as string) || "client"
        if (role === "admin") {
            redirect("/admin")
        }
        // Clients land on onboarding - it figures out the right sub-view
        // (form / pending review / approved auto-redirect / rejected).
        redirect("/auth/onboarding")
    }

    // No session - extremely rare given autoSignInAfterVerification=true,
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
