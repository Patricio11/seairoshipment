"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle } from "lucide-react"
import { useAuth } from "@/lib/auth/client"

export default function VerifiedPage() {
    const router = useRouter()
    const { isAuthenticated, user } = useAuth()

    useEffect(() => {
        if (isAuthenticated && user) {
            const timer = setTimeout(() => {
                if (user.role === "admin") {
                    router.push("/admin")
                } else {
                    router.push("/dashboard")
                }
            }, 3000)
            return () => clearTimeout(timer)
        }
    }, [isAuthenticated, user, router])

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-blue-950 px-4">
            <div className="w-full max-w-md">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center">
                    <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6">
                        <CheckCircle className="h-8 w-8 text-emerald-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-3">Email Verified!</h1>
                    <p className="text-slate-400 mb-6">
                        Your email has been verified successfully. {isAuthenticated ? "Redirecting you to your dashboard..." : "You can now sign in to your account."}
                    </p>
                    {!isAuthenticated && (
                        <button
                            onClick={() => router.push("/")}
                            className="inline-block rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-3 font-semibold text-white"
                        >
                            Go to Sign In
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
