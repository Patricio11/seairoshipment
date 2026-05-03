import Link from "next/link"
import { ArrowLeft, CloudSun } from "lucide-react"
import { DashboardWeatherPortsTable } from "@/components/admin/dashboard-weather-ports-table"

export const dynamic = "force-dynamic"

export default function DashboardWeatherPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <Link
                        href="/admin"
                        className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand-blue mb-3"
                    >
                        <ArrowLeft className="h-3 w-3" />
                        Back to admin dashboard
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center">
                            <CloudSun className="h-6 w-6 text-orange-400" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-white tracking-tight">Dashboard Weather Ports</h1>
                            <p className="text-slate-500 max-w-2xl">
                                Curate the ports shown in the client dashboard&apos;s &ldquo;Key Port Weather&rdquo; widget. Live temperatures auto-refresh hourly via Open-Meteo.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-950/50 p-6">
                <DashboardWeatherPortsTable />
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
                <h3 className="text-sm font-bold text-white mb-2">How this works</h3>
                <ul className="space-y-1.5 text-xs text-slate-400 leading-relaxed">
                    <li>• <strong className="text-slate-300">Curated, not exhaustive</strong> — pick 3–5 ports relevant to current routes. The dashboard shows them in the order you set here.</li>
                    <li>• <strong className="text-slate-300">Live temperatures</strong> are pulled from Open-Meteo (free, no API key) and cached for 1 hour to keep the widget snappy.</li>
                    <li>• <strong className="text-slate-300">Lat/lng tip</strong> — search the city in Google Maps, right-click the port → click the coordinates to copy. 4 decimal places is plenty.</li>
                    <li>• Hide a port without deleting via the active toggle when a route goes quiet; flip it back when you start booking that lane again.</li>
                </ul>
            </div>
        </div>
    )
}
