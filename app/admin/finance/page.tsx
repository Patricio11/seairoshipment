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
                    <h1 className="text-3xl font-black text-white tracking-tight">Finance Management</h1>
                    <p className="text-slate-500">Invoice tracking, payment management, and collection oversight.</p>
                </div>
            </div>

            <AdminFinanceView />
        </div>
    )
}
