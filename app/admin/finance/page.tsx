import { AdminFinanceView } from "@/components/admin/admin-finance-view"
import { DollarSign } from "lucide-react"

export default function FinancePage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-emerald-500" />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Financial Overview</h1>
                    <p className="text-slate-500">Revenue tracking, invoicing, and exchange rates.</p>
                </div>
            </div>

            <AdminFinanceView />
        </div>
    )
}
