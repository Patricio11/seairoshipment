"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Search,
    Ship,
    MoreVertical,
    CreditCard,
    Container,
    MapPin,
    Anchor,
    Truck,
    PackageCheck,
    BoxSelect,
    Loader2,
    ExternalLink,
    AlertTriangle,
    Users,
    Package,
    Calendar,
    Copy,
    Check,
    Eye,
    Thermometer,
    Weight,
    FileText,
    Download,
    User,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
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
        salesRateTypeId: string | null
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
    containerTypeId: string | null
    containerTypeName: string | null
    etd: string | null
    eta: string | null
    totalPallets: number
    maxCapacity: number
    status: string
    salesRateTypeId: string
    metashipOrderNo: string | null
    metashipReference: string | null
    createdAt: string
    allocations: ContainerAllocation[]
}

// Mock legacy data for requests/shipments tabs
const MOCK_BOOKINGS = [
    { id: "BKG-001", client: "Global Fruits", ref: "SRS-9921", vessel: "MSC Orchestra", route: "ZACPT-NLRTM", etd: "Oct 28", status: "PENDING_DEPOSIT", depositPaid: false, type: "REQUEST" },
    { id: "BKG-002", client: "Oceanic Seafoods", ref: "SRS-9842", vessel: "Maersk Line 2", route: "ZADUR-SGSIN", etd: "Oct 30", status: "PENDING_CONFIRMATION", depositPaid: true, type: "REQUEST" },
    { id: "SHP-2024-001", client: "Cape Citrus", ref: "SRS-9111", vessel: "COSCO Shipping", route: "ZACPT-GBLND", etd: "Nov 02", status: "AT_SEA", depositPaid: true, type: "SHIPMENT", progress: 65 },
    { id: "SHP-2024-004", client: "Tech Imports SA", ref: "SRS-8822", vessel: "Evergreen Elite", route: "NLRTM-ZACPT", etd: "Sep 15", status: "ARRIVED", depositPaid: true, type: "SHIPMENT", progress: 100 },
]

const SHIPMENT_MILESTONES = [
    { id: 'BOOKING_PLACED', label: 'Booked', icon: BoxSelect },
    { id: 'DEPOSIT_PAID', label: 'Deposit', icon: CreditCard },
    { id: 'CONTAINER_RELEASED', label: 'Released', icon: Container },
    { id: 'GATE_IN', label: 'Gate In', icon: Truck },
    { id: 'VESSEL_LOADED', label: 'Loaded', icon: Anchor },
    { id: 'AT_SEA', label: 'Sailing', icon: Ship },
    { id: 'ARRIVAL_POD', label: 'Arrived', icon: MapPin },
    { id: 'DELIVERED', label: 'Delivered', icon: PackageCheck },
]

const STATUS_COLORS: Record<string, string> = {
    OPEN: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    THRESHOLD_REACHED: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    BOOKED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    SAILING: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    DELIVERED: "bg-slate-500/10 text-slate-400 border-slate-500/20",
}

interface ClientDoc {
    id: string
    originalName: string
    type: string
    status: string
    url: string | null
    uploadedAt: string
}

