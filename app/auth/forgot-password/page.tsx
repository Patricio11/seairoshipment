"use client"

import { useState } from "react"
import { authClient } from "@/lib/auth/client"
import { Mail, ArrowLeft, CheckCircle } from "lucide-react"
import Link from "next/link"

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [isSent, setIsSent] = useState(false)
    const [error, setError] = useState("")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError("")

        try {
            await authClient.requestPasswordReset({
                email,
                redirectTo: "/auth/reset-password",
            })
            setIsSent(true)
        } catch {
            setError("Something went wrong. Please try again.")
        } finally {
            setIsLoading(false)
        }
    }

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

                {isSent ? (
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center">
                        <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6">
                            <CheckCircle className="h-8 w-8 text-emerald-400" />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-3">Check your email</h1>
                        <p className="text-slate-400 mb-6">
                            If an account exists for <span className="text-white font-medium">{email}</span>,
                            we&apos;ve sent a password reset link.
                        </p>
                        <p className="text-sm text-slate-500">
                            Didn&apos;t receive the email? Check your spam folder or{" "}
                            <button
                                onClick={() => setIsSent(false)}
                                className="text-cyan-400 hover:text-cyan-300 font-medium"
                            >
                                try again
                            </button>
                        </p>
                    </div>
                ) : (
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
                        <h1 className="text-2xl font-bold text-white mb-2">Forgot your password?</h1>
                        <p className="text-slate-400 mb-8">
                            Enter your email address and we&apos;ll send you a link to reset your password.
                        </p>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label htmlFor="email" className="text-sm font-semibold text-slate-300">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                    <input
                                        id="email"
                                        type="email"
                                        placeholder="you@company.com"
                                        className="w-full rounded-xl border border-white/10 bg-white/5 py-4 pl-12 pr-4 text-white placeholder-slate-500 backdrop-blur-xl transition-all focus:border-cyan-400/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            {error && (
                                <p className="text-sm text-red-400">{error}</p>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 py-4 font-semibold text-white shadow-lg shadow-blue-500/50 transition-shadow hover:shadow-blue-500/75 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? "Sending..." : "Send Reset Link"}
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    )
}
