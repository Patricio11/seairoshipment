"use client"

import { useEffect, useState } from "react"
import { CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Cloudy, Loader2, Sun } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type ConditionKind = "sun" | "cloud" | "rain" | "snow" | "storm" | "fog" | "unknown"

interface WeatherPort {
    id: string
    cityName: string
    countryCode: string | null
    role: "ORIGIN" | "DEST" | "HUB"
    tempC: number | null
    weatherCode: number | null
    condition: string
    conditionKind: ConditionKind
}

const ICONS: Record<ConditionKind, LucideIcon> = {
    sun: Sun,
    cloud: Cloudy,
    rain: CloudRain,
    snow: CloudSnow,
    storm: CloudLightning,
    fog: CloudFog,
    unknown: CloudSun,
}

const ICON_COLORS: Record<ConditionKind, string> = {
    sun: "text-orange-500",
    cloud: "text-slate-400",
    rain: "text-blue-400",
    snow: "text-sky-300",
    storm: "text-violet-400",
    fog: "text-slate-300",
    unknown: "text-slate-400",
}

const ROLE_LABEL: Record<WeatherPort["role"], string> = {
    ORIGIN: "Origin",
    DEST: "Dest",
    HUB: "Hub",
}

export function WeatherWidget() {
    const [ports, setPorts] = useState<WeatherPort[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let cancelled = false
        fetch("/api/dashboard/weather", { cache: "no-store" })
            .then(r => r.ok ? r.json() : { ports: [] })
            .then(d => {
                if (!cancelled && Array.isArray(d.ports)) setPorts(d.ports)
            })
            .catch(() => { /* widget renders empty state */ })
            .finally(() => { if (!cancelled) setLoading(false) })
        return () => { cancelled = true }
    }, [])

    return (
        <Card className="col-span-1 border-slate-200/50 dark:border-slate-800/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-slate-500">Key Port Weather</CardTitle>
                <Sun className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                    </div>
                ) : ports.length === 0 ? (
                    <div className="text-xs text-slate-500 py-4 leading-relaxed">
                        No ports configured yet.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {ports.map(p => {
                            const Icon = ICONS[p.conditionKind]
                            const iconColor = ICON_COLORS[p.conditionKind]
                            return (
                                <div key={p.id} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800">
                                            <Icon className={`h-4 w-4 ${iconColor}`} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{p.cityName}</span>
                                            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                                                {ROLE_LABEL[p.role]}
                                                {p.condition && p.condition !== "—" ? ` · ${p.condition}` : ""}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                        {p.tempC !== null ? `${Math.round(p.tempC)}°C` : "—"}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
