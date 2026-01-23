"use client"

import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { KanbanCard, Shipment } from "./kanban-card"

export function KanbanColumn({ id, title, items }: { id: string, title: string, items: Shipment[] }) {
    const { setNodeRef } = useDroppable({ id })

    return (
        <div className="flex flex-col min-w-[280px] w-[280px] bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 h-full max-h-full">
            {/* Header */}
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-100/50 dark:bg-slate-800/50 rounded-t-xl sticky top-0 backdrop-blur-sm z-10">
                <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-200">{title}</h3>
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                    {items.length}
                </span>
            </div>

            {/* Droppable Area */}
            <div ref={setNodeRef} className="flex-1 p-2 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                    {items.map((shipment) => (
                        <KanbanCard key={shipment.id} shipment={shipment} />
                    ))}
                </SortableContext>
                {items.length === 0 && (
                    <div className="h-24 flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg m-2">
                        <span className="text-xs text-slate-400">Empty</span>
                    </div>
                )}
            </div>
        </div>
    )
}
