import { AdminSidebar } from "@/components/admin/admin-sidebar"

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex min-h-screen bg-slate-950 text-slate-200">
            <AdminSidebar />
            <main className="flex-1 overflow-y-auto h-screen">
                <div className="p-8 max-w-[1600px] mx-auto space-y-8">
                    {children}
                </div>
            </main>
        </div>
    )
}
