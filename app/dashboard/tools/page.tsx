import Link from "next/link"
import { Wrench, Calculator, Scale, Box, MapPin, FileQuestion, Compass, ArrowRight } from "lucide-react"

export const metadata = {
    title: "Tools",
}

interface Tool {
    name: string
    description: string
    href: string
    icon: typeof Calculator
    iconColor: string
    available: boolean
    badge?: string
}

const TOOLS: Tool[] = [
    {
        name: "CBM Calculator",
        description: "Measure cargo in cubic metres, see how it fits in 20ft / 40ft / 40ft HC containers, save calculations to reuse when booking.",
        href: "/dashboard/tools/cbm-calculator",
        icon: Calculator,
        iconColor: "text-brand-blue",
        available: true,
    },
    {
        name: "Chargeable Weight",
        description: "Compare actual gross weight against volumetric weight across sea, air, and road. Spot which mode is cheapest.",
        href: "#",
        icon: Scale,
        iconColor: "text-purple-500",
        available: false,
        badge: "Coming soon",
    },
    {
        name: "Container Loading Planner",
        description: "3D bin-packing with weight distribution, door clearance, and stacking constraints. The heavyweight version of our CBM viz.",
        href: "#",
        icon: Box,
        iconColor: "text-emerald-500",
        available: false,
        badge: "Coming soon",
    },
    {
        name: "ETA Calculator",
        description: "Pick a route + sailing, get an estimated delivery date that factors in transit time, port congestion buffer, and onward truck.",
        href: "#",
        icon: MapPin,
        iconColor: "text-amber-500",
        available: false,
        badge: "Coming soon",
    },
    {
        name: "HS Code Lookup",
        description: "Curated harmonized codes for common South African export commodities, with PPECB and phyto notes per code.",
        href: "#",
        icon: FileQuestion,
        iconColor: "text-cyan-500",
        available: false,
        badge: "Coming soon",
    },
    {
        name: "Incoterms Comparison",
        description: "Side-by-side responsibility and cost split for DAP, FOB, CIF, EXW, and the other ten incoterms.",
        href: "#",
        icon: Compass,
        iconColor: "text-pink-500",
        available: false,
        badge: "Coming soon",
    },
]

export default function ToolsHubPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                    <Wrench className="h-6 w-6 text-brand-blue" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                        Tools
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Calculators and utilities built for cold-chain and shared-container exporters.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {TOOLS.map(tool => (
                    <ToolCard key={tool.name} tool={tool} />
                ))}
            </div>
        </div>
    )
}

function ToolCard({ tool }: { tool: Tool }) {
    const Icon = tool.icon
    const baseClass = "group block rounded-2xl border bg-white dark:bg-slate-950 p-5 transition-all"
    const availableClass = "border-slate-200 dark:border-slate-800 hover:border-brand-blue/40 hover:shadow-md"
    const disabledClass = "border-dashed border-slate-200 dark:border-slate-800 opacity-60 cursor-not-allowed"

    const inner = (
        <>
            <div className="flex items-start justify-between gap-3">
                <div className={`h-10 w-10 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center ${tool.iconColor}`}>
                    <Icon className="h-5 w-5" />
                </div>
                {tool.badge && (
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-800">
                        {tool.badge}
                    </span>
                )}
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">{tool.name}</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 leading-snug">
                {tool.description}
            </p>
            {tool.available && (
                <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-brand-blue">
                    Open
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </div>
            )}
        </>
    )

    return tool.available ? (
        <Link href={tool.href} className={`${baseClass} ${availableClass}`}>{inner}</Link>
    ) : (
        <div className={`${baseClass} ${disabledClass}`}>{inner}</div>
    )
}
