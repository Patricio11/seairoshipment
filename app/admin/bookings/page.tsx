import { AdminBookingsGrid } from "@/components/admin/admin-bookings-grid"
import { Activity } from "lucide-react"

export default function BookingsPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center">
                    <Activity className="h-6 w-6 text-brand-blue" />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Booking Management</h1>
                    <p className="text-slate-500">Manage incoming booking requests and tracking active shipments.</p>
                </div>
            </div>

            <AdminBookingsGrid />
        </div>
    )
}
