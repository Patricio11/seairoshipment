"use client"

import { useState } from "react"
import { MOCK_OCEAN_FREIGHT, getOceanFreightByCountry } from "@/lib/mock-data/ocean-freight"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown, ChevronRight, Plus, Search, MoreVertical, Edit, Copy, AlertCircle } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

export function OceanFreightGrid() {
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedStatus, setSelectedStatus] = useState<string>("all")
    const [openCountries, setOpenCountries] = useState<string[]>(["UK", "Ireland"])

    // Group by country
    const countries = Array.from(new Set(MOCK_OCEAN_FREIGHT.map(r => r.destinationCountry)))

    const toggleCountry = (country: string) => {
        setOpenCountries(prev =>
            prev.includes(country)
                ? prev.filter(c => c !== country)
                : [...prev, country]
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                        Ocean Freight Rates
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Manage freight rates by route and destination
                    </p>
                </div>
                <Link href="/admin/finance/ocean-freight/new">
                    <Button className="bg-brand-blue hover:bg-blue-700">
                        <Plus className="mr-2 h-4 w-4" />
                        New Freight Rate
                    </Button>
                </Link>
            </div>

            {/* Filters */}
            <Card className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search destinations..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9"
                        />
                    </div>

                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                        <SelectTrigger>
                            <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive / Missing</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button variant="outline" onClick={() => setOpenCountries(countries)}>
                        Expand All Countries
                    </Button>
                </div>
            </Card>

            {/* Grouped by Country */}
            <div className="space-y-4">
                {countries.map((country) => {
                    const countryRates = getOceanFreightByCountry(country).filter((rate) => {
                        if (selectedStatus === "all") return true
                        if (selectedStatus === "active") return rate.active
                        if (selectedStatus === "inactive") return !rate.active
                        return true
                    })

                    if (countryRates.length === 0) return null

                    const isOpen = openCountries.includes(country)
                    const activeCount = countryRates.filter(r => r.active).length
                    const totalCount = countryRates.length

                    return (
                        <Card key={country} className="overflow-hidden">
                            <Collapsible open={isOpen} onOpenChange={() => toggleCountry(country)}>
                                <CollapsibleTrigger className="w-full hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                    <div className="flex items-center justify-between p-4">
                                        <div className="flex items-center gap-3">
                                            {isOpen ? (
                                                <ChevronDown className="h-5 w-5 text-slate-500" />
                                            ) : (
                                                <ChevronRight className="h-5 w-5 text-slate-500" />
                                            )}
                                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                                {country}
                                            </h3>
                                            <Badge variant="outline" className="font-mono text-xs">
                                                {activeCount} / {totalCount} Active
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {activeCount < totalCount && (
                                                <Badge variant="destructive" className="text-xs">
                                                    <AlertCircle className="h-3 w-3 mr-1" />
                                                    Missing Rates
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-slate-50 dark:bg-slate-900/50">
                                                <TableHead>Destination Port</TableHead>
                                                <TableHead>Shipping Line</TableHead>
                                                <TableHead>Container</TableHead>
                                                <TableHead className="text-right">Freight (USD)</TableHead>
                                                <TableHead className="text-right">BAF</TableHead>
                                                <TableHead className="text-right">Surcharges</TableHead>
                                                <TableHead className="text-right">Total USD</TableHead>
                                                <TableHead className="text-right">Total ZAR</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="w-[50px]"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {countryRates.map((rate) => (
                                                <TableRow key={rate.id} className="group hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span className="font-semibold text-slate-900 dark:text-white">
                                                                {rate.destinationPort}
                                                            </span>
                                                            <span className="text-xs text-slate-500 font-mono">
                                                                {rate.destinationPortCode}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className="font-semibold">
                                                            {rate.shippingLine}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="text-xs font-mono">
                                                            {rate.containerDisplayName}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <span className="font-mono text-sm">
                                                            {rate.active ? `$${rate.freightUSD.toLocaleString()}` : "-"}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <span className="font-mono text-sm text-amber-600">
                                                            {rate.active ? `$${rate.bafUSD.toLocaleString()}` : "-"}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <span className="font-mono text-sm text-slate-600">
                                                            {rate.active
                                                                ? `$${(rate.ispsUSD + rate.rcgUSD + rate.otherSurchargesUSD).toLocaleString()}`
                                                                : "-"
                                                            }
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <span className="font-mono text-sm font-bold text-blue-600">
                                                            {rate.active ? `$${rate.totalUSD.toLocaleString()}` : "-"}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <span className="font-mono text-sm font-bold text-emerald-600">
                                                            {rate.active ? `R ${rate.totalZAR.toLocaleString()}` : "-"}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            className={cn(
                                                                "font-semibold",
                                                                rate.active
                                                                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                                                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                                            )}
                                                        >
                                                            {rate.active ? "Active" : "Missing"}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                    <MoreVertical className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem>
                                                                    <Edit className="mr-2 h-4 w-4" />
                                                                    Edit Rate
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem>
                                                                    <Copy className="mr-2 h-4 w-4" />
                                                                    Duplicate
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CollapsibleContent>
                            </Collapsible>
                        </Card>
                    )
                })}
            </div>
        </div>
    )
}
