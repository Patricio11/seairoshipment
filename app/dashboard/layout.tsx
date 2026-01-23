"use client"

import * as React from "react"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const [isCollapsed, setIsCollapsed] = React.useState(false)

    return (
        <div className="flex min-h-screen bg-slate-50/50 dark:bg-slate-950/50">
            {/* Desktop Sidebar */}
            <div className="hidden border-r bg-background md:block">
                <AppSidebar
                    className="h-full min-h-screen sticky top-0"
                    isCollapsed={isCollapsed}
                    setIsCollapsed={setIsCollapsed}
                />
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-h-screen transition-all duration-300">

                {/* Mobile Header Override for Menu Trigger */}
                <div className="md:hidden sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/50 px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-brand-blue flex items-center justify-center">
                            <span className="text-white font-bold text-lg">S</span>
                        </div>
                        <span className="font-bold text-slate-900">SEAIRO</span>
                    </div>
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <Menu className="h-5 w-5" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="p-0 w-72">
                            <AppSidebar isCollapsed={false} setIsCollapsed={() => { }} className="border-none h-full w-full" />
                        </SheetContent>
                    </Sheet>
                </div>

                {/* Desktop Header */}
                <div className="hidden md:block">
                    <DashboardHeader />
                </div>

                <main className="flex-1 p-6 overflow-y-auto">
                    <div className="mx-auto max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    )
}
