"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { navItems, navSecondary } from "./nav-main"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { authClient, useAuth } from "@/lib/auth/client"
import { toast } from "sonner"

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
    isCollapsed: boolean
    setIsCollapsed: (collapsed: boolean) => void
}

export function AppSidebar({ className, isCollapsed, setIsCollapsed }: SidebarProps) {
    const pathname = usePathname()
    const router = useRouter()
    const { user } = useAuth()

    const displayName = user?.name || "User"
    const initials = displayName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)

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
        <TooltipProvider delayDuration={0}>
            <div
                className={cn(
                    "relative flex flex-col border-r border-slate-200/50 bg-white/80 dark:bg-slate-900/90 backdrop-blur-xl transition-all duration-300 ease-in-out",
                    isCollapsed ? "w-[80px]" : "w-72",
                    className
                )}
            >
                {/* Sidebar Header */}
                <div className={cn("flex h-16 items-center px-6 border-b border-slate-200/50 dark:border-slate-800/50", isCollapsed ? "justify-center px-0" : "justify-between")}>
                    <Link href="/dashboard" className={cn("flex items-center gap-2", isCollapsed && "hidden")}>
                        <div className="h-8 w-8 rounded-lg bg-brand-blue flex items-center justify-center">
                            <span className="text-white font-bold text-lg">S</span>
                        </div>
                        <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-blue to-brand-green">
                            SEAIRO
                        </span>
                    </Link>
                    <Link href="/dashboard" className={cn("flex items-center justify-center", !isCollapsed && "hidden")}>
                        <div className="h-8 w-8 rounded-lg bg-brand-blue flex items-center justify-center">
                            <span className="text-white font-bold text-lg">S</span>
                        </div>
                    </Link>

                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn("h-6 w-6 text-slate-500 hover:text-brand-blue", isCollapsed && "hidden")}
                        onClick={() => setIsCollapsed(true)}
                    >
                        <PanelLeftClose className="h-4 w-4" />
                    </Button>
                </div>

                <div className={cn("hidden", isCollapsed && "flex w-full justify-center pt-4 pb-2")}>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-slate-500 hover:text-brand-blue"
                        onClick={() => setIsCollapsed(false)}
                    >
                        <PanelLeftOpen className="h-4 w-4" />
                    </Button>
                </div>

                {/* Navigation */}
                <ScrollArea className="flex-1 py-6 px-4">
                    <nav className="flex flex-col gap-2">
                        {navItems.map((item) => {
                            const isActive = pathname === item.url
                            const content = (
                                <Link
                                    key={item.title}
                                    href={item.url}
                                    className={cn(
                                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 group relative overflow-hidden",
                                        isActive
                                            ? "bg-brand-blue/10 text-brand-blue dark:text-brand-blue"
                                            : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/50 hover:text-brand-blue",
                                        isCollapsed && "justify-center px-0 py-3"
                                    )}
                                >
                                    {isActive && (
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-blue rounded-r-full" />
                                    )}
                                    <item.icon className={cn("h-5 w-5 transition-transform group-hover:scale-110", isActive && "text-brand-blue")} />
                                    {!isCollapsed && <span>{item.title}</span>}
                                </Link>
                            )

                            if (!isCollapsed) return content

                            return (
                                <Tooltip key={item.title}>
                                    <TooltipTrigger asChild>
                                        {content}
                                    </TooltipTrigger>
                                    <TooltipContent side="right" sideOffset={20} className="font-bold bg-brand-blue text-white border-none shadow-xl">
                                        {item.title}
                                    </TooltipContent>
                                </Tooltip>
                            )
                        })}
                    </nav>
                </ScrollArea>

                {/* Secondary Navigation (Bottom) */}
                <div className="mt-auto border-t border-slate-200/50 dark:border-slate-800/50 p-4">
                    <nav className="flex flex-col gap-2">
                        {navSecondary.map((item) => {
                            // Check if this is the Sign Out button
                            if (item.title === "Sign Out") {
                                const content = (
                                    <button
                                        key={item.title}
                                        onClick={handleSignOut}
                                        className={cn(
                                            "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 text-slate-500 hover:bg-slate-100/50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-100 cursor-pointer",
                                            isCollapsed && "justify-center px-0 py-3"
                                        )}
                                    >
                                        <item.icon className="h-4 w-4" />
                                        {!isCollapsed && <span>{item.title}</span>}
                                    </button>
                                )

                                if (!isCollapsed) return content

                                return (
                                    <Tooltip key={item.title}>
                                        <TooltipTrigger asChild>
                                            {content}
                                        </TooltipTrigger>
                                        <TooltipContent side="right" sideOffset={20} className="font-bold bg-slate-800 text-white border-none shadow-xl">
                                            {item.title}
                                        </TooltipContent>
                                    </Tooltip>
                                )
                            }

                            // Regular navigation link
                            const content = (
                                <Link
                                    key={item.title}
                                    href={item.url}
                                    className={cn(
                                        "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 text-slate-500 hover:bg-slate-100/50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-100",
                                        isCollapsed && "justify-center px-0 py-3"
                                    )}
                                >
                                    <item.icon className="h-4 w-4" />
                                    {!isCollapsed && <span>{item.title}</span>}
                                </Link>
                            )

                            if (!isCollapsed) return content

                            return (
                                <Tooltip key={item.title}>
                                    <TooltipTrigger asChild>
                                        {content}
                                    </TooltipTrigger>
                                    <TooltipContent side="right" sideOffset={20} className="font-bold bg-slate-800 text-white border-none shadow-xl">
                                        {item.title}
                                    </TooltipContent>
                                </Tooltip>
                            )
                        })}
                    </nav>

                    {!isCollapsed && (
                        <div className="mt-6 rounded-xl bg-slate-100 p-4 dark:bg-slate-800/50">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-brand-blue to-brand-green flex items-center justify-center text-white font-bold text-xs ring-2 ring-white dark:ring-slate-900">
                                    {initials}
                                </div>
                                <div className="flex flex-col overflow-hidden">
                                    <span className="text-sm font-semibold truncate leading-none">{displayName}</span>
                                    <span className="text-xs text-slate-500 truncate mt-1">{user?.email || ""}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </TooltipProvider>
    )
}