export function AdminBookingsGrid() {
    const [searchTerm, setSearchTerm] = useState("")
    const [rateTypeFilter, setRateTypeFilter] = useState<"all" | "srs" | "scs">("all")
    const [activeTab, setActiveTab] = useState("containers")
    const [containerData, setContainerData] = useState<ContainerData[]>([])
    const [loadingContainers, setLoadingContainers] = useState(false)
    const [bookingDialog, setBookingDialog] = useState<ContainerData | null>(null)
    const [creatingBooking, setCreatingBooking] = useState(false)
    const [copiedId, setCopiedId] = useState<string | null>(null)
    const [detailDialog, setDetailDialog] = useState<ContainerData | null>(null)
    const [clientDialog, setClientDialog] = useState<{ alloc: ContainerAllocation; docs: ClientDoc[] } | null>(null)
    const [loadingClientDocs, setLoadingClientDocs] = useState(false)
    const [viewDoc, setViewDoc] = useState<ClientDoc | null>(null)

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text)
        setCopiedId(id)
        toast.success("Copied to clipboard")
        setTimeout(() => setCopiedId(null), 2000)
    }

    const fetchContainers = useCallback(async () => {
        setLoadingContainers(true)
        try {
            const res = await fetch("/api/admin/containers")
            if (res.ok) {
                const data = await res.json()
                setContainerData(data)
            }
        } catch {
            console.error("Failed to fetch containers")
        } finally {
            setLoadingContainers(false)
        }
    }, [])

    useEffect(() => {
        if (activeTab === "containers") {
            fetchContainers()
        }
    }, [activeTab, fetchContainers])

    const openClientDialog = async (alloc: ContainerAllocation) => {
        setLoadingClientDocs(true)
        setClientDialog({ alloc, docs: [] })
        try {
            const res = await fetch(`/api/admin/allocations/${alloc.allocation.id}/documents`)
            const docs: ClientDoc[] = res.ok ? await res.json() : []
            setClientDialog({ alloc, docs })
        } catch {
            setClientDialog({ alloc, docs: [] })
        } finally {
            setLoadingClientDocs(false)
        }
    }

    const handleCreateMetaShipOrder = async (container: ContainerData) => {
        setCreatingBooking(true)
        try {
            const res = await fetch(`/api/admin/containers/${container.id}/book`, {
                method: "POST",
            })
            const data = await res.json()

            if (!res.ok) {
                toast.error(data.error || "Failed to create MetaShip order")
                return
            }

            toast.success("MetaShip Order Created!", {
                description: `Order #${data.orderNo} — Log in to MetaShip to confirm.`,
                duration: 8000,
            })
            setBookingDialog(null)
            fetchContainers()
        } catch {
            toast.error("Failed to create MetaShip order")
        } finally {
            setCreatingBooking(false)
        }
    }

    const filteredMockData = MOCK_BOOKINGS.filter(b =>
        (activeTab === 'requests' ? b.type === 'REQUEST' : b.type === 'SHIPMENT') &&
        (b.client.toLowerCase().includes(searchTerm.toLowerCase()) || b.ref.includes(searchTerm))
    )

    const filteredContainers = containerData.filter(c => {
        const matchesSearch = (
            c.route.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.vessel.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (c.metashipOrderNo && c.metashipOrderNo.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (c.voyageNumber && c.voyageNumber.toLowerCase().includes(searchTerm.toLowerCase()))
        )
        if (!matchesSearch) return false
        if (rateTypeFilter === "all") return true
        return c.allocations.some(a => (a.allocation.salesRateTypeId || "srs") === rateTypeFilter)
    })

    return (
        <div className="space-y-6">
            <Tabs defaultValue="containers" onValueChange={setActiveTab} className="w-full">
                <div className="flex flex-col sm:flex-row justify-between gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                    <TabsList className="bg-slate-950 border border-slate-800">
                        <TabsTrigger value="containers" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400 text-xs font-bold uppercase tracking-wider">
                            Containers
                        </TabsTrigger>
                        <TabsTrigger value="requests" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400 text-xs font-bold uppercase tracking-wider">
                            Pending Requests
                        </TabsTrigger>
                        <TabsTrigger value="shipments" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400 text-xs font-bold uppercase tracking-wider">
                            Live Shipments
                        </TabsTrigger>
                    </TabsList>

                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="relative flex-1 min-w-[180px] max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                            <Input
                                placeholder="Search client, ref or vessel..."
                                className="pl-10 h-10 bg-slate-950 border-slate-800 text-white focus:ring-1 focus:ring-slate-700"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-1">
                            {(["all", "srs", "scs"] as const).map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setRateTypeFilter(t)}
                                    className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${
                                        rateTypeFilter === t
                                            ? t === "srs"
                                                ? "bg-brand-blue text-white"
                                                : t === "scs"
                                                    ? "bg-emerald-600 text-white"
                                                    : "bg-slate-700 text-white"
                                            : "text-slate-400 hover:text-slate-200"
                                    }`}
                                >
                                    {t === "all" ? "All" : t.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* CONTAINERS TAB */}
                <TabsContent value="containers" className="mt-6 space-y-4">
                    {loadingContainers ? (
                        <div className="flex items-center justify-center py-20 text-slate-500">
                            <Loader2 className="h-6 w-6 animate-spin mr-2" />
                            Loading containers...
                        </div>
                    ) : filteredContainers.length === 0 ? (
                        <div className="text-center py-20 text-slate-500">
                            <Container className="h-12 w-12 mx-auto mb-3 opacity-30" />
                            <p className="font-bold">No containers yet</p>
                            <p className="text-sm mt-1">Containers will appear here when clients book pallets.</p>
                        </div>
                    ) : (
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
                                                    <Badge className={
                                                        (container.salesRateTypeId || "srs") === "scs"
                                                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-mono text-[10px] uppercase"
                                                            : "bg-blue-500/10 text-blue-400 border-blue-500/20 font-mono text-[10px] uppercase"
                                                    }>
                                                        {container.salesRateTypeId || "srs"}
                                                    </Badge>
                                                </h3>
                                                <p className="text-slate-500 text-sm font-medium">
                                                    {container.vessel} • {container.containerTypeName || container.type} • {container.id}
                                                    {container.voyageNumber && <> • Voyage: {container.voyageNumber}</>}
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
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="border-slate-700 bg-slate-950 text-slate-300 font-bold hover:text-white h-9"
                                                        onClick={() => setDetailDialog(container)}
                                                    >
                                                        <Eye className="mr-1.5 h-3.5 w-3.5" />
                                                        View Details
                                                    </Button>
                                                </div>
                                            )}
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
                                                        <TableRow
                                                            key={alloc.allocation.id}
                                                            className="border-slate-800 hover:bg-slate-900/40 cursor-pointer"
                                                            onClick={() => openClientDialog(alloc)}
                                                            title="View client details"
                                                        >
                                                            <TableCell className="text-slate-300 font-medium">
                                                                <div className="flex items-center gap-1.5">
                                                                    {alloc.userName || "—"}
                                                                    <Eye className="h-3 w-3 text-slate-600 group-hover:text-slate-400" />
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
                                                                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                                                    <Badge className={
                                                                        alloc.allocation.status === "CONFIRMED"
                                                                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                                                            : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                                                                    }>
                                                                        {alloc.allocation.status}
                                                                    </Badge>
                                                                    <Badge className={
                                                                        (alloc.allocation.salesRateTypeId || "srs") === "scs"
                                                                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-mono text-[10px]"
                                                                            : "bg-blue-500/10 text-blue-400 border-blue-500/20 font-mono text-[10px]"
                                                                    }>
                                                                        {(alloc.allocation.salesRateTypeId || "srs").toUpperCase()}
                                                                    </Badge>
                                                                </div>
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
                    )}
                </TabsContent>

                {/* PENDING REQUESTS TAB */}
                <TabsContent value="requests" className="mt-6">
                    <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950/30">
                        <Table>
                            <TableHeader className="bg-slate-900">
                                <TableRow className="hover:bg-transparent border-slate-800">
                                    <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Reference</TableHead>
                                    <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Client Request</TableHead>
                                    <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Vessel / Route</TableHead>
                                    <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] text-center">40% Deposit</TableHead>
                                    <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredMockData.map((item) => (
                                    <TableRow key={item.id} className="border-slate-800 hover:bg-slate-900/40">
                                        <TableCell className="font-mono text-white font-bold">{item.ref}</TableCell>
                                        <TableCell className="text-slate-300 font-medium">{item.client}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                <span className="text-xs text-white uppercase font-bold">{item.vessel}</span>
                                                <span className="text-[10px] text-slate-500">{item.route}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {item.depositPaid ? (
                                                <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">PAID</Badge>
                                            ) : (
                                                <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">PENDING</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button size="sm" className="bg-brand-blue hover:bg-brand-blue/90 text-white font-bold h-8">
                                                Review
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>

                {/* LIVE SHIPMENTS TAB */}
                <TabsContent value="shipments" className="mt-6 space-y-4">
                    <AnimatePresence>
                        {filteredMockData.map((item, i) => (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-all"
                            >
                                <div className="flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20">
                                            <Ship className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-white flex items-center gap-2">
                                                {item.ref}
                                                <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-400">{item.status.replace('_', ' ')}</Badge>
                                            </h3>
                                            <p className="text-slate-500 text-sm font-medium">{item.client} • {item.vessel}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline" className="border-slate-700 bg-slate-950 text-slate-300 font-bold hover:text-white">
                                                    Update Status
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent className="bg-slate-950 border-slate-800 text-white w-56">
                                                <DropdownMenuLabel>Select Milestone</DropdownMenuLabel>
                                                <DropdownMenuSeparator className="bg-slate-800" />
                                                {SHIPMENT_MILESTONES.map((m) => (
                                                    <DropdownMenuItem key={m.id} className="focus:bg-slate-900 focus:text-white cursor-pointer gap-2">
                                                        <m.icon className="h-4 w-4 text-slate-500" />
                                                        {m.label}
                                                    </DropdownMenuItem>
                                                ))}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                        <Button size="icon" variant="ghost" className="text-slate-500 hover:text-white">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Live Tracker Visual */}
                                <div className="relative pt-6 pb-2 px-2">
                                    <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-800 -translate-y-1/2 rounded-full" />
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${item.progress}%` }}
                                        transition={{ duration: 1, delay: 0.2 }}
                                        className="absolute top-1/2 left-0 h-1 bg-blue-500 -translate-y-1/2 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                                    />
                                    <div className="relative flex justify-between">
                                        {SHIPMENT_MILESTONES.filter((_, idx) => idx % 2 === 0).map((milestone, idx) => {
                                            const isActive = idx * 22 <= (item.progress || 0)
                                            return (
                                                <div key={milestone.id} className="flex flex-col items-center gap-3">
                                                    <div className={`
                                                        h-8 w-8 rounded-full border-2 flex items-center justify-center bg-slate-950 transition-colors duration-500
                                                        ${isActive
                                                            ? "border-blue-500 text-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)] scale-110"
                                                            : "border-slate-800 text-slate-700"}
                                                    `}>
                                                        <milestone.icon className="h-3 w-3" />
                                                    </div>
                                                    <span className={`text-[10px] font-bold uppercase transition-colors ${isActive ? "text-blue-400" : "text-slate-700"}`}>
                                                        {milestone.label}
                                                    </span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </TabsContent>
            </Tabs>

            {/* Booking Detail View Dialog */}
            <Dialog open={!!detailDialog} onOpenChange={() => setDetailDialog(null)}>
                <DialogContent
                    className="bg-slate-950 border-slate-800 text-white sm:max-w-[60rem] max-h-[85vh] overflow-y-auto"
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
                                                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                                                <Badge className={
                                                                    alloc.allocation.status === "CONFIRMED"
                                                                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                                                        : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                                                                }>
                                                                    {alloc.allocation.status}
                                                                </Badge>
                                                                <Badge className={
                                                                    (alloc.allocation.salesRateTypeId || "srs") === "scs"
                                                                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-mono text-[10px]"
                                                                        : "bg-blue-500/10 text-blue-400 border-blue-500/20 font-mono text-[10px]"
                                                                }>
                                                                    {(alloc.allocation.salesRateTypeId || "srs").toUpperCase()}
                                                                </Badge>
                                                            </div>
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
                                    After creating the booking, log in to MetaShip to review and confirm it.
                                </p>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setBookingDialog(null)} className="text-slate-400">
                            Cancel
                        </Button>
                        <Button
                            className="bg-amber-600 hover:bg-amber-700 font-bold"
                            disabled={creatingBooking}
                            onClick={() => bookingDialog && handleCreateMetaShipOrder(bookingDialog)}
                        >
                            {creatingBooking ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Ship className="mr-2 h-4 w-4" />
                                    Confirm & Create Booking
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Client Detail Dialog */}
            <Dialog open={!!clientDialog} onOpenChange={() => setClientDialog(null)}>
                <DialogContent className="bg-slate-950 border-slate-800 text-white max-w-lg max-h-[85vh] overflow-y-auto">
                    {clientDialog && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                                        <User className="h-4 w-4 text-blue-400" />
                                    </div>
                                    <div>
                                        <p className="text-white font-black">{clientDialog.alloc.userName || "Unknown Client"}</p>
                                        {clientDialog.alloc.userEmail && (
                                            <p className="text-slate-500 text-xs font-normal mt-0.5">{clientDialog.alloc.userEmail}</p>
                                        )}
                                    </div>
                                </DialogTitle>
                                <DialogDescription className="text-slate-500 text-xs">
                                    Allocation ID: <span className="font-mono text-slate-400">{clientDialog.alloc.allocation.id}</span>
                                    {clientDialog.alloc.accountNumber && (
                                        <> · Account: <span className="font-mono text-slate-400">{clientDialog.alloc.accountNumber}</span></>
                                    )}
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 mt-2">
                                {/* Booking type + status */}
                                <div className="flex items-center gap-2 flex-wrap">
                                    <Badge className={
                                        clientDialog.alloc.allocation.status === "CONFIRMED"
                                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                            : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                                    }>
                                        {clientDialog.alloc.allocation.status}
                                    </Badge>
                                    <Badge className={
                                        (clientDialog.alloc.allocation.salesRateTypeId || "srs") === "scs"
                                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-mono"
                                            : "bg-blue-500/10 text-blue-400 border-blue-500/20 font-mono"
                                    }>
                                        {(clientDialog.alloc.allocation.salesRateTypeId || "srs").toUpperCase()}
                                    </Badge>
                                </div>

                                {/* Cargo details */}
                                <div className="bg-slate-900 rounded-xl border border-slate-800 divide-y divide-slate-800">
                                    <div className="px-4 py-2.5 flex items-center justify-between">
                                        <span className="text-xs text-slate-500 font-semibold">Product</span>
                                        <div className="text-right">
                                            <p className="text-sm text-white font-bold">{clientDialog.alloc.allocation.commodityName || "—"}</p>
                                            {clientDialog.alloc.allocation.hsCode && (
                                                <p className="text-[10px] text-slate-500 font-mono">HS: {clientDialog.alloc.allocation.hsCode}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="px-4 py-2.5 flex items-center justify-between">
                                        <span className="text-xs text-slate-500 font-semibold">Pallets</span>
                                        <span className="text-2xl font-black text-white">{clientDialog.alloc.allocation.palletCount}</span>
                                    </div>
                                    <div className="px-4 py-2.5 flex items-center justify-between">
                                        <span className="text-xs text-slate-500 font-semibold">Temperature</span>
                                        <span className={`text-sm font-bold ${clientDialog.alloc.allocation.temperature === "frozen" ? "text-blue-400" : clientDialog.alloc.allocation.temperature === "chilled" ? "text-cyan-400" : "text-slate-500"}`}>
                                            {clientDialog.alloc.allocation.temperature === "frozen" ? "-18°C (Frozen)" : clientDialog.alloc.allocation.temperature === "chilled" ? "+5°C (Chilled)" : "—"}
                                        </span>
                                    </div>
                                    <div className="px-4 py-2.5 flex items-center justify-between">
                                        <span className="text-xs text-slate-500 font-semibold">Nett Weight</span>
                                        <span className="text-sm text-slate-300 font-mono">{clientDialog.alloc.allocation.nettWeight ? `${clientDialog.alloc.allocation.nettWeight} kg` : "—"}</span>
                                    </div>
                                    <div className="px-4 py-2.5 flex items-center justify-between">
                                        <span className="text-xs text-slate-500 font-semibold">Gross Weight</span>
                                        <span className="text-sm text-slate-300 font-mono">{clientDialog.alloc.allocation.grossWeight ? `${clientDialog.alloc.allocation.grossWeight} kg` : "—"}</span>
                                    </div>
                                    <div className="px-4 py-2.5 flex items-center justify-between">
                                        <span className="text-xs text-slate-500 font-semibold">Consignee</span>
                                        <span className="text-sm text-slate-300 text-right max-w-[200px]">{clientDialog.alloc.allocation.consigneeName || "—"}</span>
                                    </div>
                                </div>

                                {/* Documents */}
                                <div>
                                    <p className="text-[10px] font-bold uppercase text-slate-500 mb-2 flex items-center gap-1">
                                        <FileText className="h-3 w-3" /> Documents Submitted
                                    </p>
                                    {loadingClientDocs ? (
                                        <div className="flex items-center gap-2 py-4 text-slate-500 text-sm">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Loading documents...
                                        </div>
                                    ) : clientDialog.docs.length === 0 ? (
                                        <div className="py-4 text-center text-slate-600 text-sm border border-slate-800 rounded-xl">
                                            No documents submitted yet
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {clientDialog.docs.map((doc) => (
                                                <div key={doc.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-800 bg-slate-900">
                                                    <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                                                        <FileText className="h-4 w-4 text-blue-400" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm text-white font-medium truncate">{doc.originalName}</p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-[10px] text-slate-500 font-mono uppercase">{doc.type.replace("_", " ")}</span>
                                                            <span className="text-[10px] text-slate-700">·</span>
                                                            <span className={`text-[10px] font-bold uppercase ${doc.status === "APPROVED" ? "text-emerald-400" : doc.status === "REJECTED" ? "text-red-400" : "text-amber-400"}`}>
                                                                {doc.status}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {doc.url && (
                                                        <div className="flex items-center gap-1.5 shrink-0">
                                                            <button
                                                                onClick={() => setViewDoc(doc)}
                                                                className="h-7 w-7 rounded-lg border border-slate-700 flex items-center justify-center text-slate-400 hover:text-brand-blue hover:border-brand-blue transition-colors"
                                                                title="View document"
                                                            >
                                                                <Eye className="h-3.5 w-3.5" />
                                                            </button>
                                                            <a
                                                                href={doc.url}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="h-7 w-7 rounded-lg border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
                                                                title="Download document"
                                                            >
                                                                <Download className="h-3.5 w-3.5" />
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Document Viewer Modal (A4) */}
            <Dialog open={!!viewDoc} onOpenChange={() => setViewDoc(null)}>
                <DialogContent className="sm:max-w-[900px] h-[90vh] bg-slate-950 border-slate-800 text-white p-0 flex flex-col gap-0" onInteractOutside={(e) => e.preventDefault()}>
                    <DialogHeader className="px-6 py-4 border-b border-slate-800 shrink-0">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="h-10 w-10 rounded-lg bg-brand-blue/10 flex items-center justify-center shrink-0">
                                    <FileText className="h-5 w-5 text-brand-blue" />
                                </div>
                                <div className="min-w-0">
                                    <DialogTitle className="text-sm font-black truncate">{viewDoc?.originalName}</DialogTitle>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] text-slate-500 font-mono uppercase">{viewDoc?.type.replace("_", " ")}</span>
                                        <span className="text-[10px] text-slate-700">·</span>
                                        <span className={`text-[10px] font-bold uppercase ${viewDoc?.status === "APPROVED" ? "text-emerald-400" : viewDoc?.status === "REJECTED" ? "text-red-400" : "text-amber-400"}`}>
                                            {viewDoc?.status}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            {viewDoc?.url && (
                                <a
                                    href={viewDoc.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    download={viewDoc.originalName}
                                    className="shrink-0 h-9 px-4 rounded-lg bg-brand-blue hover:bg-brand-blue/90 text-white text-xs font-bold flex items-center gap-2 transition-colors"
                                >
                                    <Download className="h-3.5 w-3.5" /> Download
                                </a>
                            )}
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-auto bg-slate-900 p-6 flex items-start justify-center">
                        {viewDoc?.url && (() => {
                            const name = viewDoc.originalName.toLowerCase()
                            const isPdf = name.endsWith(".pdf")
                            const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name)

                            if (isPdf) {
                                return (
                                    <iframe
                                        src={viewDoc.url}
                                        title={viewDoc.originalName}
                                        className="w-full h-full bg-white rounded shadow-2xl"
                                        style={{ aspectRatio: "1 / 1.414", minHeight: "100%", maxWidth: "800px" }}
                                    />
                                )
                            }
                            if (isImage) {
                                return (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={viewDoc.url}
                                        alt={viewDoc.originalName}
                                        className="max-w-full max-h-full object-contain bg-white rounded shadow-2xl"
                                        style={{ maxWidth: "800px" }}
                                    />
                                )
                            }
                            // Unsupported type
                            return (
                                <div className="flex flex-col items-center justify-center text-center py-12">
                                    <div className="h-16 w-16 rounded-2xl bg-slate-800 flex items-center justify-center mb-4">
                                        <FileText className="h-8 w-8 text-slate-500" />
                                    </div>
                                    <p className="text-white font-bold">Preview not available</p>
                                    <p className="text-slate-500 text-sm mt-1 max-w-sm">
                                        This file type can&apos;t be previewed inline. Download the file to view it.
                                    </p>
                                    <a
                                        href={viewDoc.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        download={viewDoc.originalName}
                                        className="mt-6 h-9 px-6 rounded-lg bg-brand-blue hover:bg-brand-blue/90 text-white text-xs font-bold flex items-center gap-2"
                                    >
                                        <Download className="h-3.5 w-3.5" /> Download File
                                    </a>
                                </div>
                            )
                        })()}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
