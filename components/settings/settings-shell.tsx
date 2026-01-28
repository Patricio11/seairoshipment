"use client"

import { useState, type ReactNode } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Bell, Shield, Building2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface SettingsShellProps {
    children: (activeTab: string) => ReactNode
}

const TABS = [
    { id: "profile", label: "Company Profile", icon: Building2 },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "security", label: "Security & Access", icon: Shield },
]

export function SettingsShell({ children }: SettingsShellProps) {
    const [activeTab, setActiveTab] = useState("profile")

    return (
        <div className="flex flex-col gap-8 max-w-6xl mx-auto pb-12">
            {/* Header */}
            <div className="space-y-1">
                <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                    Settings
                </h1>
                <p className="text-slate-500 font-medium">
                    Manage your company details, preferences, and security.
                </p>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Sidebar Navigation */}
                <aside className="lg:w-64 flex-shrink-0">
                    <nav className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-4 lg:pb-0 scrollbar-hide">
                        {TABS.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all whitespace-nowrap lg:whitespace-normal relative",
                                    activeTab === tab.id
                                        ? "text-white"
                                        : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                                )}
                            >
                                {activeTab === tab.id && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute inset-0 bg-brand-blue rounded-2xl shadow-lg shadow-blue-500/30"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                                <tab.icon className={cn("h-5 w-5 relative z-10", activeTab === tab.id ? "text-blue-100" : "text-slate-400")} />
                                <span className="relative z-10">{tab.label}</span>
                            </button>
                        ))}
                    </nav>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 min-w-0">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-6 sm:p-10 shadow-sm relative overflow-hidden min-h-[600px]">
                        {/* Decorative background blob */}
                        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-slate-50 dark:bg-slate-800 rounded-full blur-3xl opacity-50 pointer-events-none" />

                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                                className="relative z-10"
                            >
                                {children(activeTab)}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </main>
            </div>
        </div>
    )
}
