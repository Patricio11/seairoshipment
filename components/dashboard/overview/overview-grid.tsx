"use client"

import { useEffect, useState } from "react"
import { CutoffWidget } from "./cutoff-widget"
import { MyBookingsWidget } from "./my-bookings-widget"
import { RecentShipments } from "./recent-shipments"
import { StatsCards } from "./stats-cards"
import { WeatherWidget } from "./weather-widget"

export interface DashboardOverview {
    stats: {
        activeShipments: { count: number; weekDelta: number }
        pendingTasks: {
            count: number
            breakdown: { overdueInvoices: number; dueSoonInvoices: number }
        }
        monthlySpend: { currentZAR: number; previousZAR: number; deltaPercent: number | null }
        avgTransitTime: {
            currentDays: number | null
            previousDays: number | null
            deltaDays: number | null
            sampleSize: number
        }
    }
    nextCutoff: {
        sailingId: string
        vesselName: string
        voyageNumber: string | null
        portOfLoad: string
        portOfDischarge: string
        etd: string
        cutoffAt: string
        hoursRemaining: number
        hoursToEtd: number
        cutoffPassed: boolean
        isClientRoute: boolean
    } | null
    upcomingBookings: Array<{
        id: string
        bookingRef: string
        status: string
        palletCount: number
        vessel: string
        voyageNumber: string | null
        route: string
        etd: string | null
        eta: string | null
    }>
}

export function OverviewGrid() {
    const [data, setData] = useState<DashboardOverview | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let cancelled = false
        fetch("/api/dashboard/overview", { cache: "no-store" })
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (!cancelled && d) setData(d) })
            .catch(() => { /* swallow — widgets render their own fallback */ })
            .finally(() => { if (!cancelled) setLoading(false) })
        return () => { cancelled = true }
    }, [])

    return (
        <div className="flex flex-col gap-6">
            <StatsCards data={data?.stats ?? null} loading={loading} />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <CutoffWidget data={data?.nextCutoff ?? null} loading={loading} />
                <WeatherWidget />
                <div className="lg:col-span-2 md:col-span-2">
                    <MyBookingsWidget bookings={data?.upcomingBookings ?? []} loading={loading} />
                </div>
            </div>

            <RecentShipments />
        </div>
    )
}
