"use client"

import { useState, useEffect } from "react"
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
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Search, MoreVertical, Edit, Trash2, ArrowRightLeft } from "lucide-react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { CreateDestinationChargeDialog } from "./create-destination-charge-dialog"
import { toast } from "sonner"

interface DestinationChargeData {
    id: string
    destinationId: string
    destinationName: string
    destinationPortCode: string
    containerId: string
    containerDisplayName: string | null
    salesRateTypeId: string | null
    salesRateTypeName: string | null
    currency: string
    exchangeRateToZAR: string
    active: boolean
    items: { amountLocal: string; amountZAR: string }[]
}

export function DestinationChargesList() {
    const searchParams = useSearchParams()
    const destIdParam = searchParams.get("destId")
    const [searchTerm, setSearchTerm] = useState(destIdParam?.toUpperCase() ?? "")
    const [selectedCurrency, setSelectedCurrency] = useState<string>("all")
    const [charges, setCharges] = useState<DestinationChargeData[]>([])
    const [deleteId, setDeleteId] = useState<string | null>(null)
    const [deleting, setDeleting] = useState(false)
    const [loading, setLoading] = useState(true)

    const fetchCharges = async () => {
        try {
            const res = await fetch("/api/admin/destination-charges", { cache: "no-store" })
            if (res.ok) setCharges(await res.json())
        } catch { /* silently fail */ } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchCharges()
    }, [])

    const filteredCharges = charges.filter((charge) => {
        const matchesSearch = charge.destinationName.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesCurrency = selectedCurrency === "all" || charge.currency === selectedCurrency
        return matchesSearch && matchesCurrency
    })

    const calculateTotals = (charge: DestinationChargeData) => {
        if (!charge.items) return { totalLocal: 0, totalZAR: 0, itemCount: 0 }

        const totalLocal = charge.items.reduce((sum, item) => sum + Number(item.amountLocal), 0)
        const totalZAR = charge.items.reduce((sum, item) => sum + Number(item.amountZAR), 0)

        return { totalLocal, totalZAR, itemCount: charge.items.length }
    }

    const handleDelete = async () => {
        if (!deleteId) return
        setDeleting(true)
        try {
            const res = await fetch(`/api/admin/destination-charges/${deleteId}`, { method: "DELETE" })
            if (res.ok) {
                toast.success("Destination charge deleted")
                fetchCharges()
            } else {
                toast.error("Failed to delete destination charge")
            }
        } catch {
            toast.error("Failed to delete destination charge")
        } finally {
            setDeleting(false)
            setDeleteId(null)
        }
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
                <CreateDestinationChargeDialog onSuccess={fetchCharges} />
            </div>

            {/* Delete Confirmation */}
            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Destination Charge</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this destination charge rate card? This will also remove all charge items. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={deleting}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {deleting ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

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
                            <TableHead>Rate Type</TableHead>
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
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    {Array.from({ length: 10 }).map((_, j) => (
                                        <TableCell key={j}>
                                            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : filteredCharges.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={10} className="text-center py-12 text-slate-500">
                                    No destination charges found
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredCharges.map((charge) => {
                                const totals = calculateTotals(charge)
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
                                                {charge.containerDisplayName || charge.containerId}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className="bg-brand-blue text-white">
                                                {charge.salesRateTypeName || charge.salesRateTypeId || "—"}
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
                                                    {Number(charge.exchangeRateToZAR).toFixed(2)}
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
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        onClick={() => setDeleteId(charge.id)}
                                                        className="text-red-600 focus:text-red-600"
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Delete
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
