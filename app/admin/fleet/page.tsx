import { FleetScheduler } from "@/components/admin/fleet-scheduler"
import { Ship } from "lucide-react"

export default function FleetPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center">
                    <Ship className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Fleet & Containers</h1>
                    <p className="text-slate-500">Manage vessel schedules, allocations, and container positioning.</p>
                </div>
            </div>

            <FleetScheduler />
        </div>
    )
}
