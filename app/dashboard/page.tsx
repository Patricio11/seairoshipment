"use client"

import { Button } from "@/components/ui/button"
import { OverviewGrid } from "@/components/dashboard/overview/overview-grid"
import { Plus } from "lucide-react"
import { useBookingModal } from "@/hooks/use-booking-modal"

export default function DashboardPage() {
    const { onOpen } = useBookingModal()

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Dashboard</h2>
                <div className="flex items-center gap-2">
                    <Button
                        className="bg-brand-blue hover:bg-blue-700"
                        onClick={onOpen}
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        New Booking
                    </Button>
                </div>
            </div>

            <OverviewGrid />
        </div>
    )
}
