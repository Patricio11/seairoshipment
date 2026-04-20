"use client"

import {
    LayoutDashboard,
    PlusCircle,
    Radar,
    FileText,
    CreditCard,
    Settings,
    LifeBuoy,
    LogOut,
} from "lucide-react"

export const navItems = [
    {
        title: "Overview",
        url: "/dashboard",
        icon: LayoutDashboard,
        isActive: true,
    },
    {
        title: "Bookings",
        url: "/dashboard/bookings",
        icon: PlusCircle,
    },
    {
        title: "Live Tracking",
        url: "/dashboard/shipments",
        icon: Radar,
    },
    {
        title: "Documents",
        url: "/dashboard/documents",
        icon: FileText,
    },
    {
        title: "Finance",
        url: "/dashboard/finance",
        icon: CreditCard,
    },
    {
        title: "Settings",
        url: "/dashboard/settings",
        icon: Settings,
    },
]

export const navSecondary = [
    {
        title: "Support",
        url: "/dashboard/support",
        icon: LifeBuoy,
    },
    {
        title: "Sign Out",
        url: "#",
        icon: LogOut,
    },
]
