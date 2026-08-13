"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { isRoadStaff, roadAllowedPath, type StaffRole } from "@/lib/roles"

export function AdminLayoutClient({
    role,
    children,
}: {
    role: StaffRole
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const router = useRouter()

    // Road-only staff: any admin page outside their allow-list bounces to the
    // trucks board. Data is separately protected by the API guards - this keeps
    // the UI from rendering sea-side shells that would just 403 underneath.
    const blocked = isRoadStaff(role) && !roadAllowedPath(role, pathname)

    useEffect(() => {
        if (blocked) router.replace("/admin/bookings")
    }, [blocked, router])

    return (
        <div className="dark flex min-h-screen bg-slate-950 text-slate-200">
            <AdminSidebar role={role} />
            <main className="flex-1 overflow-y-auto h-screen">
                <div className="p-8 max-w-[1600px] mx-auto space-y-8">
                    {blocked ? null : children}
                </div>
            </main>
        </div>
    )
}
