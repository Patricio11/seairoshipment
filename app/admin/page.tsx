import { Activity, AlertTriangle, Ship, Users, ArrowUpRight, CheckCircle2, FileText, TrendingUp, DollarSign } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export default function AdminDashboardPage() {
    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tighter">MISSION CONTROL</h1>
                    <p className="text-slate-500 font-mono text-sm mt-1">SYSTEM STATUS: <span className="text-emerald-500">NOMINAL</span></p>
                </div>
                <div className="bg-slate-900 px-4 py-2 rounded border border-slate-800 font-mono text-xs text-slate-400">
                    UTC: 14:12:45Z
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: "Active Shipments", value: "1,204", icon: Ship, color: "text-blue-500", trend: "+12%" },
                    { label: "Pending Vetting", value: "14", icon: Users, color: "text-amber-500", trend: "+2" },
                    { label: "Critical Alerts", value: "3", icon: AlertTriangle, color: "text-red-500", trend: "-1" },
                    { label: "Revenue (MTD)", value: "R 2.4M", icon: DollarSign, color: "text-emerald-500", trend: "+8.5%" },
                ].map((stat) => (
                    <div key={stat.label} className="bg-slate-900/50 border border-slate-800 p-6 rounded-xl hover:bg-slate-900 transition-colors group">
                        <div className="flex items-start justify-between mb-4">
                            <stat.icon className={`h-6 w-6 ${stat.color} opacity-80 group-hover:opacity-100`} />
                            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                <TrendingUp className="h-3 w-3" /> {stat.trend}
                            </span>
                        </div>
                        <div className="text-3xl font-black text-white tracking-tight">{stat.value}</div>
                        <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">{stat.label}</div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Shipments Panel */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            <Ship className="h-5 w-5 text-blue-500" />
                            Recent Shipments
                        </h3>
                        <Button variant="ghost" size="sm" className="text-xs text-slate-500 hover:text-white">View All</Button>
                    </div>

                    <div className="space-y-4">
                        {[
                            { id: "SHP-001", route: "CPT → RTM", client: "Global Fruits", status: "AT_SEA" },
                            { id: "SHP-002", route: "DUR → SIN", client: "Oceanic Seafoods", status: "LOADING" },
                            { id: "SHP-003", route: "CPT → LND", client: "Cape Citrus", status: "AT_SEA" },
                        ].map((s) => (
                            <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-slate-800/50">
                                <div className="flex items-center gap-3">
                                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${s.status === 'AT_SEA' ? 'bg-blue-500/10' : 'bg-amber-500/10'}`}>
                                        <Ship className={`h-5 w-5 ${s.status === 'AT_SEA' ? 'text-blue-500' : 'text-amber-500'}`} />
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-white">{s.route}</div>
                                        <div className="text-xs text-slate-500">{s.client}</div>
                                    </div>
                                </div>
                                <Badge className={`
                                    ${s.status === 'AT_SEA' ? 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20' : 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20'}
                                    border-none
                                `}>
                                    {s.status.replace('_', ' ')}
                                </Badge>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Financial Growth Panel */}
                <div className="space-y-6">
                    {/* Growth Card */}
                    <div className="bg-gradient-to-br from-indigo-900 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl -mr-16 -mt-16" />

                        <div className="relative z-10 flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-indigo-100 flex items-center gap-2 mb-1">
                                    <Activity className="h-5 w-5 text-indigo-400" />
                                    Financial Growth
                                </h3>
                                <p className="text-xs text-indigo-300/70">Based on paid invoices vs last month</p>
                            </div>
                            <div className="bg-indigo-500/20 p-2 rounded-lg">
                                <ArrowUpRight className="h-6 w-6 text-indigo-400" />
                            </div>
                        </div>

                        <div className="relative z-10 mt-6 flex items-baseline gap-4">
                            <span className="text-4xl font-black text-white">+24.8%</span>
                            <span className="text-sm font-bold text-indigo-300">Revenue Velocity</span>
                        </div>

                        {/* Mini Chart Visualization */}
                        <div className="mt-4 flex gap-1 h-8 items-end">
                            {[40, 65, 55, 80, 70, 90, 100].map((h, i) => (
                                <div key={i} className="flex-1 bg-indigo-500/40 rounded-t-sm hover:bg-indigo-400 transition-colors" style={{ height: `${h}%` }} />
                            ))}
                        </div>
                    </div>

                    {/* Recent Invoices */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <FileText className="h-5 w-5 text-emerald-500" />
                                Recent Paid Invoices
                            </h3>
                        </div>
                        <div className="space-y-3">
                            {[
                                { id: "INV-991", client: "Tech Imports", amount: "R 156k", date: "Today" },
                                { id: "INV-990", client: "Global Fruits", amount: "R 45k", date: "Yesterday" },
                            ].map((inv) => (
                                <div key={inv.id} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-3">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                        <div>
                                            <span className="text-white font-medium">{inv.client}</span>
                                            <span className="text-slate-500 text-xs ml-2">{inv.id}</span>
                                        </div>
                                    </div>
                                    <div className="text-emerald-400 font-mono font-bold">{inv.amount}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
