import { CloudRain, CloudSun, Sun } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const locations = [
    {
        city: "Cape Town",
        temp: "24°C",
        condition: "Sunny",
        icon: Sun,
        color: "text-orange-500",
        label: "Origin",
    },
    {
        city: "London",
        temp: "11°C",
        condition: "Rain",
        icon: CloudRain,
        color: "text-blue-400",
        label: "Dest",
    },
    {
        city: "Ashdod",
        temp: "19°C",
        condition: "Partly Cloudy",
        icon: CloudSun,
        color: "text-yellow-500",
        label: "Dest",
    },
]

export function WeatherWidget() {
    return (
        <Card className="col-span-1 border-slate-200/50 dark:border-slate-800/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-slate-500">Key Port Weather</CardTitle>
                <Sun className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {locations.map((loc) => (
                        <div key={loc.city} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800">
                                    <loc.icon className={`h-4 w-4 ${loc.color}`} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{loc.city}</span>
                                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">{loc.label}</span>
                                </div>
                            </div>
                            <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                {loc.temp}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
