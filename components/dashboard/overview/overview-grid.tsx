import { CutoffWidget } from "./cutoff-widget"
import { RecentShipments } from "./recent-shipments"
import { StatsCards } from "./stats-cards"
import { WeatherWidget } from "./weather-widget"

export function OverviewGrid() {
    return (
        <div className="flex flex-col gap-6">
            <StatsCards />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <CutoffWidget />
                <WeatherWidget />
                <div className="lg:col-span-2 hidden lg:block rounded-xl border border-dashed border-slate-300 bg-slate-50/50 flex items-center justify-center p-6 text-slate-400 text-sm">
                    Optional: Load Plan Preview or Map Widget
                </div>
            </div>

            <RecentShipments />
        </div>
    )
}
