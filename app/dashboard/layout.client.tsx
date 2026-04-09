"use client"

import * as React from "react"
import Image from "next/image"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BookingModal } from "@/components/booking/booking-modal"
import { useBookingModal } from "@/hooks/use-booking-modal"

export function DashboardLayoutClient({
    children,
}: {
    children: React.ReactNode
}) {
    const [isCollapsed, setIsCollapsed] = React.useState(false)
    const { isOpen, onClose } = useBookingModal()

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
                    <Image
                        src="/seairo-logo.png"
                        alt="Seairo Cargo Solutions"
                        width={120}
                        height={40}
                        className="h-8 w-auto"
                    />
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

            <BookingModal open={isOpen} onOpenChange={(open) => !open && onClose()} />
        </div>
    )
}
