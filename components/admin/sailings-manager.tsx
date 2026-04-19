"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Anchor, Loader2, RefreshCcw, Search, Container, Calendar, Ship } from "lucide-react"
import { toast } from "sonner"

interface Sailing {
    id: string
    metashipId: string
    vesselName: string
    voyageNumber: string
    shippingLine: string
    portOfLoadValue: string
    portOfLoadCity: string
    portOfDischargeValue: string
    portOfDischargeCity: string
    originCountry: string
    destinationCountry: string
    etd: string
    eta: string | null
    transitTime: number | null
    serviceType: string | null
    active: boolean
    lastSyncedAt: string
    containerCount: number
}

function formatDate(dateStr: string | null): string {
    if (!dateStr) return "—"
    return new Date(dateStr).toLocaleDateString("en-ZA", {
        day: "numeric",
        month: "short",
        year: "numeric",
    })
}

export function SailingsManager() {
    const [sailings, setSailings] = useState<Sailing[]>([])
    const [loading, setLoading] = useState(true)
    const [syncing, setSyncing] = useState(false)
    const [search, setSearch] = useState("")
    const [includePast, setIncludePast] = useState(false)

    // Sync dialog
    const [syncDialogOpen, setSyncDialogOpen] = useState(false)
    const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0])
    const [endDate, setEndDate] = useState(
        new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
    )

    const fetchSailings = useCallback(async () => {
        setLoading(true)
        try {
            const url = includePast ? "/api/admin/sailings?includePast=true" : "/api/admin/sailings"
            const res = await fetch(url)
            if (res.ok) setSailings(await res.json())
        } catch {
            toast.error("Failed to fetch sailings")
        } finally {
            setLoading(false)
        }
    }, [includePast])

    useEffect(() => {
        fetchSailings()
    }, [fetchSailings])

    const handleSync = async () => {
        setSyncing(true)
        try {
            const res = await fetch("/api/admin/sailings/sync", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ startDate, endDate }),
            })
            const data = await res.json()
            if (!res.ok) {
                toast.error(data.error || "Sync failed")
                return
            }
            const errorCount = data.errors?.length || 0
            toast.success(`Synced ${data.inserted + data.updated} sailings`, {
                description: `${data.inserted} new, ${data.updated} updated from ${data.totalFetched} fetched${errorCount > 0 ? ` · ${errorCount} route(s) failed` : ""}`,
                duration: 6000,
            })
            setSyncDialogOpen(false)
            fetchSailings()
        } catch {
            toast.error("Sync failed")
        } finally {
            setSyncing(false)
        }
    }

    const filtered = sailings.filter(s => {
        if (!search) return true
        const q = search.toLowerCase()
        return s.vesselName.toLowerCase().includes(q) ||
            s.voyageNumber.toLowerCase().includes(q) ||
            s.portOfLoadValue.toLowerCase().includes(q) ||
            s.portOfDischargeValue.toLowerCase().includes(q) ||
            s.portOfLoadCity.toLowerCase().includes(q) ||
            s.portOfDischargeCity.toLowerCase().includes(q)
    })

    const lastSyncedAt = sailings.reduce<string | null>((latest, s) => {
        if (!s.lastSyncedAt) return latest
        if (!latest) return s.lastSyncedAt
        return s.lastSyncedAt > latest ? s.lastSyncedAt : latest
    }, null)

    return (
        <div className="space-y-4">
            {/* Header + actions */}
            <div className="flex items-center justify-between gap-3 bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex-wrap">
                <div className="flex items-center gap-3">
                    <Anchor className="h-5 w-5 text-brand-blue" />
                    <div>
                        <h3 className="font-bold text-white text-sm">Sailings</h3>
                        <p className="text-xs text-slate-500">
                            {sailings.length} sailings {includePast ? "(all time)" : "(future only)"}
                            {lastSyncedAt && ` · last synced ${new Date(lastSyncedAt).toLocaleString()}`}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        onClick={() => setIncludePast(!includePast)}
                        className="text-xs text-slate-400 hover:text-white h-9 px-3 rounded-lg border border-slate-800 hover:border-slate-700"
                    >
                        {includePast ? "Show future only" : "Include past sailings"}
                    </button>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <Input
                            placeholder="Search vessel, voyage, port..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 h-9 bg-slate-950 border-slate-800 text-white min-w-[260px]"
                        />
                    </div>
                    <Button
                        onClick={() => setSyncDialogOpen(true)}
                        className="bg-brand-blue hover:bg-brand-blue/90 text-white font-bold h-9"
                    >
                        <RefreshCcw className="mr-2 h-4 w-4" /> Sync from MetaShip
                    </Button>
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div className="flex items-center justify-center py-16 text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading sailings...
                </div>
            ) : sailings.length === 0 ? (
                <div className="text-center py-16 text-slate-500 border border-slate-800 rounded-xl bg-slate-950/30">
                    <Anchor className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="font-bold">No sailings synced yet</p>
                    <p className="text-sm mt-1">Click &quot;Sync from MetaShip&quot; to pull upcoming sailings.</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-16 text-slate-500 border border-slate-800 rounded-xl bg-slate-950/30">
                    <p className="text-sm">No sailings match &quot;{search}&quot;</p>
                </div>
            ) : (
                <div className="rounded-xl border border-slate-800 overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-900/80 border-slate-800">
                                <TableHead className="text-slate-400 text-xs font-bold uppercase">Vessel / Voyage</TableHead>
                                <TableHead className="text-slate-400 text-xs font-bold uppercase">Route</TableHead>
                                <TableHead className="text-slate-400 text-xs font-bold uppercase">ETD</TableHead>
                                <TableHead className="text-slate-400 text-xs font-bold uppercase">ETA</TableHead>
                                <TableHead className="text-slate-400 text-xs font-bold uppercase text-center">Transit</TableHead>
                                <TableHead className="text-slate-400 text-xs font-bold uppercase text-center">Service</TableHead>
                                <TableHead className="text-slate-400 text-xs font-bold uppercase text-center">Containers</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.map((s) => (
                                <TableRow key={s.id} className="border-slate-800 hover:bg-slate-900/50">
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <Ship className="h-3.5 w-3.5 text-brand-blue" />
                                                <span className="font-bold text-white text-sm">{s.vesselName}</span>
                                            </div>
                                            {s.voyageNumber && (
                                                <span className="text-[10px] text-slate-500 font-mono mt-0.5 ml-5">
                                                    Voyage {s.voyageNumber}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col text-xs">
                                            <span className="text-white">
                                                {s.portOfLoadCity || s.portOfLoadValue}
                                                <span className="text-slate-600 mx-1.5">→</span>
                                                {s.portOfDischargeCity || s.portOfDischargeValue}
                                            </span>
                                            <span className="text-[10px] text-slate-500 font-mono mt-0.5">
                                                {s.portOfLoadValue} → {s.portOfDischargeValue}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-slate-300 text-xs">
                                        <div className="flex items-center gap-1.5">
                                            <Calendar className="h-3 w-3 text-slate-500" />
                                            {formatDate(s.etd)}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-slate-300 text-xs">{formatDate(s.eta)}</TableCell>
                                    <TableCell className="text-center text-slate-400 text-xs font-mono">
                                        {s.transitTime ? `${s.transitTime}d` : "—"}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {s.serviceType ? (
                                            <Badge
                                                variant="outline"
                                                className={s.serviceType === "DIRECT"
                                                    ? "border-emerald-500/30 text-emerald-400 text-[10px]"
                                                    : "border-slate-600 text-slate-400 text-[10px]"
                                                }
                                            >
                                                {s.serviceType}
                                            </Badge>
                                        ) : (
                                            <span className="text-slate-600 text-xs">—</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {s.containerCount > 0 ? (
                                            <Badge className="bg-emerald-500/15 text-emerald-400 border-none font-mono">
                                                <Container className="h-3 w-3 mr-1" /> {s.containerCount}
                                            </Badge>
                                        ) : (
                                            <span className="text-slate-600 text-xs">—</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Sync Dialog */}
            <Dialog open={syncDialogOpen} onOpenChange={setSyncDialogOpen}>
                <DialogContent className="sm:max-w-[420px] bg-slate-950 border-slate-800 text-white">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-black">Sync Sailings from MetaShip</DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Pulls sailings for all origin × destination port pairs configured in Locations. MSC only.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Start Date</Label>
                                <Input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="bg-slate-900 border-slate-800 h-9 text-sm"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">End Date</Label>
                                <Input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="bg-slate-900 border-slate-800 h-9 text-sm"
                                />
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-500">
                            Tip: wider date ranges take longer because MetaShip requires separate queries per port pair.
                        </p>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="ghost" onClick={() => setSyncDialogOpen(false)} disabled={syncing} className="text-slate-400 hover:text-white hover:bg-slate-900">
                            Cancel
                        </Button>
                        <Button onClick={handleSync} disabled={syncing} className="bg-brand-blue hover:bg-brand-blue/90 text-white font-bold px-6">
                            {syncing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCcw className="h-4 w-4 mr-2" />}
                            {syncing ? "Syncing..." : "Start Sync"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
