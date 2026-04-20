"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { MoreVertical, Search, Filter, Eye, Trash2, Edit, Loader2 } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { CreateOriginChargeDialog } from "./create-origin-charge-dialog"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"

interface OriginChargeData {
    id: string
    salesRateTypeId: string | null
    originId: string
    originName: string
    containerId: string
    effectiveFrom: string
    effectiveTo: string | null
    currency: string
    active: boolean
    createdAt: string
    updatedAt: string
    containerDisplayName: string | null
    salesRateTypeName: string | null
    items: { chargeType: string; unitCost: string | null; containerCost: string | null }[]
}

interface ContainerTypeData {
    id: string
    displayName: string
    active: boolean
}

interface LocationData {
    id: string
    name: string
    code: string
}

export function OriginChargesList() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const originIdParam = searchParams.get("originId")
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedOrigin, setSelectedOrigin] = useState<string>(originIdParam?.toLowerCase() ?? "all")
    const [selectedContainer, setSelectedContainer] = useState<string>("all")
    const [selectedStatus, setSelectedStatus] = useState<string>("active")
    const [charges, setCharges] = useState<OriginChargeData[]>([])
    const [containerTypesList, setContainerTypesList] = useState<ContainerTypeData[]>([])
    const [originLocations, setOriginLocations] = useState<LocationData[]>([])
    const [deleteDialog, setDeleteDialog] = useState<OriginChargeData | null>(null)
    const [deleting, setDeleting] = useState(false)
    const [loading, setLoading] = useState(true)

    const fetchCharges = async () => {
        try {
            const [chargesRes, containersRes, locationsRes] = await Promise.all([
                fetch("/api/admin/origin-charges", { cache: "no-store" }),
                fetch("/api/admin/container-types", { cache: "no-store" }),
                fetch("/api/admin/locations?type=ORIGIN", { cache: "no-store" }),
            ])
            if (chargesRes.ok) setCharges(await chargesRes.json())
            if (containersRes.ok) setContainerTypesList(await containersRes.json())
            if (locationsRes.ok) setOriginLocations(await locationsRes.json())
        } catch { /* silently fail */ } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchCharges()
    }, [])

    const handleDelete = async () => {
        if (!deleteDialog) return
        setDeleting(true)
        try {
            const res = await fetch(`/api/admin/origin-charges/${deleteDialog.id}`, { method: "DELETE" })
            if (res.ok) {
                toast.success("Rate card deleted", { description: `${deleteDialog.originName} — ${deleteDialog.containerDisplayName || deleteDialog.containerId}` })
                setDeleteDialog(null)
                fetchCharges()
            } else {
                const data = await res.json()
                toast.error(data.error || "Failed to delete rate card")
            }
        } catch {
            toast.error("Failed to delete rate card")
        } finally {
            setDeleting(false)
        }
    }

    // Filter data
    const filteredCharges = charges.filter((charge) => {
        const matchesSearch = charge.originName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (charge.containerDisplayName || "").toLowerCase().includes(searchTerm.toLowerCase())
        const matchesOrigin = selectedOrigin === "all" || charge.originId === selectedOrigin
        const matchesContainer = selectedContainer === "all" || charge.containerId === selectedContainer
        const matchesStatus = selectedStatus === "all" ||
            (selectedStatus === "active" && charge.active) ||
            (selectedStatus === "inactive" && !charge.active)

        return matchesSearch && matchesOrigin && matchesContainer && matchesStatus
    })

    // Calculate totals matching the editor logic
    const calculateTotal = (charge: OriginChargeData) => {
        if (!charge.items) return { totalPerContainer: 0, totalPerPallet: 0, totalItems: 0 }

        let totalPerContainer = 0

        charge.items.forEach(item => {
            if (item.chargeType === "PER_CONTAINER" && item.containerCost) {
                totalPerContainer += Number(item.containerCost)
            } else if (item.chargeType === "PER_PALLET" && item.unitCost) {
                totalPerContainer += Number(item.unitCost) * 20
            }
        })

        return {
            totalPerContainer,
            totalPerPallet: totalPerContainer / 20,
            totalItems: charge.items.length
        }
    }

    const handleRowClick = (id: string) => {
        router.push(`/admin/finance/origin-charges/${id}`)
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                        Origin Charges (SA Landsides)
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Manage all origin-related charges and fees for South African ports
                    </p>
                </div>
                <CreateOriginChargeDialog />
            </div>

            {/* Filters */}
            <Card className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search charges..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9"
                        />
                    </div>

                    <Select value={selectedOrigin} onValueChange={setSelectedOrigin}>
                        <SelectTrigger>
                            <SelectValue placeholder="Filter by origin" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Origins</SelectItem>
                            {originLocations.map(loc => (
                                <SelectItem key={loc.code} value={loc.code.toLowerCase().slice(2)}>{loc.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={selectedContainer} onValueChange={setSelectedContainer}>
                        <SelectTrigger>
                            <SelectValue placeholder="Filter by container" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Containers</SelectItem>
                            {containerTypesList.filter(c => c.active).map(container => (
                                <SelectItem key={container.id} value={container.id}>
                                    {container.displayName}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                        <SelectTrigger>
                            <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </Card>

            {/* Results Summary */}
            <div className="flex items-center justify-between text-sm text-slate-500">
                <span>Showing {filteredCharges.length} of {charges.length} rate cards</span>
                <span className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    {(selectedOrigin !== "all" || selectedContainer !== "all" || selectedStatus !== "all" || searchTerm) && (
                        <Badge variant="secondary" className="font-normal">
                            Filters active
                        </Badge>
                    )}
                </span>
            </div>

            {/* Table */}
            <Card>
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50 dark:bg-slate-900/50">
                            <TableHead>Origin</TableHead>
                            <TableHead>Container</TableHead>
                            <TableHead>Rate Type</TableHead>
                            <TableHead>Effective Period</TableHead>
                            <TableHead className="text-right">Items</TableHead>
                            <TableHead className="text-right">Total Container Cost</TableHead>
                            <TableHead className="text-right">Equiv. Pallet Cost</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    {Array.from({ length: 9 }).map((_, j) => (
                                        <TableCell key={j}>
                                            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : filteredCharges.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} className="text-center py-12 text-slate-500">
                                    No origin charges found matching your criteria
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredCharges.map((charge) => {
                                const totals = calculateTotal(charge)
                                return (
                                    <TableRow
                                        key={charge.id}
                                        className="group hover:bg-slate-50 dark:hover:bg-slate-900/50 cursor-pointer"
                                        onClick={() => handleRowClick(charge.id)}
                                    >
                                        <TableCell className="font-medium">
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-slate-900 dark:text-white">
                                                    {charge.originName}
                                                </span>
                                                <span className="text-xs text-slate-500">
                                                    ID: {charge.originId.toUpperCase()}
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
                                                {charge.salesRateTypeName || charge.salesRateTypeId}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col text-xs">
                                                <span className="text-slate-900 dark:text-white">
                                                    {new Date(charge.effectiveFrom).toLocaleDateString()}
                                                </span>
                                                <span className="text-slate-500">
                                                    to {charge.effectiveTo ? new Date(charge.effectiveTo).toLocaleDateString() : "Ongoing"}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <span className="font-mono text-sm font-semibold">
                                                {totals.totalItems}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <span className="font-mono text-base font-black text-slate-900 dark:text-white">
                                                R {totals.totalPerContainer.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <span className="font-mono text-sm font-bold text-emerald-600">
                                                R {totals.totalPerPallet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                                                        <Link href={`/admin/finance/origin-charges/${charge.id}`} className="cursor-pointer">
                                                            <Eye className="mr-2 h-4 w-4" />
                                                            View Details
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem asChild>
                                                        <Link href={`/admin/finance/origin-charges/${charge.id}`} className="cursor-pointer">
                                                            <Edit className="mr-2 h-4 w-4" />
                                                            Edit
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/30 cursor-pointer"
                                                        onClick={(e) => { e.stopPropagation(); setDeleteDialog(charge) }}
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

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <Trash2 className="h-5 w-5" />
                            Delete Rate Card
                        </DialogTitle>
                        <DialogDescription>
                            Are you sure you want to permanently delete the <strong>{deleteDialog?.originName}</strong> rate card
                            ({deleteDialog?.containerDisplayName || deleteDialog?.containerId})?
                            This will also delete all {deleteDialog?.items?.length || 0} charge items.
                            This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDeleteDialog(null)} disabled={deleting}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                            {deleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</> : <><Trash2 className="mr-2 h-4 w-4" /> Delete Rate Card</>}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
