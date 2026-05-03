"use client"

import { Clock, Ship, Loader2, CalendarOff } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { DashboardOverview } from "./overview-grid"

interface CutoffWidgetProps {
    data: DashboardOverview["nextCutoff"]
    loading: boolean
}

function formatRemaining(hours: number): string {
    if (hours <= 0) return "Closed"
    const days = Math.floor(hours / 24)
    const restHours = Math.floor(hours - days * 24)
    if (days > 0) return `${days}d ${restHours}h`
    if (restHours > 0) return `${restHours}h`
    const minutes = Math.max(1, Math.floor(hours * 60))
    return `${minutes}m`
}

function urgencyClass(hours: number): { label: string; pillClass: string; barClass: string } {
    if (hours <= 0) return { label: "Closed", pillClass: "text-red-600", barClass: "bg-red-500" }
    if (hours <= 24) return { label: "Closing today", pillClass: "text-red-600 font-medium", barClass: "bg-red-500" }
    if (hours <= 72) return { label: "Closing soon", pillClass: "text-amber-600 font-medium", barClass: "bg-amber-500" }
    return { label: "On track", pillClass: "text-emerald-600 font-medium", barClass: "bg-emerald-500" }
}

export function CutoffWidget({ data, loading }: CutoffWidgetProps) {
    const empty = !loading && !data

    // Progress bar fills as the window closes — 168h (7 days) maps to 0% remaining,
    // 0h to 100% (full bar = closed). Anything beyond a week stays at the empty end.
    const remainingHours = data?.hoursRemaining ?? 0
    const progress = data ? Math.min(100, Math.max(0, ((168 - remainingHours) / 168) * 100)) : 0
    const urgency = data ? urgencyClass(remainingHours) : null

    return (
        <Card className="col-span-1 border-slate-200/50 dark:border-slate-800/50 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-900/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-slate-500">Next Cut-Off</CardTitle>
                <Ship className="h-4 w-4 text-brand-blue" />
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                    </div>
                ) : empty ? (
                    <div className="flex flex-col items-start gap-2 py-2">
                        <CalendarOff className="h-5 w-5 text-slate-400" />
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">No upcoming sailings</p>
                        <p className="text-xs text-slate-500">
                            New schedules sync from MetaShip every few minutes.
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                                {formatRemaining(remainingHours)}
                            </span>
                            <span className="text-sm font-medium text-slate-500">
                                {data!.cutoffPassed ? "past cut-off" : "remaining"}
                            </span>
                        </div>

                        <div className="space-y-1">
                            <div className="flex w-full justify-between text-xs text-muted-foreground">
                                <span>
                                    Cut-off:{" "}
                                    {new Date(data!.cutoffAt).toLocaleString("en-ZA", {
                                        weekday: "short", day: "numeric", month: "short",
                                        hour: "2-digit", minute: "2-digit",
                                    })}
                                </span>
                                <span className={urgency!.pillClass}>{urgency!.label}</span>
                            </div>
                            <Progress value={progress} className="h-2 bg-slate-100" indicatorClassName={urgency!.barClass} />
                        </div>

                        <div className="rounded-lg bg-blue-50/50 p-2 border border-blue-100 dark:bg-blue-900/20 dark:border-blue-800 flex items-center gap-2 text-xs text-slate-600 dark:text-blue-100">
                            <Clock className="h-3 w-3 text-brand-blue shrink-0" />
                            <span className="truncate">
                                {data!.portOfLoad} → {data!.portOfDischarge} ·{" "}
                                <strong>{data!.vesselName}</strong>
                                {data!.voyageNumber ? ` (Voy ${data!.voyageNumber})` : ""}
                            </span>
                        </div>

                        {!data!.isClientRoute && (
                            <p className="text-[10px] text-slate-400 -mt-2">
                                Showing next global sailing — book a route to see your cut-off here.
                            </p>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
