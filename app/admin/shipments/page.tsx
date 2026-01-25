import { GlobalShipmentsGrid } from "@/components/admin/global-shipments-grid"
import { Activity } from "lucide-react"

export default function ShipmentsPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center">
                    <Activity className="h-6 w-6 text-red-500" />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Shipment Control Tower</h1>
                    <p className="text-slate-500">Real-time tracking of all active consolidations globally.</p>
                </div>
            </div>

            <GlobalShipmentsGrid />
        </div>
    )
}
