import { RoadRatesManager } from "@/components/admin/finance/road-rates-manager"
import { Truck } from "lucide-react"

export default function RoadRatesPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center">
                    <Truck className="h-6 w-6 text-emerald-500" />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Road Freight Rates</h1>
                    <p className="text-slate-500">
                        Per-customer rate cards for refrigerated road consolidations. Default cards cover customers without their own structure.
                    </p>
                </div>
            </div>

            <RoadRatesManager />
        </div>
    )
}
