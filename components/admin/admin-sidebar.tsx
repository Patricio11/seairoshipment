"use client"

import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import {
    LayoutDashboard,
    MapPin,
    Ship,
    Package,
    Users,
    Activity,
    DollarSign,
    Settings,
    LogOut,
    Menu
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth/client"
import { toast } from "sonner"

const ADMIN_LINKS = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/bookings", label: "Bookings", icon: Activity },
    { href: "/admin/locations", label: "Locations", icon: MapPin },
    { href: "/admin/fleet", label: "Fleet & Containers", icon: Ship },
    { href: "/admin/commodities", label: "Commodities", icon: Package },
    { href: "/admin/users", label: "User Vetting", icon: Users },
    { href: "/admin/finance", label: "Finance & Forex", icon: DollarSign },
]

export function AdminSidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const [isCollapsed, setIsCollapsed] = useState(false)

    const handleSignOut = async () => {
        try {
            await authClient.signOut()
            toast.success("Signed out successfully")
            router.push("/")
            router.refresh()
        } catch (error) {
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
                    <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded bg-red-600 flex items-center justify-center font-black text-[10px] tracking-tighter">SRS</div>
                        <span className="font-mono font-bold tracking-widest text-sm text-slate-400">ADMIN<span className="text-red-600">OS</span></span>
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

            {/* Navigation */}
            <nav className="flex-1 py-6 px-3 space-y-1">
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
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-600 rounded-r-full" />
                            )}
                            <link.icon className={cn("h-5 w-5 shrink-0 transition-colors", isActive ? "text-red-500" : "text-slate-500 group-hover:text-white")} />
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
