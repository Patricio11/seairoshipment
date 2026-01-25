import { LocationsGrid } from "@/components/admin/locations-grid"
import { MapPin } from "lucide-react"

export default function LocationsPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center">
                    <MapPin className="h-6 w-6 text-emerald-500" />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Locations Manager</h1>
                    <p className="text-slate-500">Manage Ports of Loading (POL) and Ports of Discharge (POD).</p>
                </div>
            </div>

            <LocationsGrid />
        </div>
    )
}
