"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Plus,
    Ship,
    Container,
    Package,
    Users,
    Loader2,
    ExternalLink,
    AlertTriangle,
    MoreVertical,
    Pencil,
    Trash2,
    Search,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"

interface ContainerAllocation {
    allocation: {
        id: string
        palletCount: number
        commodityName: string | null
        hsCode: string | null
        nettWeight: string | null
        grossWeight: string | null
        temperature: string | null
        consigneeName: string | null
        status: string
    }
    userName: string | null
    userEmail: string | null
    accountNumber: string | null
}

interface ContainerData {
    id: string
    route: string
    vessel: string
    voyageNumber: string | null
    type: string
    etd: string | null
    eta: string | null
    totalPallets: number
    maxCapacity: number
    status: string
    metashipOrderNo: string | null
    metashipReference: string | null
    createdAt: string
    allocations: ContainerAllocation[]
}

interface LocationOption {
    id: string
    name: string
    code: string
    country: string
    type: string
}

interface ContainerForm {
    origin: string
    destination: string
    vessel: string
    voyageNumber: string
    type: "20FT" | "40FT"
    etd: string
    eta: string
    maxCapacity: number
}

const STATUS_COLORS: Record<string, string> = {
    OPEN: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    THRESHOLD_REACHED: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    BOOKED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    SAILING: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    DELIVERED: "bg-slate-500/10 text-slate-400 border-slate-500/20",
}

const EMPTY_FORM: ContainerForm = {
    origin: "",
    destination: "",
    vessel: "",
    voyageNumber: "",
    type: "40FT",
    etd: "",
    eta: "",
    maxCapacity: 20,
}

