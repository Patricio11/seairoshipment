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
    Calendar,
    Copy,
    Check,
    Eye,
    Thermometer,
    Weight,
    MapPin,
    Anchor,
    Snowflake,
    Sun,
    Apple,
    ChevronsUpDown,
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
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

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
    sailingId: string | null
    sailingVessel: string | null
    sailingVoyage: string | null
    type: string
    containerTypeId: string | null
    containerTypeName: string | null
    productId: string | null
    productName: string | null
    temperature: string | null
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

interface ContainerTypeOption {
    id: string
    displayName: string
    size: string
    type: string
    maxPallets: number
    active: boolean
}

interface SailingOption {
    id: string
    vesselName: string
    voyageNumber: string
    portOfLoadValue: string
    portOfLoadCity: string
    portOfDischargeValue: string
    portOfDischargeCity: string
    etd: string
    eta: string | null
    serviceType: string | null
    active: boolean
}

interface ProductOption {
    id: string
    name: string
    hsCode: string
    category: string | null
    active: boolean
}

interface ContainerForm {
    origin: string
    destination: string
    sailingId: string
    containerTypeId: string
    temperature: "frozen" | "chilled" | "ambient" | ""
    productId: string
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
    sailingId: "",
    containerTypeId: "40ft-reefer-hc",
    temperature: "",
    productId: "",
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
    const [copiedId, setCopiedId] = useState<string | null>(null)
    const [detailDialog, setDetailDialog] = useState<ContainerData | null>(null)

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text)
        setCopiedId(id)
        toast.success("Copied to clipboard")
        setTimeout(() => setCopiedId(null), 2000)
    }

    // Locations for route selection
    const [originLocations, setOriginLocations] = useState<LocationOption[]>([])
    const [destinationLocations, setDestinationLocations] = useState<LocationOption[]>([])
    const [containerTypeOptions, setContainerTypeOptions] = useState<ContainerTypeOption[]>([])
    const [sailingOptions, setSailingOptions] = useState<SailingOption[]>([])
    const [productOptions, setProductOptions] = useState<ProductOption[]>([])
    const [productSearch, setProductSearch] = useState("")

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
        async function fetchReferenceData() {
            try {
                const [origRes, destRes, ctRes, sailRes, prodRes] = await Promise.all([
                    fetch("/api/admin/locations?type=ORIGIN"),
                    fetch("/api/admin/locations?type=DESTINATION"),
                    fetch("/api/admin/container-types"),
                    fetch("/api/admin/sailings"),
                    fetch("/api/admin/products"),
                ])
                if (origRes.ok) setOriginLocations(await origRes.json())
                if (destRes.ok) setDestinationLocations(await destRes.json())
                if (ctRes.ok) setContainerTypeOptions(await ctRes.json())
                if (sailRes.ok) setSailingOptions(await sailRes.json())
                if (prodRes.ok) setProductOptions(await prodRes.json())
            } catch {
                console.error("Failed to fetch reference data")
            }
        }
        fetchReferenceData()
    }, [fetchContainers])

    const filteredContainers = containerData.filter(c =>
        c.route.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.vessel.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.metashipOrderNo && c.metashipOrderNo.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.voyageNumber && c.voyageNumber.toLowerCase().includes(searchTerm.toLowerCase()))
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
            sailingId: container.sailingId || "",
            containerTypeId: container.containerTypeId || "40ft-reefer-hc",
            temperature: (container.temperature as "frozen" | "chilled" | "ambient" | null) || "",
            productId: container.productId || "",
            maxCapacity: container.maxCapacity,
        })
        setDialogOpen(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.origin || !formData.destination) {
            toast.error("Origin and destination are required")
            return
        }
        if (!formData.sailingId) {
            toast.error("Select a sailing")
            return
        }
        if (!formData.temperature) {
            toast.error("Select a temperature")
            return
        }
        if (!formData.productId) {
            toast.error("Select a product")
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
                        sailingId: formData.sailingId,
                        containerTypeId: formData.containerTypeId,
                        temperature: formData.temperature,
                        productId: formData.productId,
                    }),
                }
            )

            if (res.ok) {
                toast.success(isEdit ? "Container Updated" : "Container Created", {
                    description: (() => {
                        const sailing = sailingOptions.find(s => s.id === formData.sailingId)
                        const ctName = containerTypeOptions.find(c => c.id === formData.containerTypeId)?.displayName || "—"
                        const prodName = productOptions.find(p => p.id === formData.productId)?.name || "—"
                        return `${route} — ${sailing?.vesselName || "—"} · ${ctName} · ${prodName}`
                    })(),
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

    const handleCreateMetaShipOrder = async (container: ContainerData) => {
        setCreatingBooking(true)
        try {
            const res = await fetch(`/api/admin/containers/${container.id}/book`, { method: "POST" })
            const data = await res.json()
            if (!res.ok) {
                toast.error(data.error || "Failed to create MetaShip order")
                return
            }
            const docSummary = data.documents
                ? ` | ${data.documents.uploaded}/${data.documents.total} docs uploaded${data.documents.failed > 0 ? ` (${data.documents.failed} failed)` : ""}`
                : ""
            toast.success("MetaShip Order Created!", {
                description: `Order #${data.orderNo}${docSummary} — Log in to MetaShip to review.`,
                duration: 10000,
            })
            setBookingDialog(null)
            fetchContainers()
        } catch {
            toast.error("Failed to create MetaShip order")
        } finally {
            setCreatingBooking(false)
        }
    }

    const handleContainerTypeChange = (ctId: string) => {
        const ct = containerTypeOptions.find(c => c.id === ctId)
        setFormData(prev => {
            const nextTemp: "frozen" | "chilled" | "ambient" | "" = ct?.type === "DRY"
                ? "ambient"
                : (prev.temperature === "ambient" ? "" : prev.temperature)
            return {
                ...prev,
                containerTypeId: ctId,
                maxCapacity: ct?.maxPallets || 20,
                temperature: nextTemp,
            }
        })
    }

    const handleRouteChange = (field: "origin" | "destination", value: string) => {
        setFormData(prev => ({ ...prev, [field]: value, sailingId: "" }))
    }

    const selectedContainerType = containerTypeOptions.find(c => c.id === formData.containerTypeId)
    const temperatureOptions: Array<{ value: "frozen" | "chilled" | "ambient"; label: string }> =
        selectedContainerType?.type === "DRY"
            ? [{ value: "ambient", label: "+18°C (Ambient)" }]
            : [
                { value: "frozen", label: "-18°C (Frozen)" },
                { value: "chilled", label: "+5°C (Chilled)" },
            ]

    // Sailings filtered to the currently selected route
    const availableSailings = sailingOptions.filter(s =>
        s.portOfLoadValue === formData.origin &&
        s.portOfDischargeValue === formData.destination
    )

    const filteredProductOptions = productOptions
        .filter(p => p.active)
        .filter(p => {
            if (!productSearch) return true
            const q = productSearch.toLowerCase()
            return p.name.toLowerCase().includes(q) ||
                p.hsCode.toLowerCase().includes(q) ||
                p.category?.toLowerCase().includes(q)
        })
        .slice(0, 200)

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
                        className="bg-brand-blue hover:bg-brand-blue/90 text-white font-bold h-9"
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
                                            <h3 className="text-lg font-black text-white flex items-center gap-2 flex-wrap">
                                                {container.route}
                                                <Badge className={STATUS_COLORS[container.status] || STATUS_COLORS.OPEN}>
                                                    {container.status.replace("_", " ")}
                                                </Badge>
                                                {container.temperature && (
                                                    <Badge className={
                                                        container.temperature === "ambient"
                                                            ? "bg-amber-500/15 text-amber-400 border-none text-[10px]"
                                                            : "bg-sky-500/15 text-sky-400 border-none text-[10px]"
                                                    }>
                                                        {container.temperature === "ambient" ? <Sun className="h-3 w-3 mr-1" /> : <Snowflake className="h-3 w-3 mr-1" />}
                                                        {container.temperature === "frozen" ? "-18°C" : container.temperature === "chilled" ? "+5°C" : "+18°C"}
                                                    </Badge>
                                                )}
                                                {container.productName && (
                                                    <Badge className="bg-emerald-500/15 text-emerald-400 border-none text-[10px]">
                                                        <Apple className="h-3 w-3 mr-1" /> {container.productName}
                                                    </Badge>
                                                )}
                                            </h3>
                                            <p className="text-slate-500 text-sm font-medium">
                                                {container.vessel} • {container.containerTypeName || container.type} • {container.id}
                                                {container.voyageNumber && ` • V/${container.voyageNumber}`}
                                            </p>
                                            {(container.etd || container.eta) && (
                                                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                                    <Calendar className="h-3 w-3" />
                                                    {container.etd && <span>ETD: <span className="text-slate-300">{new Date(container.etd).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span></span>}
                                                    {container.eta && <span>ETA: <span className="text-slate-300">{new Date(container.eta).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span></span>}
                                                </div>
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
                                                Create MetaShip Order
                                            </Button>
                                        )}

                                        {container.metashipOrderNo && (
                                            <div className="flex items-center gap-2">
                                                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-1.5 flex items-center gap-2">
                                                    <ExternalLink className="h-3.5 w-3.5 text-emerald-400" />
                                                    <div className="flex flex-col">
                                                        <span className="text-emerald-400 font-black text-sm">Order #{container.metashipOrderNo}</span>
                                                        {container.metashipReference && (
                                                            <span className="text-emerald-400/60 text-[10px] font-mono">{container.metashipReference}</span>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={() => copyToClipboard(container.metashipOrderNo!, `order-${container.id}`)}
                                                        className="ml-1 p-1 rounded hover:bg-emerald-500/20 transition-colors"
                                                        title="Copy order number"
                                                    >
                                                        {copiedId === `order-${container.id}` ? (
                                                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                                                        ) : (
                                                            <Copy className="h-3.5 w-3.5 text-emerald-400/60" />
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="text-slate-500 hover:text-white">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent className="bg-slate-950 border-slate-800 text-white">
                                                {container.metashipOrderNo && (
                                                    <DropdownMenuItem
                                                        className="focus:bg-slate-900 focus:text-white cursor-pointer gap-2"
                                                        onClick={() => setDetailDialog(container)}
                                                    >
                                                        <Eye className="h-4 w-4" /> View Booking Details
                                                    </DropdownMenuItem>
                                                )}
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
                                            Threshold reached — ready for MetaShip order
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
                                                    <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-[10px] text-center">Temp</TableHead>
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
                                                        <TableCell className="text-center text-xs">
                                                            {alloc.allocation.temperature === "frozen" ? (
                                                                <span className="text-blue-400">-18°C</span>
                                                            ) : alloc.allocation.temperature === "chilled" ? (
                                                                <span className="text-cyan-400">+5°C</span>
                                                            ) : (
                                                                <span className="text-slate-500">—</span>
                                                            )}
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
                            {/* Step 1: Route */}
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-brand-blue mb-2">1. Route</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Origin Port</Label>
                                        <Select value={formData.origin} onValueChange={(v) => handleRouteChange("origin", v)}>
                                            <SelectTrigger className="bg-slate-900 border-slate-800 h-9 text-sm">
                                                <SelectValue placeholder="Select origin" />
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
                                        <Select value={formData.destination} onValueChange={(v) => handleRouteChange("destination", v)}>
                                            <SelectTrigger className="bg-slate-900 border-slate-800 h-9 text-sm">
                                                <SelectValue placeholder="Select destination" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                                {destinationLocations.map(loc => (
                                                    <SelectItem key={loc.id} value={loc.code}>{loc.name} ({loc.code})</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>

                            {/* Step 2: Sailing */}
                            <div className="border-t border-slate-800/50 pt-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-brand-blue mb-2">2. Sailing</p>
                                {!formData.origin || !formData.destination ? (
                                    <p className="text-xs text-slate-500 italic">Select origin + destination first.</p>
                                ) : availableSailings.length === 0 ? (
                                    <p className="text-xs text-amber-400">
                                        No sailings available for this route. Go to <span className="font-mono">Sailings</span> and sync from MetaShip.
                                    </p>
                                ) : (
                                    <Select value={formData.sailingId} onValueChange={(v) => setFormData({ ...formData, sailingId: v })}>
                                        <SelectTrigger className="bg-slate-900 border-slate-800 h-9 text-sm">
                                            <SelectValue placeholder={`Pick from ${availableSailings.length} sailing${availableSailings.length === 1 ? "" : "s"}`} />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-slate-800 text-white max-h-[280px]">
                                            {availableSailings.map(s => (
                                                <SelectItem key={s.id} value={s.id}>
                                                    <div className="flex items-center gap-2">
                                                        <Anchor className="h-3 w-3 text-slate-500" />
                                                        <span className="font-bold">{s.vesselName}</span>
                                                        {s.voyageNumber && <span className="text-[10px] font-mono text-slate-500">· V{s.voyageNumber}</span>}
                                                        <span className="text-[10px] text-slate-500">· ETD {new Date(s.etd).toLocaleDateString()}</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>

                            {/* Step 3: Container Type */}
                            <div className="border-t border-slate-800/50 pt-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-brand-blue mb-2">3. Container Type</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <Select value={formData.containerTypeId} onValueChange={handleContainerTypeChange}>
                                        <SelectTrigger className="bg-slate-900 border-slate-800 h-9 text-sm">
                                            <SelectValue placeholder="Select type" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                            {containerTypeOptions.filter(ct => ct.active).map(ct => (
                                                <SelectItem key={ct.id} value={ct.id}>
                                                    {ct.displayName}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Input
                                        type="number"
                                        min={1}
                                        value={formData.maxCapacity}
                                        readOnly
                                        className="bg-slate-950 border-slate-800 h-9 text-sm font-mono text-slate-400"
                                        placeholder="Max pallets"
                                    />
                                </div>
                            </div>

                            {/* Step 4: Temperature */}
                            <div className="border-t border-slate-800/50 pt-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-brand-blue mb-2">4. Temperature</p>
                                <div className="grid grid-cols-3 gap-2">
                                    {(["frozen", "chilled", "ambient"] as const).map(t => {
                                        const allowed = temperatureOptions.some(o => o.value === t)
                                        const selected = formData.temperature === t
                                        const icon = t === "ambient" ? <Sun className="h-3.5 w-3.5" /> : <Snowflake className="h-3.5 w-3.5" />
                                        const label = t === "frozen" ? "-18°C Frozen" : t === "chilled" ? "+5°C Chilled" : "+18°C Ambient"
                                        return (
                                            <button
                                                key={t}
                                                type="button"
                                                disabled={!allowed}
                                                onClick={() => setFormData({ ...formData, temperature: t })}
                                                className={cn(
                                                    "flex items-center justify-center gap-1.5 h-9 rounded-lg border text-xs font-bold transition-all",
                                                    !allowed && "border-slate-800 text-slate-600 cursor-not-allowed opacity-40",
                                                    allowed && !selected && "border-slate-700 text-slate-400 hover:border-brand-blue hover:text-white",
                                                    selected && "border-brand-blue bg-brand-blue/15 text-brand-blue"
                                                )}
                                            >
                                                {icon} {label}
                                            </button>
                                        )
                                    })}
                                </div>
                                {selectedContainerType && (
                                    <p className="text-[10px] text-slate-500 mt-1.5">
                                        {selectedContainerType.type === "DRY"
                                            ? "Dry containers only carry ambient cargo."
                                            : "Reefer containers can carry frozen or chilled cargo."}
                                    </p>
                                )}
                            </div>

                            {/* Step 5: Product */}
                            <div className="border-t border-slate-800/50 pt-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-brand-blue mb-2">5. Product</p>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            role="combobox"
                                            className="w-full justify-between bg-slate-900 border-slate-800 h-9 text-sm text-white hover:bg-slate-900 hover:text-white font-normal"
                                        >
                                            <span className="flex items-center gap-2 min-w-0">
                                                <Apple className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                                                {formData.productId
                                                    ? (productOptions.find(p => p.id === formData.productId)?.name || "…")
                                                    : <span className="text-slate-500">Select a product…</span>}
                                            </span>
                                            <ChevronsUpDown className="h-3.5 w-3.5 opacity-50 shrink-0" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-slate-900 border-slate-800" align="start">
                                        <Command className="bg-slate-900">
                                            <CommandInput
                                                placeholder="Search product or HS code…"
                                                value={productSearch}
                                                onValueChange={setProductSearch}
                                                className="text-white"
                                            />
                                            <CommandList className="max-h-[240px]">
                                                <CommandEmpty>
                                                    {productOptions.length === 0
                                                        ? "No products synced. Go to Products page and sync."
                                                        : "No products match."}
                                                </CommandEmpty>
                                                <CommandGroup>
                                                    {filteredProductOptions.map(p => (
                                                        <CommandItem
                                                            key={p.id}
                                                            value={`${p.name} ${p.hsCode}`}
                                                            onSelect={() => {
                                                                setFormData(prev => ({ ...prev, productId: p.id }))
                                                                setProductSearch("")
                                                            }}
                                                            className="text-white"
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-3.5 w-3.5",
                                                                    formData.productId === p.id ? "opacity-100" : "opacity-0"
                                                                )}
                                                            />
                                                            <div className="flex flex-col">
                                                                <span className="font-semibold">{p.name}</span>
                                                                {(p.hsCode || p.category) && (
                                                                    <span className="text-[10px] text-slate-400 font-mono">
                                                                        {p.hsCode}{p.hsCode && p.category ? " · " : ""}{p.category}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>

                        <DialogFooter className="gap-2">
                            <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="text-slate-400 hover:text-white hover:bg-slate-900">
                                CANCEL
                            </Button>
                            <Button type="submit" disabled={saving} className="bg-brand-blue hover:bg-brand-blue/90 text-white font-black px-8">
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

            {/* Booking Detail View Dialog */}
            <Dialog open={!!detailDialog} onOpenChange={() => setDetailDialog(null)}>
                <DialogContent
                    className="bg-slate-950 border-slate-800 text-white max-w-2xl max-h-[85vh] overflow-y-auto"
                    onInteractOutside={(e) => e.preventDefault()}
                    onEscapeKeyDown={(e) => e.preventDefault()}
                >
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                                <Ship className="h-5 w-5" />
                            </div>
                            Booking Details
                        </DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Full booking information for container {detailDialog?.id}
                        </DialogDescription>
                    </DialogHeader>

                    {detailDialog && (
                        <div className="space-y-5 py-4">
                            {/* MetaShip Reference */}
                            {detailDialog.metashipOrderNo && (
                                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
                                    <p className="text-[10px] font-bold uppercase text-emerald-400/60 mb-2">MetaShip Order</p>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-emerald-400 font-black text-lg">Order #{detailDialog.metashipOrderNo}</p>
                                            {detailDialog.metashipReference && (
                                                <p className="text-emerald-400/60 text-xs font-mono mt-0.5">{detailDialog.metashipReference}</p>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => copyToClipboard(detailDialog.metashipOrderNo!, "detail-order")}
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors text-xs text-emerald-400 font-bold"
                                            >
                                                {copiedId === "detail-order" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                                Copy Order #
                                            </button>
                                            {detailDialog.metashipReference && (
                                                <button
                                                    onClick={() => copyToClipboard(detailDialog.metashipReference!, "detail-ref")}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors text-xs text-emerald-400 font-bold"
                                                >
                                                    {copiedId === "detail-ref" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                                    Copy Ref
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Container & Route Info */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-900 rounded-lg p-3 border border-slate-800">
                                    <p className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1"><MapPin className="h-3 w-3" /> Route</p>
                                    <p className="text-white font-black text-lg mt-1">{detailDialog.route}</p>
                                </div>
                                <div className="bg-slate-900 rounded-lg p-3 border border-slate-800">
                                    <p className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1"><Ship className="h-3 w-3" /> Vessel</p>
                                    <p className="text-white font-black mt-1">{detailDialog.vessel}</p>
                                    {detailDialog.voyageNumber && (
                                        <p className="text-slate-500 text-xs mt-0.5">Voyage: <span className="text-slate-300 font-mono">{detailDialog.voyageNumber}</span></p>
                                    )}
                                </div>
                                <div className="bg-slate-900 rounded-lg p-3 border border-slate-800">
                                    <p className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1"><Container className="h-3 w-3" /> Container</p>
                                    <p className="text-white font-black mt-1">{detailDialog.type}</p>
                                    <p className="text-slate-500 text-xs mt-0.5 font-mono">{detailDialog.id}</p>
                                </div>
                                <div className="bg-slate-900 rounded-lg p-3 border border-slate-800">
                                    <p className="text-[10px] font-bold uppercase text-slate-500">Status</p>
                                    <div className="mt-1">
                                        <Badge className={STATUS_COLORS[detailDialog.status] || STATUS_COLORS.OPEN}>
                                            {detailDialog.status.replace("_", " ")}
                                        </Badge>
                                    </div>
                                </div>
                            </div>

                            {/* Dates */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-900 rounded-lg p-3 border border-slate-800">
                                    <p className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1"><Calendar className="h-3 w-3" /> ETD (Departure)</p>
                                    <p className="text-white font-bold mt-1">
                                        {detailDialog.etd
                                            ? new Date(detailDialog.etd).toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "long", year: "numeric" })
                                            : "Not set"}
                                    </p>
                                </div>
                                <div className="bg-slate-900 rounded-lg p-3 border border-slate-800">
                                    <p className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1"><Calendar className="h-3 w-3" /> ETA (Arrival)</p>
                                    <p className="text-white font-bold mt-1">
                                        {detailDialog.eta
                                            ? new Date(detailDialog.eta).toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "long", year: "numeric" })
                                            : "Not set"}
                                    </p>
                                </div>
                            </div>

                            {/* Capacity Summary */}
                            <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
                                <p className="text-[10px] font-bold uppercase text-slate-500 mb-3 flex items-center gap-1"><Package className="h-3 w-3" /> Capacity</p>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-3xl font-black ${detailDialog.totalPallets >= 15 ? "text-amber-400" : "text-white"}`}>{detailDialog.totalPallets}</span>
                                        <span className="text-slate-500">/ {detailDialog.maxCapacity} pallets</span>
                                    </div>
                                    <div className="flex-1">
                                        <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all ${detailDialog.totalPallets >= 15 ? "bg-amber-500" : "bg-blue-500"}`}
                                                style={{ width: `${(detailDialog.totalPallets / detailDialog.maxCapacity) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                    <span className="text-sm font-bold text-slate-400">{Math.round((detailDialog.totalPallets / detailDialog.maxCapacity) * 100)}%</span>
                                </div>
                                {/* Temperature summary */}
                                {(() => {
                                    const temps = detailDialog.allocations.map(a => a.allocation.temperature).filter(Boolean)
                                    const frozen = temps.filter(t => t === "frozen").length
                                    const chilled = temps.filter(t => t === "chilled").length
                                    if (frozen === 0 && chilled === 0) return null
                                    return (
                                        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-800">
                                            <Thermometer className="h-3.5 w-3.5 text-slate-500" />
                                            {frozen > 0 && <span className="text-xs text-blue-400 font-bold">{frozen} Frozen (-18°C)</span>}
                                            {chilled > 0 && <span className="text-xs text-cyan-400 font-bold">{chilled} Chilled (+5°C)</span>}
                                        </div>
                                    )
                                })()}
                            </div>

                            {/* Client Allocations */}
                            {detailDialog.allocations.length > 0 && (
                                <div>
                                    <p className="text-[10px] font-bold uppercase text-slate-500 mb-2 flex items-center gap-1">
                                        <Users className="h-3 w-3" /> Client Allocations ({detailDialog.allocations.length})
                                    </p>
                                    <div className="rounded-lg border border-slate-800 overflow-hidden">
                                        <Table>
                                            <TableHeader className="bg-slate-950">
                                                <TableRow className="hover:bg-transparent border-slate-800">
                                                    <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Client</TableHead>
                                                    <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Account</TableHead>
                                                    <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Product</TableHead>
                                                    <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-[10px] text-center">Pallets</TableHead>
                                                    <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-[10px] text-center">Nett (kg)</TableHead>
                                                    <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-[10px] text-center">Gross (kg)</TableHead>
                                                    <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-[10px] text-center">Temp</TableHead>
                                                    <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Consignee</TableHead>
                                                    <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-[10px] text-center">Status</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {detailDialog.allocations.map((alloc) => (
                                                    <TableRow key={alloc.allocation.id} className="border-slate-800 hover:bg-slate-900/40">
                                                        <TableCell>
                                                            <div className="flex flex-col">
                                                                <span className="text-slate-300 font-medium text-xs">{alloc.userName || "—"}</span>
                                                                {alloc.userEmail && <span className="text-[10px] text-slate-500">{alloc.userEmail}</span>}
                                                            </div>
                                                        </TableCell>
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
                                                        <TableCell className="text-center text-xs text-slate-400">{alloc.allocation.nettWeight || "—"}</TableCell>
                                                        <TableCell className="text-center text-xs text-slate-400">{alloc.allocation.grossWeight || "—"}</TableCell>
                                                        <TableCell className="text-center text-xs">
                                                            {alloc.allocation.temperature === "frozen" ? (
                                                                <span className="text-blue-400 font-bold">-18°C</span>
                                                            ) : alloc.allocation.temperature === "chilled" ? (
                                                                <span className="text-cyan-400 font-bold">+5°C</span>
                                                            ) : (
                                                                <span className="text-slate-500">—</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-xs text-slate-400">{alloc.allocation.consigneeName || "—"}</TableCell>
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
                                    {/* Totals row */}
                                    <div className="flex items-center justify-between mt-2 px-3 py-2 bg-slate-900/50 rounded-lg border border-slate-800 text-xs">
                                        <span className="text-slate-500 font-bold uppercase">Totals</span>
                                        <div className="flex items-center gap-6">
                                            <span className="text-white font-black">
                                                {detailDialog.allocations.reduce((sum, a) => sum + a.allocation.palletCount, 0)} pallets
                                            </span>
                                            <span className="text-slate-400 flex items-center gap-1">
                                                <Weight className="h-3 w-3" />
                                                {detailDialog.allocations.reduce((sum, a) => sum + (parseFloat(a.allocation.nettWeight || "0")), 0).toLocaleString()}N
                                                {" / "}
                                                {detailDialog.allocations.reduce((sum, a) => sum + (parseFloat(a.allocation.grossWeight || "0")), 0).toLocaleString()}G kg
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDetailDialog(null)} className="text-slate-400">
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* MetaShip Order Confirmation Dialog */}
            <Dialog open={!!bookingDialog} onOpenChange={() => setBookingDialog(null)}>
                <DialogContent className="bg-slate-950 border-slate-800 text-white max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black">Create MetaShip Order</DialogTitle>
                        <DialogDescription className="text-slate-400">
                            This will create a consolidated order in MetaShip for all client allocations on this container.
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
                                    {bookingDialog.voyageNumber && (
                                        <p className="text-slate-500 text-[10px]">Voyage: {bookingDialog.voyageNumber}</p>
                                    )}
                                </div>
                                <div className="bg-slate-900 rounded-lg p-3 border border-slate-800">
                                    <p className="text-[10px] font-bold uppercase text-slate-500">Total Pallets</p>
                                    <p className="text-amber-400 font-black text-lg">{bookingDialog.totalPallets}</p>
                                </div>
                                <div className="bg-slate-900 rounded-lg p-3 border border-slate-800">
                                    <p className="text-[10px] font-bold uppercase text-slate-500">Clients</p>
                                    <p className="text-white font-black text-lg">{bookingDialog.allocations.length}</p>
                                </div>
                                {bookingDialog.etd && (
                                    <div className="bg-slate-900 rounded-lg p-3 border border-slate-800">
                                        <p className="text-[10px] font-bold uppercase text-slate-500">ETD</p>
                                        <p className="text-white font-bold">{new Date(bookingDialog.etd).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</p>
                                    </div>
                                )}
                                {bookingDialog.eta && (
                                    <div className="bg-slate-900 rounded-lg p-3 border border-slate-800">
                                        <p className="text-[10px] font-bold uppercase text-slate-500">ETA</p>
                                        <p className="text-white font-bold">{new Date(bookingDialog.eta).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</p>
                                    </div>
                                )}
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
                                    After creating the order, log in to MetaShip to review, attach documents, and confirm it.
                                </p>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setBookingDialog(null)} className="text-slate-400">Cancel</Button>
                        <Button
                            className="bg-amber-600 hover:bg-amber-700 font-bold"
                            disabled={creatingBooking}
                            onClick={() => bookingDialog && handleCreateMetaShipOrder(bookingDialog)}
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
