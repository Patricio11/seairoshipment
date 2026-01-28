"use client"

import { useState } from "react"
import { DndContext, DragOverlay, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import { KanbanColumn } from "./kanban-column"
import { KanbanCard, Shipment } from "./kanban-card"

// Mock Data
const initialShipments: Shipment[] = [
    { id: '1', ref: 'SRS-001', route: 'CPT - RTM', vessel: 'MSC Orchestra', eta: 'Nov 12', status: 'Sailing' },
    { id: '2', ref: 'SRS-002', route: 'CPT - LND', vessel: 'Maersk Vallvik', eta: 'Nov 14', status: 'Booked' },
    { id: '3', ref: 'SRS-003', route: 'DUR - SIN', vessel: 'CMA CGM Blue', eta: 'Nov 20', status: 'Inspection', urgent: true },
    { id: '4', ref: 'SRS-004', route: 'PLZ - ASH', vessel: 'Santa Rita', eta: 'Nov 22', status: 'Arrived' },
    { id: '5', ref: 'SRS-005', route: 'CPT - RTM', vessel: 'MSC Opera', eta: 'Nov 25', status: 'Booked' },
    { id: '6', ref: 'SRS-006', route: 'CPT - LND', vessel: 'Ever Given', eta: 'Dec 01', status: 'Sailing' },
    { id: '7', ref: 'SRS-007', route: 'DUR - RTM', vessel: 'Hapag Lloyd Express', eta: 'Dec 05', status: 'Delivered' },
]

const columns = [
    { id: 'Booked', title: 'Booked' },
    { id: 'Inspection', title: 'Inspection' },
    { id: 'Sailing', title: 'Sailing' },
    { id: 'Arrived', title: 'Arrived' },
    { id: 'Delivered', title: 'Delivered' },
]

export function ShipmentsBoard() {
    const [items, setItems] = useState<Shipment[]>(initialShipments)
    const [activeId, setActiveId] = useState<string | null>(null)

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    const handleDragStart = (event: { active: { id: string | number } }) => {
        setActiveId(String(event.active.id))
    }

    const handleDragEnd = (event: { active: { id: string | number }; over: { id: string | number } | null }) => {
        const { active, over } = event

        if (!over) {
            setActiveId(null)
            return
        }

        const activeId = String(active.id)
        const overId = String(over.id)
        const activeItem = items.find(i => i.id === activeId)

        // Determine the target column
        let newStatus: string = overId

        // If dropped over another card, get that card's status
        const overItem = items.find(i => i.id === overId)
        if (overItem) {
            newStatus = overItem.status
        }

        // Only update if status implies a change (and is a valid status)
        const isValidColumn = columns.some(c => c.id === newStatus)

        if (activeItem && isValidColumn && activeItem.status !== newStatus) {
            setItems((prev) => prev.map(item =>
                item.id === activeItem.id ? { ...item, status: newStatus as Shipment['status'] } : item
            ))
        }

        setActiveId(null)
    }

    const activeItem = activeId ? items.find(i => i.id === activeId) : null

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="flex h-[calc(100vh-220px)] w-full overflow-x-auto gap-4 pb-4">
                {columns.map((col) => (
                    <KanbanColumn
                        key={col.id}
                        id={col.id}
                        title={col.title}
                        items={items.filter(i => i.status === col.id)}
                    />
                ))}
            </div>

            <DragOverlay>
                {activeItem ? <KanbanCard shipment={activeItem} /> : null}
            </DragOverlay>
        </DndContext>
    )
}
