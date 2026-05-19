"use client"

import { useEffect, useState } from "react"

/**
 * Live ticking clock for the admin Mission Control header. Pinned to
 * Africa/Johannesburg (SAST, UTC+2) so the displayed time matches the
 * timezone our bookings, sailings, and cut-offs are denominated in,
 * regardless of the admin's laptop locale.
 *
 * Renders blank on the first server pass to dodge SSR hydration mismatch
 * (server emits one timestamp, client tick produces another). After mount
 * it updates every second.
 */
export function SystemClock() {
    const [now, setNow] = useState<Date | null>(null)

    useEffect(() => {
        setNow(new Date())
        const id = setInterval(() => setNow(new Date()), 1000)
        return () => clearInterval(id)
    }, [])

    if (!now) {
        return (
            <div className="bg-slate-900 px-4 py-2 rounded border border-slate-800 font-mono text-xs text-slate-400">
                SAST: --:--:--
            </div>
        )
    }

    const time = new Intl.DateTimeFormat("en-ZA", {
        timeZone: "Africa/Johannesburg",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    }).format(now)

    return (
        <div className="bg-slate-900 px-4 py-2 rounded border border-slate-800 font-mono text-xs text-slate-400">
            SAST: {time}
        </div>
    )
}
