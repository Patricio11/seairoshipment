'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { Facebook, Twitter, Linkedin, Instagram, Mail, MapPin } from 'lucide-react'

const footerLinks = {
    product: [
        { name: 'Features', href: '#features' },
        { name: 'How It Works', href: '#how-it-works' },
        { name: 'FAQ', href: '#faq' },
        // { name: 'Pricing', href: '#pricing' },
        // { name: 'Case Studies', href: '#testimonials' },
    ],
    company: [
        { name: 'About Us', href: '#about' },
        { name: 'Careers', href: '#careers' },
        { name: 'Press Kit', href: '#press' },
        { name: 'Contact', href: '#contact' },
    ],
    resources: [
        { name: 'Documentation', href: '#docs' },
        { name: 'API Reference', href: '#api' },
        { name: 'Blog', href: '#blog' },
        { name: 'Support', href: '#support' },
    ],
    legal: [
        { name: 'Privacy Policy', href: '#privacy' },
        { name: 'Terms of Service', href: '#terms' },
        { name: 'Cookie Policy', href: '#cookies' },
        { name: 'GDPR', href: '#gdpr' },
    ],
}

const socialLinks = [
    { icon: Facebook, href: '#', label: 'Facebook' },
    // { icon: Twitter, href: '#', label: 'Twitter' },
    { icon: Linkedin, href: '#', label: 'LinkedIn' },
    // { icon: Instagram, href: '#', label: 'Instagram' },
]

export function Footer() {
    return (
        <footer className="relative overflow-hidden border-t border-slate-200 bg-white">
            <div className="relative z-10 mx-auto max-w-7xl px-6 py-16">
                {/* Main Footer */}
                <div className="grid gap-12 lg:grid-cols-5">
                    {/* Brand Column */}
                    <div className="lg:col-span-2">
                        <div className="flex items-center gap-2">
                            <Image
                                src="/seairo-logo.png"
                                alt="Seairo Cargo — Shared Reefer Services"
                                width={120}
                                height={40}
                                className="h-10 w-auto object-contain"
                            />
                        </div>
                        <p className="mt-4 max-w-md text-slate-600">
                            <strong className="text-slate-900">Shared Reefer Services<sup className="text-[0.6em] ml-0.5">®</sup></strong> &mdash; IoT-monitored cold-chain consolidation from Cape Town to the world. Smart, sustainable freight for perishable and FMCG exporters.
                        </p>

                        {/* Contact Info */}
                        <div className="mt-6 space-y-3 text-sm text-slate-600">
                            <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-brand-blue" />
                                <span>Cape Town, South Africa</span>
                            </div>
                            {/* <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-blue-600" />
                                <span>+27 21 XXX XXXX</span>
                            </div> */}
                            <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-brand-orange" />
                                <span>cat@seairo.co.za</span>
                            </div>
                        </div>

                        {/* Social Links */}
                        <div className="mt-6 flex gap-3">
                            {socialLinks.map((social) => (
                                <motion.a
                                    key={social.label}
                                    href={social.href}
                                    whileHover={{ scale: 1.1, y: -2 }}
                                    whileTap={{ scale: 0.9 }}
                                    className="rounded-lg border border-slate-200 bg-slate-50 p-2 transition-all hover:border-brand-blue/40 hover:bg-brand-blue/5"
                                    aria-label={social.label}
                                >
                                    <social.icon className="h-5 w-5 text-slate-600" />
                                </motion.a>
                            ))}
                        </div>
                    </div>

                    {/* Links Columns */}
                    <div>
                        <h3 className="font-display text-sm font-bold uppercase tracking-wider text-slate-900">
                            Product
                        </h3>
                        <ul className="mt-4 space-y-3">
                            {footerLinks.product.map((link) => (
                                <li key={link.name}>
                                    <Link
                                        href={link.href}
                                        className="text-sm text-slate-600 transition-colors hover:text-brand-blue"
                                    >
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h3 className="font-display text-sm font-bold uppercase tracking-wider text-slate-900">
                            Company
                        </h3>
                        <ul className="mt-4 space-y-3">
                            {footerLinks.company.map((link) => (
                                <li key={link.name}>
                                    <Link
                                        href={link.href}
                                        className="text-sm text-slate-600 transition-colors hover:text-brand-blue"
                                    >
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h3 className="font-display text-sm font-bold uppercase tracking-wider text-slate-900">
                            Legal
                        </h3>
                        <ul className="mt-4 space-y-3">
                            {footerLinks.legal.map((link) => (
                                <li key={link.name}>
                                    <Link
                                        href={link.href}
                                        className="text-sm text-slate-600 transition-colors hover:text-brand-blue"
                                    >
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="mt-16 border-t border-slate-200 pt-8">
                    <div className="flex flex-col items-center justify-between gap-4 text-sm text-slate-500 md:flex-row">
                        <p>© {new Date().getFullYear()} Seairo Cargo Solutions. All rights reserved.</p>
                        <div className="flex gap-6">
                            <span className="flex items-center gap-2">
                                <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                                All systems operational
                            </span>
                        </div>
                    </div>
                    <p className="mt-4 text-center text-xs text-slate-400 md:text-left">
                        Shared Reefer Services<sup className="text-[0.6em] ml-0.5">®</sup> is a registered trademark of Seairo Cargo Solutions.
                    </p>
                </div>
            </div>

            {/* Subtle gradient line */}
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-blue/50 to-transparent" />
        </footer>
    )
}
