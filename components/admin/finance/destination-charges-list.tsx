"use client"

import { useState, useEffect } from "react"
import { MOCK_DESTINATION_CHARGES } from "@/lib/mock-data/destination-charges"
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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Plus, Search, MoreVertical, Edit, Copy, ArrowRightLeft } from "lucide-react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"

export function DestinationChargesList() {
    const searchParams = useSearchParams()
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedCurrency, setSelectedCurrency] = useState<string>("all")

    // Handle initial filtering from query params
    useEffect(() => {
        const destId = searchParams.get("destId")
        if (destId) {
            // Try to match by port code (which is what we often use as secondary ID)
            // or just set search term if it's a generic ID
            setSearchTerm(destId.toUpperCase())
        }
    }, [searchParams])

    const filteredCharges = MOCK_DESTINATION_CHARGES.filter((charge) => {
        const matchesSearch = charge.destinationName.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesCurrency = selectedCurrency === "all" || charge.currency === selectedCurrency
        return matchesSearch && matchesCurrency
    })

    const calculateTotals = (chargeId: string) => {
        const charge = MOCK_DESTINATION_CHARGES.find(c => c.id === chargeId)
        if (!charge) return { totalLocal: 0, totalZAR: 0, itemCount: 0 }

        const totalLocal = charge.items.reduce((sum, item) => sum + item.amountLocal, 0)
        const totalZAR = charge.items.reduce((sum, item) => sum + item.amountZAR, 0)

        return { totalLocal, totalZAR, itemCount: charge.items.length }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                        Destination Charges (DAP)
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Manage destination charges for European ports (Delivered at Place)
                    </p>
                </div>
                <Link href="/admin/finance/destination-charges/new">
                    <Button className="bg-brand-blue hover:bg-blue-700">
                        <Plus className="mr-2 h-4 w-4" />
                        New DAP Card
                    </Button>
                </Link>
            </div>

            {/* Filters */}
            <Card className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="relative col-span-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search destinations..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9"
                        />
                    </div>

                    <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                        <SelectTrigger>
                            <SelectValue placeholder="Filter by currency" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Currencies</SelectItem>
                            <SelectItem value="GBP">GBP</SelectItem>
                            <SelectItem value="EUR">EUR</SelectItem>
                            <SelectItem value="USD">USD</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </Card>

            {/* Table */}
            <Card>
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50 dark:bg-slate-900/50">
                            <TableHead>Destination Port</TableHead>
                            <TableHead>Container</TableHead>
                            <TableHead>Currency</TableHead>
                            <TableHead className="text-right">Exchange Rate</TableHead>
                            <TableHead className="text-right">Items</TableHead>
                            <TableHead className="text-right">Total (Local)</TableHead>
                            <TableHead className="text-right">Total (ZAR)</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredCharges.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} className="text-center py-12 text-slate-500">
                                    No destination charges found
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredCharges.map((charge) => {
                                const totals = calculateTotals(charge.id)
                                return (
                                    <TableRow key={charge.id} className="group hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-slate-900 dark:text-white">
                                                    {charge.destinationName}
                                                </span>
                                                <span className="text-xs text-slate-500 font-mono">
                                                    {charge.destinationPortCode}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="font-mono text-xs">
                                                {charge.containerDisplayName}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                className={cn(
                                                    "font-mono font-bold",
                                                    charge.currency === "GBP" && "bg-blue-100 text-blue-700",
                                                    charge.currency === "EUR" && "bg-purple-100 text-purple-700",
                                                    charge.currency === "USD" && "bg-green-100 text-green-700"
                                                )}
                                            >
                                                {charge.currency}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1 text-xs">
                                                <span className="font-mono font-semibold">
                                                    {charge.exchangeRateToZAR.toFixed(2)}
                                                </span>
                                                <ArrowRightLeft className="h-3 w-3 text-slate-400" />
                                                <span className="text-slate-500">ZAR</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <span className="font-mono text-sm font-semibold">
                                                {totals.itemCount}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <span className="font-mono text-sm font-semibold text-blue-600">
                                                {charge.currency} {totals.totalLocal.toLocaleString()}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <span className="font-mono text-sm font-semibold text-emerald-600">
                                                R {totals.totalZAR.toLocaleString()}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                className={cn(
                                                    "font-semibold",
                                                    charge.active
                                                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                                        : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                                                )}
                                            >
                                                {charge.active ? "Active" : "Inactive"}
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
                                                    <DropdownMenuItem asChild>
                                                        <Link href={`/admin/finance/destination-charges/${charge.id}`}>
                                                            <Edit className="mr-2 h-4 w-4" />
                                                            Edit
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem>
                                                        <Copy className="mr-2 h-4 w-4" />
                                                        Clone to New Destination
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
    )
}
