"use client"

import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import {
    LayoutDashboard,
    MapPin,
    Ship,
    Package,
    Users,
    Activity,
    DollarSign,
    LogOut,
    Menu,
    Bell,
    X
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth/client"
import { toast } from "sonner"

interface AdminNotification {
    id: string
    type: string
    title: string
    message: string
    containerId: string | null
    isRead: boolean
    createdAt: string
}

const ADMIN_LINKS = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/bookings", label: "Bookings", icon: Activity },
    { href: "/admin/finance", label: "Finance", icon: DollarSign },
    { href: "/admin/locations", label: "Locations", icon: MapPin },
    { href: "/admin/fleet", label: "Fleet & Containers", icon: Ship },
    { href: "/admin/commodities", label: "Commodities", icon: Package },
    { href: "/admin/users", label: "User Vetting", icon: Users },
]

const FINANCE_LINKS = [
    { href: "/admin/finance/origin-charges", label: "Origin Charges", icon: Package },
    { href: "/admin/finance/ocean-freight", label: "Ocean Freight", icon: Ship },
    { href: "/admin/finance/destination-charges", label: "Destination Charges", icon: MapPin },
    { href: "/admin/finance/settings", label: "Settings & Forex", icon: DollarSign },
]

export function AdminSidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const [isCollapsed, setIsCollapsed] = useState(false)
    const [notifications, setNotifications] = useState<AdminNotification[]>([])
    const [showNotifications, setShowNotifications] = useState(false)

    const unreadCount = notifications.filter(n => !n.isRead).length

    // Subscribe to notification updates via polling
    useEffect(() => {
        let cancelled = false

        // Initial fetch (via setTimeout to avoid sync setState in effect body)
        const timeout = setTimeout(async () => {
            try {
                const res = await fetch("/api/admin/notifications")
                if (res.ok && !cancelled) setNotifications(await res.json())
            } catch { /* silently fail */ }
        }, 0)

        // Poll every 30s
        const interval = setInterval(async () => {
            try {
                const res = await fetch("/api/admin/notifications")
                if (res.ok && !cancelled) setNotifications(await res.json())
            } catch { /* silently fail */ }
        }, 30000)

        return () => {
            cancelled = true
            clearTimeout(timeout)
            clearInterval(interval)
        }
    }, [])

    const markAsRead = async (id: string) => {
        try {
            await fetch("/api/admin/notifications", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id }),
            })
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
        } catch {
            // silently fail
        }
    }

    const handleSignOut = async () => {
        try {
            await authClient.signOut()
            toast.success("Signed out successfully")
            router.push("/")
            router.refresh()
        } catch {
            toast.error("Failed to sign out")
        }
    }

    return (
        <motion.aside
            initial={{ width: 260 }}
            animate={{ width: isCollapsed ? 80 : 260 }}
            className="h-screen sticky top-0 bg-slate-950 border-r border-slate-800 text-white flex flex-col z-50 transition-all duration-300"
        >
            {/* Header */}
            <div className="h-16 flex items-center px-6 border-b border-slate-900 justify-between">
                {!isCollapsed && (
                    <div className="flex items-center gap-3">
                        <Image
                            src="/seairo-logo.png"
                            alt="Seairo"
                            width={100}
                            height={33}
                            className="h-7 w-auto brightness-0 invert"
                        />
                        <span className="font-mono font-bold tracking-widest text-[10px] text-brand-orange uppercase">Admin</span>
                    </div>
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="ml-auto text-slate-500 hover:text-white hover:bg-slate-900 h-8 w-8"
                >
                    <Menu className="h-4 w-4" />
                </Button>
            </div>

            {/* Notification Bell */}
            <div className="px-3 pt-4 pb-2 relative">
                <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className={cn(
                        "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-all group relative",
                        showNotifications
                            ? "bg-slate-900 text-white"
                            : "text-slate-400 hover:text-white hover:bg-slate-900/50"
                    )}
                >
                    <div className="relative">
                        <Bell className="h-5 w-5 shrink-0" />
                        {unreadCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-red-600 text-[9px] font-black flex items-center justify-center text-white animate-pulse">
                                {unreadCount}
                            </span>
                        )}
                    </div>
                    {!isCollapsed && (
                        <span className="text-xs font-bold uppercase tracking-wider">Notifications</span>
                    )}
                </button>

                {/* Notification Dropdown */}
                {showNotifications && !isCollapsed && (
                    <div className="absolute left-3 right-3 top-full mt-1 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 max-h-80 overflow-y-auto">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Recent</span>
                            <button onClick={() => setShowNotifications(false)} className="text-slate-500 hover:text-white">
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>
                        {notifications.length === 0 ? (
                            <div className="p-4 text-center text-slate-500 text-xs">No notifications</div>
                        ) : (
                            notifications.slice(0, 10).map((notif) => (
                                <button
                                    key={notif.id}
                                    onClick={() => markAsRead(notif.id)}
                                    className={cn(
                                        "w-full text-left px-4 py-3 border-b border-slate-800/50 hover:bg-slate-800/50 transition-colors",
                                        !notif.isRead && "bg-slate-800/30"
                                    )}
                                >
                                    <div className="flex items-start gap-2">
                                        {!notif.isRead && <div className="h-2 w-2 rounded-full bg-red-500 mt-1 shrink-0" />}
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-white truncate">{notif.title}</p>
                                            <p className="text-[10px] text-slate-400 line-clamp-2 mt-0.5">{notif.message}</p>
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
                {ADMIN_LINKS.map((link) => {
                    const isActive = pathname === link.href
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group relative overflow-hidden",
                                isActive
                                    ? "bg-slate-900 text-white shadow-inner shadow-black/50"
                                    : "text-slate-400 hover:text-white hover:bg-slate-900/50"
                            )}
                        >
                            {isActive && (
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-orange rounded-r-full" />
                            )}
                            <link.icon className={cn("h-5 w-5 shrink-0 transition-colors", isActive ? "text-brand-orange" : "text-slate-500 group-hover:text-white")} />
                            {!isCollapsed && (
                                <span className={cn("text-xs font-bold uppercase tracking-wider", isActive ? "text-white" : "")}>
                                    {link.label}
                                </span>
                            )}

                            {/* Hover Tooltip for Collapsed State */}
                            {isCollapsed && (
                                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 border border-slate-800 shadow-xl">
                                    {link.label}
                                </div>
                            )}
                        </Link>
                    )
                })}

                {/* Finance Section */}
                <div className="mt-6 pt-6 border-t border-slate-800">
                    <div className="px-3 mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                            Rate Management
                        </span>
                    </div>
                    {FINANCE_LINKS.map((link) => {
                        const isActive = pathname === link.href
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group relative overflow-hidden",
                                    isActive
                                        ? "bg-slate-900 text-white shadow-inner shadow-black/50"
                                        : "text-slate-400 hover:text-white hover:bg-slate-900/50"
                                )}
                            >
                                {isActive && (
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-orange rounded-r-full" />
                                )}
                                <link.icon className={cn("h-5 w-5 shrink-0 transition-colors", isActive ? "text-brand-orange" : "text-slate-500 group-hover:text-white")} />
                                {!isCollapsed && (
                                    <span className={cn("text-xs font-bold uppercase tracking-wider", isActive ? "text-white" : "")}>
                                        {link.label}
                                    </span>
                                )}

                                {/* Hover Tooltip for Collapsed State */}
                                {isCollapsed && (
                                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 border border-slate-800 shadow-xl">
                                        {link.label}
                                    </div>
                                )}
                            </Link>
                        )
                    })}
                </div>
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-slate-900">
                <button
                    onClick={handleSignOut}
                    className={cn(
                        "flex items-center gap-3 w-full px-3 py-2 text-slate-500 hover:text-red-400 transition-colors bg-slate-900/30 hover:bg-slate-900 rounded-lg group",
                        isCollapsed ? "justify-center" : ""
                    )}
                >
                    <LogOut className="h-4 w-4" />
                    {!isCollapsed && <span className="text-xs font-bold uppercase tracking-wider">Sign Out</span>}
                </button>
            </div>
        </motion.aside>
    )
}
