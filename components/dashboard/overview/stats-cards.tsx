import { ArrowUpRight, ArrowDownRight, Package, AlertCircle, CreditCard, Activity } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const stats = [
    {
        title: "Active Shipments",
        value: "14",
        change: "+2 this week",
        trend: "up",
        icon: Package,
        color: "text-brand-blue",
    },
    {
        title: "Pending Tasks",
        value: "3",
        change: "Requires attention",
        trend: "warning",
        icon: AlertCircle,
        color: "text-amber-500",
    },
    {
        title: "Monthly Spend",
        value: "$12,450",
        change: "+12% vs last month",
        trend: "up",
        icon: CreditCard,
        color: "text-emerald-500",
    },
    {
        title: "Avg. Transit Time",
        value: "18 Days",
        change: "-2 days (faster)",
        trend: "down", // Good for time
        icon: Activity,
        color: "text-purple-500",
    },
]

export function StatsCards() {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, index) => (
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
                        <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stat.value}</div>
                        <div className="flex items-center text-xs text-muted-foreground mt-1">
                            {stat.trend === "up" && <ArrowUpRight className="mr-1 h-3 w-3 text-emerald-500" />}
                            {stat.trend === "down" && <ArrowDownRight className="mr-1 h-3 w-3 text-emerald-500" />}
                            {stat.trend === "warning" && <AlertCircle className="mr-1 h-3 w-3 text-amber-500" />}
                            <span className={stat.trend === "warning" ? "text-amber-500 font-medium" : ""}>
                                {stat.change}
                            </span>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
