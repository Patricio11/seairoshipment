import { CategoriesManager } from "@/components/admin/categories-manager"
import { Layers } from "lucide-react"

export default function CategoriesPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center">
                    <Layers className="h-6 w-6 text-brand-blue" />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Product Categories</h1>
                    <p className="text-slate-500">
                        Group products into categories to drive container consolidation and document requirements.
                    </p>
                </div>
            </div>

            <CategoriesManager />
        </div>
    )
}
