import { ProductsManager } from "@/components/admin/products-manager"
import { Apple } from "lucide-react"

export default function ProductsPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center">
                    <Apple className="h-6 w-6 text-brand-blue" />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Products</h1>
                    <p className="text-slate-500">
                        Sync products from MetaShip and manage what&apos;s available for container bookings.
                    </p>
                </div>
            </div>

            <ProductsManager />
        </div>
    )
}
