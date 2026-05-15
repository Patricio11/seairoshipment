import { Suspense } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { TwoFactorForm } from "@/components/auth/two-factor-form"

/**
 * Two-factor challenge page. Reached automatically by the sign-in flow when
 * the user has 2FA enabled — Better Auth returns `twoFactorRedirect: true`
 * and the auth panel pushes the browser here. The session is held in the
 * `better-auth.two_factor` cookie until verifyTotp / verifyBackupCode succeeds.
 *
 * The page is intentionally minimal — no useSession, no auth-gating. If a
 * user lands here without a pending 2FA cookie, the verify call simply errors
 * and the form prompts them to start sign-in again.
 */
export default function TwoFactorPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-blue-950 px-4">
            <div className="w-full max-w-md">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-8 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to home
                </Link>
                <Suspense fallback={
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center">
                        <p className="text-slate-400">Loading...</p>
                    </div>
                }>
                    <TwoFactorForm />
                </Suspense>
            </div>
        </div>
    )
}
