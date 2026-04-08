'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Mail, Lock, User, Building2, Eye, EyeOff } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { authClient } from "@/lib/auth/client"
import { toast } from "sonner"

interface AuthPanelProps {
    isOpen: boolean
    onClose: () => void
    initialMode?: 'login' | 'signup'
}

export function AuthPanel({ isOpen, onClose, initialMode = 'login' }: AuthPanelProps) {
    const [isLogin, setIsLogin] = useState(initialMode === 'login')
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        company: '',
        email: '',
        password: ''
    })

    const router = useRouter()

    useEffect(() => {
        setIsLogin(initialMode === 'login')
    }, [initialMode, isOpen])

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            if (isLogin) {
                await authClient.signIn.email({
                    email: formData.email,
                    password: formData.password
                }, {
                    onSuccess: async (ctx) => {
                        toast.success("Welcome back!", {
                            description: "You have been successfully signed in."
                        });

                        // Redirect based on role
                        const userRole = ctx.data.user.role;
                        if (userRole === 'admin') {
                            router.push('/admin');
                        } else {
                            router.push('/dashboard');
                        }
                        onClose();
                    },
                    onError: (ctx) => {
                        toast.error("Sign in failed", {
                            description: ctx.error.message || "Invalid email or password"
                        });
                    }
                });
            } else {
                // Sign Up
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await (authClient.signUp.email as any)({
                    email: formData.email,
                    password: formData.password,
                    name: formData.name,
                    companyName: formData.company || undefined,
                }, {
                    onSuccess: async () => {
                        toast.success("Account created!", {
                            description: "Please check your email to verify your account."
                        });
                        // Optimistically switch to login or close
                        onClose();
                    },
                    onError: (ctx: { error: { message?: string } }) => {
                        toast.error("Sign up failed", {
                            description: ctx.error.message || "Could not create account"
                        });
                    }
                });
            }
        } catch {
            toast.error("An error occurred", {
                description: "Please try again later"
            });
        } finally {
            setIsLoading(false);
        }
    };

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
                                <form className="space-y-6" onSubmit={handleSubmit}>
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
                                                        value={formData.name}
                                                        onChange={(e) => handleInputChange('name', e.target.value)}
                                                        required
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
                                                        value={formData.company}
                                                        onChange={(e) => handleInputChange('company', e.target.value)}
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
                                                value={formData.email}
                                                onChange={(e) => handleInputChange('email', e.target.value)}
                                                required
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
                                                type={showPassword ? "text" : "password"}
                                                placeholder="••••••••"
                                                className="w-full rounded-xl border border-white/10 bg-white/5 py-4 pl-12 pr-12 text-white placeholder-slate-500 backdrop-blur-xl transition-all focus:border-cyan-400/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
                                                value={formData.password}
                                                onChange={(e) => handleInputChange('password', e.target.value)}
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                                            >
                                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                            </button>
                                        </div>
                                    </div>

                                    {isLogin && (
                                        <div className="flex items-center justify-between text-sm">
                                            <label className="flex items-center gap-2 text-slate-400">
                                                <input type="checkbox" className="rounded border-white/10 bg-white/5 text-cyan-500 focus:ring-cyan-400/20" />
                                                Remember me
                                            </label>
                                            <a href="/auth/forgot-password" className="font-semibold text-cyan-400 hover:text-cyan-300">
                                                Forgot password?
                                            </a>
                                        </div>
                                    )}

                                    {/* Submit Button */}
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full rounded-xl bg-brand-blue py-4 font-display text-lg font-semibold text-white shadow-lg shadow-brand-blue/50 transition-all hover:bg-brand-blue/90 hover:shadow-brand-blue/75 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isLoading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
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
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
