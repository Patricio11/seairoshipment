import { CommodityTable } from "@/components/admin/commodity-table"
import { Package } from "lucide-react"

export default function CommoditiesPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center">
                    <Package className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Commodity Registry</h1>
                    <p className="text-slate-500">Master database of HS Codes and handling requirements.</p>
                </div>
            </div>

            <CommodityTable />
        </div>
    )
}
