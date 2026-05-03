"use client"

import {
    ArrowUpRight, ArrowDownRight, Package, AlertCircle, CreditCard, Activity, Loader2,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { DashboardOverview } from "./overview-grid"

interface StatsCardsProps {
    data: DashboardOverview["stats"] | null
    loading: boolean
}

function formatZAR(amount: number): string {
    if (amount >= 1_000_000) return `R ${(amount / 1_000_000).toFixed(1)}M`
    if (amount >= 1_000) return `R ${(amount / 1_000).toFixed(amount >= 10_000 ? 0 : 1)}k`
    return `R ${amount.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`
}

export function StatsCards({ data, loading }: StatsCardsProps) {
    // --- Active Shipments -----------------------------------------------------
    const activeCount = data?.activeShipments.count ?? 0
    const weekDelta = data?.activeShipments.weekDelta ?? 0
    const activeChange = activeCount === 0
        ? "No active shipments"
        : weekDelta > 0
            ? `+${weekDelta} this week`
            : "Stable this week"
    const activeTrend: "up" | "neutral" = weekDelta > 0 ? "up" : "neutral"

    // --- Pending Tasks --------------------------------------------------------
    const pendingCount = data?.pendingTasks.count ?? 0
    const overdue = data?.pendingTasks.breakdown.overdueInvoices ?? 0
    const dueSoon = data?.pendingTasks.breakdown.dueSoonInvoices ?? 0
    const pendingChange = pendingCount === 0
        ? "All clear"
        : overdue > 0
            ? `${overdue} overdue · ${dueSoon} due soon`
            : `${dueSoon} due in 7 days`
    const pendingTrend: "warning" | "good" = pendingCount === 0 ? "good" : "warning"

    // --- Monthly Spend --------------------------------------------------------
    const spendCurrent = data?.monthlySpend.currentZAR ?? 0
    const spendDelta = data?.monthlySpend.deltaPercent
    const spendChange = spendDelta === null || spendDelta === undefined
        ? data?.monthlySpend.previousZAR === 0 && spendCurrent > 0 ? "First month with spend" : "vs last month"
        : `${spendDelta > 0 ? "+" : ""}${spendDelta.toFixed(0)}% vs last month`
    const spendTrend: "up" | "down" | "neutral" =
        spendDelta === null || spendDelta === undefined ? "neutral" : spendDelta > 0 ? "up" : spendDelta < 0 ? "down" : "neutral"

    // --- Avg Transit Time -----------------------------------------------------
    const transitDays = data?.avgTransitTime.currentDays
    const transitDelta = data?.avgTransitTime.deltaDays
    const transitValue = transitDays === null || transitDays === undefined
        ? "—"
        : `${Math.round(transitDays)} Days`
    const transitChange = transitDays === null || transitDays === undefined
        ? `Need delivered shipments to compute`
        : transitDelta === null || transitDelta === undefined
            ? "First measured period"
            : transitDelta < 0
                ? `${Math.abs(transitDelta).toFixed(1)} days faster`
                : transitDelta > 0
                    ? `${transitDelta.toFixed(1)} days slower`
                    : "Steady"
    const transitTrend: "up" | "down" | "neutral" = transitDelta === null || transitDelta === undefined
        ? "neutral"
        : transitDelta < 0 ? "down" : transitDelta > 0 ? "up" : "neutral"

    const cards = [
        {
            title: "Active Shipments",
            value: String(activeCount),
            change: activeChange,
            trend: activeTrend,
            icon: Package,
            color: "text-brand-blue",
        },
        {
            title: "Pending Tasks",
            value: String(pendingCount),
            change: pendingChange,
            trend: pendingTrend,
            icon: AlertCircle,
            color: pendingTrend === "warning" ? "text-amber-500" : "text-emerald-500",
        },
        {
            title: "Monthly Spend",
            value: formatZAR(spendCurrent),
            change: spendChange,
            trend: spendTrend,
            icon: CreditCard,
            color: "text-emerald-500",
        },
        {
            title: "Avg. Transit Time",
            value: transitValue,
            change: transitChange,
            trend: transitTrend,
            icon: Activity,
            color: "text-purple-500",
        },
    ]

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {cards.map((stat, index) => (
                <Card key={index} className="shadow-sm border-slate-200/50 dark:border-slate-800/50 hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">
                            {stat.title}
                        </CardTitle>
                        <div className={`rounded-full p-2 bg-slate-100 dark:bg-slate-800 ${stat.color}`}>
                            <stat.icon className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <>
                                <div className="text-2xl font-bold text-slate-300 dark:text-slate-700 flex items-center gap-2">
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                </div>
                                <div className="h-3 mt-2" />
                            </>
                        ) : (
                            <>
                                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stat.value}</div>
                                <div className="flex items-center text-xs text-muted-foreground mt-1">
                                    {stat.trend === "up" && <ArrowUpRight className="mr-1 h-3 w-3 text-emerald-500" />}
                                    {stat.trend === "down" && <ArrowDownRight className="mr-1 h-3 w-3 text-emerald-500" />}
                                    {stat.trend === "warning" && <AlertCircle className="mr-1 h-3 w-3 text-amber-500" />}
                                    <span className={stat.trend === "warning" ? "text-amber-500 font-medium" : ""}>
                                        {stat.change}
                                    </span>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
