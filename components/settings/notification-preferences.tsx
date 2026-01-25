"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Bell, Mail, MessageSquare, Smartphone, Zap } from "lucide-react"

type NotificationChannel = "email" | "sms" | "whatsapp" | "push"

interface Preference {
    id: string
    title: string
    description: string
    channels: {
        [key in NotificationChannel]?: boolean
    }
}

const INITIAL_PREFS: Preference[] = [
    {
        id: "shipment_updates",
        title: "Shipment Updates",
        description: "Get notified when your cargo departs, arrives, or faces delays.",
        channels: { email: true, push: true, whatsapp: true }
    },
    {
        id: "documents",
        title: "Document Required",
        description: "Alerts when you need to upload HBLs, CoAs or Invoices.",
        channels: { email: true, push: true }
    },
    {
        id: "financials",
        title: "Financial Alerts",
        description: "Invoices due, payments received, and statement availability.",
        channels: { email: true, sms: false }
    },
    {
        id: "marketing",
        title: "News & Features",
        description: "Updates about new routes, features, and industry news.",
        channels: { email: false }
    }
]

export function NotificationPreferences() {
    const [preferences, setPreferences] = useState(INITIAL_PREFS)

    const toggleChannel = (prefId: string, channel: NotificationChannel) => {
        setPreferences(prev => prev.map(p => {
            if (p.id !== prefId) return p
            return {
                ...p,
                channels: {
                    ...p.channels,
                    [channel]: !p.channels[channel]
                }
            }
        }))
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8 max-w-3xl"
        >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Notification Preferences</h2>
                    <p className="text-sm text-slate-500 mt-1">
                        Control how and when we communicate with you.
                    </p>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-amber-50 dark:bg-slate-800 flex items-center justify-center">
                    <Bell className="h-6 w-6 text-amber-500" />
                </div>
            </div>

            <div className="space-y-6">
                {preferences.map((pref, i) => (
                    <motion.div
                        key={pref.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 hover:bg-white dark:hover:bg-slate-900 transition-colors shadow-sm hover:shadow-md"
                    >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="space-y-1 flex-1">
                                <h3 className="font-bold text-slate-900 dark:text-white">{pref.title}</h3>
                                <p className="text-sm text-slate-500 font-medium">{pref.description}</p>
                            </div>

                            <div className="flex items-center gap-3">
                                {Object.keys(pref.channels).map((c) => {
                                    const channel = c as NotificationChannel
                                    const isEnabled = pref.channels[channel]

                                    return (
                                        <button
                                            key={channel}
                                            onClick={() => toggleChannel(pref.id, channel)}
                                            className="group relative"
                                        >
                                            <div className={`
                                                h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-300
                                                ${isEnabled
                                                    ? "bg-brand-blue text-white shadow-lg shadow-blue-500/30 scale-100"
                                                    : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 hover:bg-slate-300 dark:hover:bg-slate-700"}
                                            `}>
                                                {channel === 'email' && <Mail className="h-5 w-5" />}
                                                {channel === 'push' && <Zap className="h-5 w-5" />}
                                                {channel === 'sms' && <MessageSquare className="h-5 w-5" />}
                                                {channel === 'whatsapp' && <Smartphone className="h-5 w-5" />} {/* Using Smartphone as proxy for WA */}
                                            </div>

                                            {/* Tooltipish label */}
                                            <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] uppercase font-bold text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {channel}
                                            </span>

                                            {/* Status Dot */}
                                            <div className={`absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900 transition-colors ${isEnabled ? "bg-emerald-500" : "bg-slate-300"}`} />
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    )
}
