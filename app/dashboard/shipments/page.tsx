import { ShipmentsBoard } from "@/components/shipments/kanban-board"
import { Button } from "@/components/ui/button"
import { Plus, Filter } from "lucide-react"

export default function ShipmentsPage() {
    return (
        <div className="flex flex-col h-full gap-6">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                        Shipments
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">
                        Manage active logistics flow via Kanban.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" className="hidden sm:flex">
                        <Filter className="mr-2 h-4 w-4" />
                        Filter
                    </Button>
                    <Button className="bg-brand-blue hover:bg-blue-700">
                        <Plus className="mr-2 h-4 w-4" />
                        New Shipment
                    </Button>
                </div>
            </div>

            <ShipmentsBoard />
        </div>
    )
}