export function FleetScheduler() {
    const [containerData, setContainerData] = useState<ContainerData[]>([])
    const [loading, setLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")

    // Create/Edit dialog
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingContainer, setEditingContainer] = useState<ContainerData | null>(null)
    const [formData, setFormData] = useState<ContainerForm>(EMPTY_FORM)
    const [saving, setSaving] = useState(false)

    // Delete confirmation
    const [deleteDialog, setDeleteDialog] = useState<ContainerData | null>(null)
    const [deleting, setDeleting] = useState(false)

    // MetaShip booking dialog
    const [bookingDialog, setBookingDialog] = useState<ContainerData | null>(null)
    const [creatingBooking, setCreatingBooking] = useState(false)

    // Locations for route selection
    const [originLocations, setOriginLocations] = useState<LocationOption[]>([])
    const [destinationLocations, setDestinationLocations] = useState<LocationOption[]>([])

    const fetchContainers = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch("/api/admin/containers")
            if (res.ok) {
                setContainerData(await res.json())
            }
        } catch {
            console.error("Failed to fetch containers")
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchContainers()
        async function fetchLocations() {
            try {
                const [origRes, destRes] = await Promise.all([
                    fetch("/api/admin/locations?type=ORIGIN"),
                    fetch("/api/admin/locations?type=DESTINATION"),
                ])
                if (origRes.ok) setOriginLocations(await origRes.json())
                if (destRes.ok) setDestinationLocations(await destRes.json())
            } catch {
                console.error("Failed to fetch locations")
            }
        }
        fetchLocations()
    }, [fetchContainers])

    const filteredContainers = containerData.filter(c =>
        c.route.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.vessel.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.id.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const handleOpenCreate = () => {
        setEditingContainer(null)
        setFormData(EMPTY_FORM)
        setDialogOpen(true)
    }

    const handleOpenEdit = (container: ContainerData) => {
        setEditingContainer(container)
        const [origin, destination] = container.route.split("-")
        setFormData({
            origin: origin || "",
            destination: destination || "",
            vessel: container.vessel,
            voyageNumber: container.voyageNumber || "",
            type: container.type as "20FT" | "40FT",
            etd: container.etd ? new Date(container.etd).toISOString().split("T")[0] : "",
            eta: container.eta ? new Date(container.eta).toISOString().split("T")[0] : "",
            maxCapacity: container.maxCapacity,
        })
        setDialogOpen(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.origin || !formData.destination || !formData.vessel) {
            toast.error("Origin, destination, and vessel are required")
            return
        }

        setSaving(true)
        try {
            const route = `${formData.origin}-${formData.destination}`
            const isEdit = !!editingContainer

            const res = await fetch(
                isEdit ? `/api/admin/containers/${editingContainer!.id}` : "/api/admin/containers",
                {
                    method: isEdit ? "PUT" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        route,
                        vessel: formData.vessel,
                        voyageNumber: formData.voyageNumber || null,
                        type: formData.type,
                        etd: formData.etd || null,
                        eta: formData.eta || null,
                        maxCapacity: formData.maxCapacity,
                    }),
                }
            )

            if (res.ok) {
                toast.success(isEdit ? "Container Updated" : "Container Created", {
                    description: `${route} — ${formData.vessel} (${formData.type})`,
                })
                setDialogOpen(false)
                fetchContainers()
            } else {
                const data = await res.json()
                toast.error(data.error || "Failed to save container")
            }
        } catch {
            toast.error("Failed to save container")
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!deleteDialog) return
        setDeleting(true)
        try {
            const res = await fetch(`/api/admin/containers/${deleteDialog.id}`, { method: "DELETE" })
            if (res.ok) {
                toast.success("Container Deleted", { description: deleteDialog.id })
                setDeleteDialog(null)
                fetchContainers()
            } else {
                const data = await res.json()
                toast.error(data.error || "Failed to delete container")
            }
        } catch {
            toast.error("Failed to delete container")
        } finally {
            setDeleting(false)
        }
    }

    const handleCreateMetaShipBooking = async (container: ContainerData) => {
        setCreatingBooking(true)
        try {
            const res = await fetch(`/api/admin/containers/${container.id}/book`, { method: "POST" })
            const data = await res.json()
            if (!res.ok) {
                toast.error(data.error || "Failed to create MetaShip booking")
                return
            }
            toast.success("MetaShip Booking Created!", {
                description: `Order #${data.orderNo} — Log in to MetaShip to confirm.`,
                duration: 8000,
            })
            setBookingDialog(null)
            fetchContainers()
        } catch {
            toast.error("Failed to create MetaShip booking")
        } finally {
            setCreatingBooking(false)
        }
    }

    const handleTypeChange = (val: "20FT" | "40FT") => {
        setFormData(prev => ({
            ...prev,
            type: val,
            maxCapacity: val === "20FT" ? 10 : 20,
        }))
    }

    return (
        <div className="space-y-6">
            {/* Header Bar */}
            <div className="flex flex-col sm:flex-row justify-between gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                <div className="flex items-center gap-4 text-sm text-slate-400">
                    <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500" /> Open</span>
                    <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-500" /> Threshold</span>
                    <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Booked</span>
                    <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-purple-500" /> Sailing</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <Input
                            placeholder="Search route, vessel, ID..."
                            className="pl-10 h-9 bg-slate-950 border-slate-800 text-white focus:ring-1 focus:ring-slate-700"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-9"
                        onClick={handleOpenCreate}
                    >
                        <Plus className="mr-2 h-4 w-4" /> Create Container
                    </Button>
                </div>
            </div>

            {/* Container List */}
            {loading ? (
                <div className="flex items-center justify-center py-20 text-slate-500">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    Loading containers...
                </div>
            ) : filteredContainers.length === 0 ? (
                <div className="text-center py-20 text-slate-500">
                    <Container className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="font-bold">No containers yet</p>
                    <p className="text-sm mt-1">Create your first container to get started.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    <AnimatePresence>
                        {filteredContainers.map((container, i) => (
                            <motion.div
                                key={container.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-all"
                            >
                                <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20">
                                            <Container className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-white flex items-center gap-2">
                                                {container.route}
                                                <Badge className={STATUS_COLORS[container.status] || STATUS_COLORS.OPEN}>
                                                    {container.status.replace("_", " ")}
                                                </Badge>
                                            </h3>
                                            <p className="text-slate-500 text-sm font-medium">
                                                {container.vessel} • {container.type} • {container.id}
                                                {container.voyageNumber && ` • V/${container.voyageNumber}`}
                                            </p>
                                            {(container.etd || container.eta) && (
                                                <p className="text-slate-600 text-xs font-mono mt-0.5">
                                                    {container.etd && `ETD: ${new Date(container.etd).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`}
                                                    {container.etd && container.eta && " — "}
                                                    {container.eta && `ETA: ${new Date(container.eta).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {/* Pallet counter */}
                                        <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2">
                                            <Package className="h-4 w-4 text-slate-500" />
                                            <span className={`text-2xl font-black ${container.totalPallets >= 15 ? "text-amber-400" : "text-white"}`}>
                                                {container.totalPallets}
                                            </span>
                                            <span className="text-slate-500 text-sm">/ {container.maxCapacity}</span>
                                        </div>

                                        {container.status === "THRESHOLD_REACHED" && !container.metashipOrderNo && (
                                            <Button
                                                className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
                                                onClick={() => setBookingDialog(container)}
                                            >
                                                <Ship className="mr-2 h-4 w-4" />
                                                Create MetaShip Booking
                                            </Button>
                                        )}

                                        {container.metashipOrderNo && (
                                            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 gap-1">
                                                <ExternalLink className="h-3 w-3" />
                                                Order #{container.metashipOrderNo}
                                            </Badge>
                                        )}

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="text-slate-500 hover:text-white">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent className="bg-slate-950 border-slate-800 text-white">
                                                <DropdownMenuItem
                                                    className="focus:bg-slate-900 focus:text-white cursor-pointer gap-2"
                                                    onClick={() => handleOpenEdit(container)}
                                                >
                                                    <Pencil className="h-4 w-4" /> Edit Container
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    className="focus:bg-red-950 focus:text-red-400 text-red-400 cursor-pointer gap-2"
                                                    onClick={() => setDeleteDialog(container)}
                                                    disabled={container.totalPallets > 0 || container.status !== "OPEN"}
                                                >
                                                    <Trash2 className="h-4 w-4" /> Delete Container
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>

                                {/* Pallet progress bar */}
                                <div className="mb-4">
                                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all ${
                                                container.totalPallets >= 15 ? "bg-amber-500" : "bg-blue-500"
                                            }`}
                                            style={{ width: `${(container.totalPallets / container.maxCapacity) * 100}%` }}
                                        />
                                    </div>
                                    {container.totalPallets >= 15 && !container.metashipOrderNo && (
                                        <div className="flex items-center gap-1 mt-2 text-amber-400 text-xs font-bold">
                                            <AlertTriangle className="h-3 w-3" />
                                            Threshold reached — ready for MetaShip booking
                                        </div>
                                    )}
                                </div>

                                {/* Allocations table */}
                                {container.allocations.length > 0 && (
                                    <div className="rounded-lg border border-slate-800 overflow-hidden">
                                        <Table>
                                            <TableHeader className="bg-slate-950">
                                                <TableRow className="hover:bg-transparent border-slate-800">
                                                    <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                                                        <div className="flex items-center gap-1"><Users className="h-3 w-3" /> Client</div>
                                                    </TableHead>
                                                    <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Account</TableHead>
                                                    <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Product</TableHead>
                                                    <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-[10px] text-center">Pallets</TableHead>
                                                    <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-[10px] text-center">Weight (kg)</TableHead>
                                                    <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-[10px] text-center">Status</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {container.allocations.map((alloc) => (
                                                    <TableRow key={alloc.allocation.id} className="border-slate-800 hover:bg-slate-900/40">
                                                        <TableCell className="text-slate-300 font-medium">{alloc.userName || "—"}</TableCell>
                                                        <TableCell className="font-mono text-xs text-slate-400">{alloc.accountNumber || "—"}</TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-col">
                                                                <span className="text-xs text-white font-bold">{alloc.allocation.commodityName || "—"}</span>
                                                                {alloc.allocation.hsCode && (
                                                                    <span className="text-[10px] text-slate-500 font-mono">HS: {alloc.allocation.hsCode}</span>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center text-white font-black">{alloc.allocation.palletCount}</TableCell>
                                                        <TableCell className="text-center text-xs text-slate-400">
                                                            {alloc.allocation.nettWeight ? `${alloc.allocation.nettWeight}N` : "—"} / {alloc.allocation.grossWeight ? `${alloc.allocation.grossWeight}G` : "—"}
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <Badge className={
                                                                alloc.allocation.status === "CONFIRMED"
                                                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                                                    : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                                                            }>
                                                                {alloc.allocation.status}
                                                            </Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Create / Edit Container Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent
                    className="sm:max-w-[500px] bg-slate-950 border-slate-800 text-white"
                    onInteractOutside={(e) => e.preventDefault()}
                    onEscapeKeyDown={(e) => e.preventDefault()}
                >
                    <form onSubmit={handleSubmit}>
                        <DialogHeader>
                            <DialogTitle className="text-xl font-black tracking-tight flex items-center gap-2">
                                <Container className="h-5 w-5 text-blue-500" />
                                {editingContainer ? "EDIT CONTAINER" : "CREATE CONTAINER"}
                            </DialogTitle>
                            <DialogDescription className="text-slate-400 font-mono text-[10px] uppercase tracking-widest">
                                {editingContainer ? `Editing ${editingContainer.id}` : "Define Route, Vessel & Container Type"}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-6 border-y border-slate-800/50 my-4">
                            {/* Route */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Origin Port</Label>
                                    <Select value={formData.origin} onValueChange={(v) => setFormData({ ...formData, origin: v })}>
                                        <SelectTrigger className="bg-slate-900 border-slate-800 h-9 text-sm">
                                            <SelectValue placeholder="Select Origin" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                            {originLocations.map(loc => (
                                                <SelectItem key={loc.id} value={loc.code}>{loc.name} ({loc.code})</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Destination Port</Label>
                                    <Select value={formData.destination} onValueChange={(v) => setFormData({ ...formData, destination: v })}>
                                        <SelectTrigger className="bg-slate-900 border-slate-800 h-9 text-sm">
                                            <SelectValue placeholder="Select Destination" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                            {destinationLocations.map(loc => (
                                                <SelectItem key={loc.id} value={loc.code}>{loc.name} ({loc.code})</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Vessel + Voyage */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Vessel Name</Label>
                                    <Input
                                        value={formData.vessel}
                                        onChange={(e) => setFormData({ ...formData, vessel: e.target.value })}
                                        placeholder="MSC Orchestra"
                                        className="bg-slate-900 border-slate-800 h-9 text-sm"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Voyage Number</Label>
                                    <Input
                                        value={formData.voyageNumber}
                                        onChange={(e) => setFormData({ ...formData, voyageNumber: e.target.value })}
                                        placeholder="Optional"
                                        className="bg-slate-900 border-slate-800 h-9 text-sm"
                                    />
                                </div>
                            </div>

                            {/* Type + Capacity */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Container Type</Label>
                                    <Select value={formData.type} onValueChange={handleTypeChange}>
                                        <SelectTrigger className="bg-slate-900 border-slate-800 h-9 text-sm">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                            <SelectItem value="40FT">40FT Reefer</SelectItem>
                                            <SelectItem value="20FT">20FT Reefer</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Max Capacity (Pallets)</Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        value={formData.maxCapacity}
                                        onChange={(e) => setFormData({ ...formData, maxCapacity: parseInt(e.target.value) || 0 })}
                                        className="bg-slate-900 border-slate-800 h-9 text-sm font-mono"
                                    />
                                </div>
                            </div>

                            {/* Dates */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">ETD (Departure)</Label>
                                    <Input
                                        type="date"
                                        value={formData.etd}
                                        onChange={(e) => setFormData({ ...formData, etd: e.target.value })}
                                        className="bg-slate-900 border-slate-800 h-9 text-sm"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">ETA (Arrival)</Label>
                                    <Input
                                        type="date"
                                        value={formData.eta}
                                        onChange={(e) => setFormData({ ...formData, eta: e.target.value })}
                                        className="bg-slate-900 border-slate-800 h-9 text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="gap-2">
                            <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="text-slate-400 hover:text-white hover:bg-slate-900">
                                CANCEL
                            </Button>
                            <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white font-black px-8">
                                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                {saving ? "SAVING..." : editingContainer ? "UPDATE CONTAINER" : "CREATE CONTAINER"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
                <DialogContent className="bg-slate-950 border-slate-800 text-white max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black">Delete Container</DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Are you sure you want to delete container <span className="font-mono text-white">{deleteDialog?.id}</span>?
                            This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDeleteDialog(null)} className="text-slate-400">Cancel</Button>
                        <Button
                            className="bg-red-600 hover:bg-red-700 font-bold"
                            disabled={deleting}
                            onClick={handleDelete}
                        >
                            {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                            {deleting ? "Deleting..." : "Delete Container"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* MetaShip Booking Confirmation Dialog */}
            <Dialog open={!!bookingDialog} onOpenChange={() => setBookingDialog(null)}>
                <DialogContent className="bg-slate-950 border-slate-800 text-white max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black">Create MetaShip Booking</DialogTitle>
                        <DialogDescription className="text-slate-400">
                            This will create a consolidated booking in MetaShip for all client allocations on this container.
                        </DialogDescription>
                    </DialogHeader>

                    {bookingDialog && (
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="bg-slate-900 rounded-lg p-3 border border-slate-800">
                                    <p className="text-[10px] font-bold uppercase text-slate-500">Route</p>
                                    <p className="text-white font-black">{bookingDialog.route}</p>
                                </div>
                                <div className="bg-slate-900 rounded-lg p-3 border border-slate-800">
                                    <p className="text-[10px] font-bold uppercase text-slate-500">Vessel</p>
                                    <p className="text-white font-black">{bookingDialog.vessel}</p>
                                </div>
                                <div className="bg-slate-900 rounded-lg p-3 border border-slate-800">
                                    <p className="text-[10px] font-bold uppercase text-slate-500">Total Pallets</p>
                                    <p className="text-amber-400 font-black text-lg">{bookingDialog.totalPallets}</p>
                                </div>
                                <div className="bg-slate-900 rounded-lg p-3 border border-slate-800">
                                    <p className="text-[10px] font-bold uppercase text-slate-500">Clients</p>
                                    <p className="text-white font-black text-lg">{bookingDialog.allocations.length}</p>
                                </div>
                            </div>

                            <div className="bg-slate-900 rounded-lg border border-slate-800 p-3">
                                <p className="text-[10px] font-bold uppercase text-slate-500 mb-2">Client Allocations</p>
                                {bookingDialog.allocations.map((alloc) => (
                                    <div key={alloc.allocation.id} className="flex justify-between items-center py-1.5 border-b border-slate-800 last:border-0 text-sm">
                                        <span className="text-slate-300">{alloc.userName} <span className="text-slate-600 font-mono text-xs">({alloc.accountNumber})</span></span>
                                        <span className="text-white font-bold">{alloc.allocation.palletCount} pallets</span>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex items-start gap-2">
                                <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                                <p className="text-xs text-amber-300">
                                    After creating the booking, log in to MetaShip to review and confirm it.
                                </p>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setBookingDialog(null)} className="text-slate-400">Cancel</Button>
                        <Button
                            className="bg-amber-600 hover:bg-amber-700 font-bold"
                            disabled={creatingBooking}
                            onClick={() => bookingDialog && handleCreateMetaShipBooking(bookingDialog)}
                        >
                            {creatingBooking ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</>
                            ) : (
                                <><Ship className="mr-2 h-4 w-4" /> Confirm & Create Booking</>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
