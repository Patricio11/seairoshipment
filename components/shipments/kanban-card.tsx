"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Ship, Calendar, MapPin, MoreHorizontal } from "lucide-react"

export type Shipment = {
    id: string
    ref: string
    route: string
    vessel: string
    eta: string
    status: 'Booked' | 'Inspection' | 'Sailing' | 'Arrived' | 'Delivered'
    urgent?: boolean
}

export function KanbanCard({ shipment }: { shipment: Shipment }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: shipment.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    }

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="mb-3">
            <Card className={`
            cursor-grab active:cursor-grabbing hover:shadow-md transition-all border-l-4
            ${shipment.urgent ? "border-l-red-500" : "border-l-transparent"}
            bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800
        `}>
                <CardHeader className="p-3 pb-0 flex flex-row items-center justify-between space-y-0">
                    <Badge variant="outline" className="font-mono text-[10px] text-slate-500">
                        {shipment.ref}
                    </Badge>
                    {shipment.urgent && (
                        <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    )}
                </CardHeader>
                <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                        <Ship className="h-4 w-4 text-brand-blue" />
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 line-clamp-1">
                            {shipment.vessel}
                        </span>
                    </div>

                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                        <MapPin className="h-3 w-3" />
                        <span className="line-clamp-1">{shipment.route}</span>
                    </div>

                    <div className="flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded w-fit">
                        <Calendar className="h-3 w-3" />
                        <span>ETA: {shipment.eta}</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
