'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Mail, Lock, User, Building2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface AuthPanelProps {
    isOpen: boolean
    onClose: () => void
    initialMode?: 'login' | 'signup'
}

export function AuthPanel({ isOpen, onClose, initialMode = 'login' }: AuthPanelProps) {
    const [isLogin, setIsLogin] = useState(initialMode === 'login')
    const router = useRouter()

    useEffect(() => {
        setIsLogin(initialMode === 'login')
    }, [initialMode, isOpen])

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                    />

                    {/* Slide-over Panel */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        className="fixed right-0 top-0 z-50 h-full w-full max-w-md"
                    >
                        <div className="h-full overflow-y-auto border-l border-white/10 bg-gradient-to-br from-slate-900/95 to-blue-950/95 backdrop-blur-2xl">
                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                className="absolute right-6 top-6 rounded-full p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                            >
                                <X className="h-6 w-6" />
                            </button>

                            <div className="flex min-h-full flex-col justify-center px-8 py-12">
                                {/* Header */}
                                <div className="mb-8">
                                    <h2 className="font-display text-4xl font-bold text-white">
                                        {isLogin ? 'Welcome Back' : 'Get Started'}
                                    </h2>
                                    <p className="mt-2 text-slate-400">
                                        {isLogin
                                            ? 'Sign in to access your logistics dashboard'
                                            : 'Create an account to start shipping'}
                                    </p>
                                </div>

                                {/* Form */}
                                <form
                                    className="space-y-6"
                                    onSubmit={(e) => {
                                        e.preventDefault()
                                        router.push('/dashboard')
                                        onClose()
                                    }}
                                >
                                    {!isLogin && (
                                        <>
                                            <div className="space-y-2">
                                                <label htmlFor="name" className="text-sm font-semibold text-slate-300">
                                                    Full Name
                                                </label>
                                                <div className="relative">
                                                    <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                                    <input
                                                        id="name"
                                                        type="text"
                                                        placeholder="John Smith"
                                                        className="w-full rounded-xl border border-white/10 bg-white/5 py-4 pl-12 pr-4 text-white placeholder-slate-500 backdrop-blur-xl transition-all focus:border-cyan-400/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label htmlFor="company" className="text-sm font-semibold text-slate-300">
                                                    Company Name
                                                </label>
                                                <div className="relative">
                                                    <Building2 className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                                    <input
                                                        id="company"
                                                        type="text"
                                                        placeholder="Acme Corp"
                                                        className="w-full rounded-xl border border-white/10 bg-white/5 py-4 pl-12 pr-4 text-white placeholder-slate-500 backdrop-blur-xl transition-all focus:border-cyan-400/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    )}

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
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label htmlFor="password" className="text-sm font-semibold text-slate-300">
                                            Password
                                        </label>
                                        <div className="relative">
                                            <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                            <input
                                                id="password"
                                                type="password"
                                                placeholder="••••••••"
                                                className="w-full rounded-xl border border-white/10 bg-white/5 py-4 pl-12 pr-4 text-white placeholder-slate-500 backdrop-blur-xl transition-all focus:border-cyan-400/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
                                            />
                                        </div>
                                    </div>

                                    {isLogin && (
                                        <div className="flex items-center justify-between text-sm">
                                            <label className="flex items-center gap-2 text-slate-400">
                                                <input type="checkbox" className="rounded border-white/10 bg-white/5 text-cyan-500 focus:ring-cyan-400/20" />
                                                Remember me
                                            </label>
                                            <a href="#" className="font-semibold text-cyan-400 hover:text-cyan-300">
                                                Forgot password?
                                            </a>
                                        </div>
                                    )}

                                    {/* Submit Button */}
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        type="submit"
                                        className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 py-4 font-display text-lg font-semibold text-white shadow-lg shadow-blue-500/50 transition-shadow hover:shadow-blue-500/75"
                                    >
                                        {isLogin ? 'Sign In' : 'Create Account'}
                                    </motion.button>
                                </form>

                                {/* Toggle */}
                                <div className="mt-8 text-center">
                                    <p className="text-slate-400">
                                        {isLogin ? "Don't have an account? " : 'Already have an account? '}
                                        <button
                                            onClick={() => setIsLogin(!isLogin)}
                                            className="font-semibold text-cyan-400 hover:text-cyan-300"
                                        >
                                            {isLogin ? 'Sign up' : 'Sign in'}
                                        </button>
                                    </p>
                                </div>

                                {/* Social Auth Removed */}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
