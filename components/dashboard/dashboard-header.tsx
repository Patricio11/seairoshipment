"use client"

import { useState, useEffect, useCallback } from "react"
import { Bell, CheckCheck, CircleX, CircleCheck, CreditCard, FileText, Ship, Inbox } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SearchCommand } from "./search-command"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { authClient, useAuth } from "@/lib/auth/client"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

interface ClientNotification {
    id: string
    type: "BOOKING_APPROVED" | "BOOKING_REJECTED" | "PAYMENT_REMINDER" | "DOCUMENT_REQUEST" | "SHIPMENT_UPDATE" | "GENERAL"
    title: string
    message: string
    allocationId: string | null
    isRead: boolean
    createdAt: string
}

function formatRelativeTime(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return "just now"
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d ago`
    return new Date(dateStr).toLocaleDateString()
}

function getIcon(type: ClientNotification["type"]) {
    switch (type) {
        case "BOOKING_APPROVED": return <CircleCheck className="h-4 w-4 text-emerald-500" />
        case "BOOKING_REJECTED": return <CircleX className="h-4 w-4 text-red-500" />
        case "PAYMENT_REMINDER": return <CreditCard className="h-4 w-4 text-amber-500" />
        case "DOCUMENT_REQUEST": return <FileText className="h-4 w-4 text-brand-blue" />
        case "SHIPMENT_UPDATE": return <Ship className="h-4 w-4 text-brand-blue" />
        default: return <Inbox className="h-4 w-4 text-slate-500" />
    }
}

export function DashboardHeader() {
    const router = useRouter()
    const { user } = useAuth()
    const [notifications, setNotifications] = useState<ClientNotification[]>([])

    const displayName = user?.name || "User"
    const displayEmail = user?.email || ""
    const initials = displayName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    const unreadCount = notifications.filter(n => !n.isRead).length

    const fetchNotifications = useCallback(async () => {
        try {
            const res = await fetch("/api/notifications")
            if (res.ok) setNotifications(await res.json())
        } catch {
            // silent — bell just won't update
        }
    }, [])

    useEffect(() => {
        fetchNotifications()
        const interval = setInterval(fetchNotifications, 60000) // poll every minute
        return () => clearInterval(interval)
    }, [fetchNotifications])

    const markAsRead = async (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
        try {
            await fetch(`/api/notifications/${id}/read`, { method: "POST" })
        } catch {
            // ignore
        }
    }

    const markAllAsRead = async () => {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
        try {
            await fetch("/api/notifications/all/read", { method: "POST" })
        } catch {
            // ignore
        }
    }

    const handleNotificationClick = (notif: ClientNotification) => {
        if (!notif.isRead) markAsRead(notif.id)
        if (notif.allocationId) {
            router.push("/dashboard/bookings")
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
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-slate-200/50 bg-white/50 px-6 backdrop-blur-xl dark:border-slate-800/50 dark:bg-slate-900/50">
            <div className="flex flex-1 items-center gap-4">
                {/* Mobile menu trigger will be handled in layout */}
                <div className="hidden md:flex flex-col">
                    <h1 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Overview</h1>
                    <span className="text-xs text-slate-500">Dashboard / Welcome back</span>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <SearchCommand />

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="relative text-slate-500 hover:bg-slate-100/50 dark:text-slate-400 dark:hover:bg-slate-800/50">
                            <Bell className="h-5 w-5" />
                            {unreadCount > 0 && (
                                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-950 text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
                                    {unreadCount > 9 ? "9+" : unreadCount}
                                </span>
                            )}
                            <span className="sr-only">Notifications</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[360px] p-0">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                            <p className="font-bold text-sm">Notifications</p>
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="text-xs text-brand-blue hover:underline font-semibold flex items-center gap-1"
                                >
                                    <CheckCheck className="h-3 w-3" /> Mark all read
                                </button>
                            )}
                        </div>

                        {notifications.length === 0 ? (
                            <div className="py-12 text-center text-slate-500">
                                <Inbox className="h-8 w-8 mx-auto mb-2 opacity-40" />
                                <p className="text-sm font-medium">No notifications yet</p>
                            </div>
                        ) : (
                            <div className="max-h-[400px] overflow-y-auto">
                                {notifications.map((notif) => (
                                    <button
                                        key={notif.id}
                                        onClick={() => handleNotificationClick(notif)}
                                        className={`w-full text-left flex gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${!notif.isRead ? "bg-blue-50/50 dark:bg-blue-950/10" : ""
                                            }`}
                                    >
                                        <div className="shrink-0 mt-0.5">{getIcon(notif.type)}</div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className={`text-sm truncate ${!notif.isRead ? "font-bold text-slate-900 dark:text-white" : "font-medium text-slate-700 dark:text-slate-300"}`}>
                                                    {notif.title}
                                                </p>
                                                {!notif.isRead && (
                                                    <span className="shrink-0 h-2 w-2 rounded-full bg-brand-blue mt-1.5" />
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-500 mt-0.5 leading-snug line-clamp-2">{notif.message}</p>
                                            <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-bold">
                                                {formatRelativeTime(notif.createdAt)}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-9 w-9 rounded-full ring-2 ring-white/50 dark:ring-slate-800/50">
                            <Avatar className="h-9 w-9">
                                <AvatarImage src={user?.image || ""} alt={displayName} />
                                <AvatarFallback className="bg-brand-blue text-white">{initials}</AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">{displayName}</p>
                                <p className="text-xs leading-none text-muted-foreground">
                                    {displayEmail}
                                </p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                            Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            Billing
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            Settings
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className="text-red-500 focus:text-red-500 cursor-pointer"
                            onClick={handleSignOut}
                        >
                            Log out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    )
}
