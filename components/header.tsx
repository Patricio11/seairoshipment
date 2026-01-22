'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Package } from 'lucide-react'
import Link from 'next/link'
import { AuthPanel } from './auth-panel'

const navLinks = [
    { name: 'Features', href: '#features' },
    { name: 'How It Works', href: '#how-it-works' },
    // { name: 'Pricing', href: '#pricing' },
    // { name: 'Case Studies', href: '#testimonials' },
    { name: 'Contact', href: '#contact' },
]

export function Header() {
    const [isScrolled, setIsScrolled] = useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [isAuthOpen, setIsAuthOpen] = useState(false)
    const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50)
        }
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    const openAuth = (mode: 'login' | 'signup') => {
        setAuthMode(mode)
        setIsAuthOpen(true)
    }

    return (
        <>
            <header
                className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled
                    ? 'bg-white/80 backdrop-blur-xl border-b border-slate-200 shadow-sm'
                    : 'bg-transparent'
                    }`}
            >
                <div className="mx-auto max-w-7xl px-6">
                    <div className="flex h-20 items-center justify-between">
                        {/* Logo */}
                        <Link href="/" className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600">
                                <Package className="h-6 w-6 text-white" strokeWidth={2.5} />
                            </div>
                            <div className="font-display text-2xl font-bold">
                                <span className={isScrolled ? 'text-slate-900' : 'text-white'}>Seairo</span>
                            </div>
                        </Link>

                        {/* Desktop Navigation */}
                        <nav className="hidden items-center gap-8 md:flex">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.name}
                                    href={link.href}
                                    className={`text-sm font-semibold transition-colors ${isScrolled
                                        ? 'text-slate-600 hover:text-blue-600'
                                        : 'text-white/90 hover:text-white'
                                        }`}
                                >
                                    {link.name}
                                </Link>
                            ))}
                        </nav>

                        {/* CTA Buttons */}
                        <div className="hidden items-center gap-4 md:flex">
                            <button
                                onClick={() => openAuth('login')}
                                className={`text-sm font-semibold transition-colors ${isScrolled
                                    ? 'text-slate-600 hover:text-blue-600'
                                    : 'text-white/90 hover:text-white'
                                    }`}
                            >
                                Sign In
                            </button>
                            <button
                                onClick={() => openAuth('signup')}
                                className="rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition-all hover:shadow-blue-500/50"
                            >
                                Get Started
                            </button>
                        </div>

                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className={`md:hidden ${isScrolled ? 'text-slate-900' : 'text-white'}`}
                        >
                            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                <AnimatePresence>
                    {isMobileMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="border-t border-slate-200 bg-white md:hidden"
                        >
                            <div className="space-y-1 px-6 py-4">
                                {navLinks.map((link) => (
                                    <Link
                                        key={link.name}
                                        href={link.href}
                                        className="block rounded-lg px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-blue-600"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        {link.name}
                                    </Link>
                                ))}
                                <div className="pt-4 space-y-2">
                                    <button
                                        onClick={() => {
                                            setIsMobileMenuOpen(false)
                                            openAuth('login')
                                        }}
                                        className="block w-full rounded-lg px-4 py-3 text-center text-sm font-semibold text-slate-600 hover:bg-slate-50"
                                    >
                                        Sign In
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsMobileMenuOpen(false)
                                            openAuth('signup')
                                        }}
                                        className="block w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-3 text-center text-sm font-bold text-white"
                                    >
                                        Get Started
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </header>

            {/* Auth Panel */}
            <AuthPanel isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} initialMode={authMode} />
        </>
    )
}
