import { SailingsManager } from "@/components/admin/sailings-manager"
import { Anchor } from "lucide-react"

export default function SailingsPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center">
                    <Anchor className="h-6 w-6 text-brand-blue" />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Sailings</h1>
                    <p className="text-slate-500">
                        Sync vessel sailings from MetaShip and see which ones have containers booked.
                    </p>
                </div>
            </div>

            <SailingsManager />
        </div>
    )
}
