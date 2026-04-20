"use client"

import { MapPin, Ship } from "lucide-react"

interface Props {
    route: string // e.g. "ZACPT-NLRTM"
    progressPct: number // 0-100, how far along the journey
    lastPositionLat?: number | null
    lastPositionLng?: number | null
    lastPositionType?: string | null
    lastPositionAt?: string | Date | null
    vesselName?: string | null
}

/**
 * Schematic POL → POD route with a pulsing vessel position.
 * Not a real world map — an abstract progress visualisation.
 */
export function TrackingRoute({ route, progressPct, lastPositionLat, lastPositionLng, lastPositionType, lastPositionAt, vesselName }: Props) {
    const [pol, pod] = route.split("-")
    const clamped = Math.max(0, Math.min(100, progressPct))
    const hasPosition = lastPositionLat != null && lastPositionLng != null

    return (
        <div className="rounded-xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-4">
            <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Vessel Route</p>
                {hasPosition && lastPositionAt && (
                    <p className="text-[10px] text-slate-600 font-mono">
                        Updated {new Date(lastPositionAt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                )}
            </div>

            <div className="relative h-24 px-2">
                {/* Ocean wave background */}
                <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 400 96" preserveAspectRatio="none">
                    <defs>
                        <linearGradient id="wave" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.1" />
                            <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.1" />
                        </linearGradient>
                    </defs>
                    <path d="M0,48 Q50,30 100,48 T200,48 T300,48 T400,48 L400,96 L0,96 Z" fill="url(#wave)" />
                    <path d="M0,56 Q50,42 100,56 T200,56 T300,56 T400,56" stroke="#22d3ee" strokeWidth="0.5" fill="none" opacity="0.4" />
                </svg>

                {/* Route line */}
                <div className="absolute top-1/2 left-6 right-6 h-[2px] bg-slate-700 -translate-y-1/2 rounded-full" />
                <div
                    className="absolute top-1/2 left-6 h-[2px] bg-gradient-to-r from-blue-500 to-cyan-400 -translate-y-1/2 rounded-full"
                    style={{ width: `calc((100% - 48px) * ${clamped / 100})` }}
                />

                {/* POL marker */}
                <div className="absolute top-1/2 left-0 -translate-y-1/2 flex flex-col items-center">
                    <div className="h-6 w-6 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center shadow-[0_0_10px_rgba(52,211,153,0.4)]">
                        <MapPin className="h-3 w-3 text-emerald-300" />
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 mt-1">{pol}</span>
                </div>

                {/* POD marker */}
                <div className="absolute top-1/2 right-0 -translate-y-1/2 flex flex-col items-center">
                    <div className={`h-6 w-6 rounded-full flex items-center justify-center border-2 ${clamped >= 100 ? "bg-emerald-500/20 border-emerald-500 shadow-[0_0_10px_rgba(52,211,153,0.4)]" : "bg-slate-800 border-slate-700"}`}>
                        <MapPin className={`h-3 w-3 ${clamped >= 100 ? "text-emerald-300" : "text-slate-500"}`} />
                    </div>
                    <span className={`text-[10px] font-mono mt-1 ${clamped >= 100 ? "text-emerald-400" : "text-slate-500"}`}>{pod}</span>
                </div>

                {/* Moving vessel */}
                {clamped > 0 && clamped < 100 && (
                    <div
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-700"
                        style={{ left: `calc(24px + (100% - 48px) * ${clamped / 100})` }}
                    >
                        <div className="relative">
                            <div className="absolute inset-0 h-8 w-8 -m-1 rounded-full bg-blue-500/30 animate-ping" />
                            <div className="h-6 w-6 rounded-full bg-blue-500 border-2 border-blue-300 flex items-center justify-center shadow-[0_0_12px_rgba(59,130,246,0.8)]">
                                <Ship className="h-3 w-3 text-white" />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex items-center justify-between mt-3 text-[10px]">
                {vesselName ? (
                    <span className="text-slate-400 font-medium">🚢 {vesselName}</span>
                ) : <span className="text-slate-600 italic">Awaiting vessel assignment</span>}
                {hasPosition && (
                    <span className="text-slate-500 font-mono">
                        {lastPositionLat!.toFixed(3)}°, {lastPositionLng!.toFixed(3)}° {lastPositionType && <span className="text-slate-700">· {lastPositionType}</span>}
                    </span>
                )}
                <span className="text-slate-400 font-bold">{Math.round(clamped)}%</span>
            </div>
        </div>
    )
}
