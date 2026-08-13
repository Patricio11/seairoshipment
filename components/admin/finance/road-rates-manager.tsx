"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { NumericInput } from "@/components/ui/numeric-input"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Search, Plus, Pencil, Trash2, Loader2, Truck, Users, Globe } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { ROAD_ROUTES, roadRouteLabel } from "@/lib/road"
import { BulkDeleteBar } from "@/components/admin/bulk-delete-bar"

interface RoadRateRow {
    id: string
    userId: string | null
    route: string
    minPallets: number
    maxPallets: number
    transportCostPerPallet: string
    dropsIncluded: number
    additionalDropFee: string
    overhangFeePerPallet: string
    active: boolean
    createdAt: string
    updatedAt: string
    customerName: string | null
    customerEmail: string | null
    customerCompany: string | null
    accountNumber: string | null
}

interface CustomerOption {
    id: string
    name: string
    email: string
    companyName: string | null
    accountNumber: string | null
    vettingStatus: string
}

interface RateForm {
    userId: string       // "" = default rate line
    route: string
    minPallets: string
    maxPallets: string
    transportCostPerPallet: string
    dropsIncluded: string
    additionalDropFee: string
    overhangFeePerPallet: string
}

const EMPTY_FORM: RateForm = {
    userId: "",
    route: "",
    minPallets: "1",
    maxPallets: "28",
    transportCostPerPallet: "",
    dropsIncluded: "1",
    additionalDropFee: "",
    overhangFeePerPallet: "",
}

/** Sentinel for the "Default - all customers" choice in the Select (Radix
 *  SelectItem can't carry an empty-string value). */
const DEFAULT_SENTINEL = "__default__"

export function RoadRatesManager() {
    const [rates, setRates] = useState<RoadRateRow[]>([])
    const [customers, setCustomers] = useState<CustomerOption[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [selected, setSelected] = useState<Set<string>>(new Set())

    // Create / edit dialog
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingRate, setEditingRate] = useState<RoadRateRow | null>(null)
    const [form, setForm] = useState<RateForm>(EMPTY_FORM)
    const [saving, setSaving] = useState(false)

    // Single delete confirm
    const [deleteRate, setDeleteRate] = useState<RoadRateRow | null>(null)
    const [deleting, setDeleting] = useState(false)

    const fetchRates = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/road-rates", { cache: "no-store" })
            if (res.ok) setRates(await res.json())
        } catch { /* silently fail */ }
        finally { setLoading(false) }
    }, [])

    useEffect(() => {
        fetchRates()
        fetch("/api/admin/users/vetting", { cache: "no-store" })
            .then(r => r.json())
            .then(d => {
                if (Array.isArray(d.users)) {
                    setCustomers(d.users.filter((u: CustomerOption) => u.vettingStatus === "APPROVED"))
                }
            })
            .catch(() => { })
    }, [fetchRates])

    const filtered = useMemo(() => {
        const q = searchTerm.toLowerCase()
        return rates
            .filter(r => {
                if (!q) return true
                return r.route.toLowerCase().includes(q) ||
                    (r.customerName || "").toLowerCase().includes(q) ||
                    (r.customerCompany || "").toLowerCase().includes(q) ||
                    (r.customerEmail || "").toLowerCase().includes(q) ||
                    (r.accountNumber || "").toLowerCase().includes(q)
            })
            // Sort by route, defaults first within each route, then by band start
            .sort((a, b) =>
                a.route.localeCompare(b.route) ||
                Number(!!a.userId) - Number(!!b.userId) ||
                (a.customerCompany || a.customerName || "").localeCompare(b.customerCompany || b.customerName || "") ||
                a.minPallets - b.minPallets)
    }, [rates, searchTerm])

    const allVisibleSelected = filtered.length > 0 && filtered.every(r => selected.has(r.id))
    const toggleAll = () => {
        setSelected(prev => {
            const next = new Set(prev)
            if (allVisibleSelected) { for (const r of filtered) next.delete(r.id) }
            else { for (const r of filtered) next.add(r.id) }
            return next
        })
    }
    const toggleOne = (id: string) => {
        setSelected(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id); else next.add(id)
            return next
        })
    }

    const openCreate = () => {
        setEditingRate(null)
        setForm(EMPTY_FORM)
        setDialogOpen(true)
    }

    const openEdit = (rate: RoadRateRow) => {
        setEditingRate(rate)
        setForm({
            userId: rate.userId || "",
            route: rate.route,
            minPallets: String(rate.minPallets),
            maxPallets: String(rate.maxPallets),
            transportCostPerPallet: rate.transportCostPerPallet,
            dropsIncluded: String(rate.dropsIncluded),
            additionalDropFee: rate.additionalDropFee,
            overhangFeePerPallet: rate.overhangFeePerPallet,
        })
        setDialogOpen(true)
    }

    const handleSave = async () => {
        if (!editingRate && !form.route) { toast.error("Pick a route"); return }
        if (!(Number(form.transportCostPerPallet) > 0)) { toast.error("Transport cost per pallet must be greater than 0"); return }
        const minP = Math.floor(Number(form.minPallets))
        const maxP = Math.floor(Number(form.maxPallets))
        if (!(minP >= 1) || maxP < minP) { toast.error("Pallet band is invalid - max must be ≥ min"); return }

        setSaving(true)
        try {
            const isEdit = !!editingRate
            const bandFields = {
                minPallets: minP,
                maxPallets: maxP,
                transportCostPerPallet: form.transportCostPerPallet,
                dropsIncluded: Math.max(1, Math.floor(Number(form.dropsIncluded)) || 1),
                additionalDropFee: form.additionalDropFee || "0",
                overhangFeePerPallet: form.overhangFeePerPallet || "0",
            }
            const res = await fetch(isEdit ? `/api/admin/road-rates/${editingRate!.id}` : "/api/admin/road-rates", {
                method: isEdit ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(isEdit
                    ? bandFields
                    : { userId: form.userId || null, route: form.route, ...bandFields }),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
                toast.error(data.error || "Failed to save rate card")
                return
            }
            toast.success(isEdit ? "Rate card updated" : "Rate card created", {
                description: `${roadRouteLabel(isEdit ? editingRate!.route : form.route)}${form.userId ? "" : " · Default"}`,
            })
            setDialogOpen(false)
            fetchRates()
        } catch {
            toast.error("Failed to save rate card")
        } finally {
            setSaving(false)
        }
    }

    const handleToggleActive = async (rate: RoadRateRow) => {
        try {
            const res = await fetch(`/api/admin/road-rates/${rate.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ active: !rate.active }),
            })
            if (res.ok) {
                setRates(prev => prev.map(r => r.id === rate.id ? { ...r, active: !rate.active } : r))
            } else {
                const data = await res.json().catch(() => ({}))
                toast.error(data.error || "Failed to update")
            }
        } catch {
            toast.error("Failed to update")
        }
    }

    const handleDelete = async () => {
        if (!deleteRate) return
        setDeleting(true)
        try {
            const res = await fetch(`/api/admin/road-rates/${deleteRate.id}`, { method: "DELETE" })
            if (res.ok) {
                toast.success("Rate card deleted")
                setDeleteRate(null)
                fetchRates()
            } else {
                const data = await res.json().catch(() => ({}))
                toast.error(data.error || "Failed to delete")
            }
        } catch {
            toast.error("Failed to delete")
        } finally {
            setDeleting(false)
        }
    }

    const fmt = (v: string) => `R ${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                        placeholder="Search route, customer, account no…"
                        className="pl-10 h-10 bg-slate-950 border-slate-800 text-white"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                    <Plus className="mr-2 h-4 w-4" /> Add Rate Card
                </Button>
            </div>

            {/* Table */}
            <Card className="overflow-hidden bg-slate-900 border-slate-800 shadow-none py-0">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-950 border-slate-800 hover:bg-slate-950">
                            <TableHead className="w-10">
                                <Checkbox checked={allVisibleSelected} onCheckedChange={toggleAll} aria-label="Select all rate cards" />
                            </TableHead>
                            <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Customer</TableHead>
                            <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Route</TableHead>
                            <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] text-center">Pallets</TableHead>
                            <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] text-right">Transport / Pallet</TableHead>
                            <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] text-center">Drops Incl.</TableHead>
                            <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] text-right">Extra Drop</TableHead>
                            <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] text-right">Overhang / Pallet</TableHead>
                            <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] text-center">Active</TableHead>
                            <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow className="border-slate-800">
                                <TableCell colSpan={10} className="text-center py-12 text-slate-500">
                                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" /> Loading road rates…
                                </TableCell>
                            </TableRow>
                        ) : filtered.length === 0 ? (
                            <TableRow className="border-slate-800 hover:bg-transparent">
                                <TableCell colSpan={10} className="text-center py-14 text-slate-500">
                                    <Truck className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                    <p className="font-bold text-slate-400">No road rate cards yet</p>
                                    <p className="text-xs mt-1">Add a default card per corridor, then per-customer cards for special structures.</p>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filtered.map(rate => (
                                <TableRow key={rate.id} className={cn("border-slate-800 hover:bg-slate-950/60", selected.has(rate.id) && "bg-red-950/20")}>
                                    <TableCell>
                                        <Checkbox checked={selected.has(rate.id)} onCheckedChange={() => toggleOne(rate.id)} aria-label="Select rate card" />
                                    </TableCell>
                                    <TableCell>
                                        {rate.userId ? (
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-white flex items-center gap-1.5">
                                                    <Users className="h-3 w-3 text-slate-500" />
                                                    {rate.customerCompany || rate.customerName || "—"}
                                                </span>
                                                <span className="text-[10px] text-slate-500 font-mono">{rate.accountNumber || rate.customerEmail}</span>
                                            </div>
                                        ) : (
                                            <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-[10px] uppercase tracking-widest font-black">
                                                <Globe className="h-3 w-3 mr-1" /> Default
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-sm text-white font-semibold">{roadRouteLabel(rate.route)}</span>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge className="bg-slate-800 text-slate-300 border-none font-mono text-[11px]">
                                            {rate.minPallets === rate.maxPallets ? rate.minPallets : `${rate.minPallets}-${rate.maxPallets}`}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-sm font-bold text-white">
                                        {fmt(rate.transportCostPerPallet)}
                                    </TableCell>
                                    <TableCell className="text-center font-mono text-sm text-slate-300">
                                        {rate.dropsIncluded}
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-sm text-slate-300">
                                        {fmt(rate.additionalDropFee)}
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-sm text-slate-300">
                                        {fmt(rate.overhangFeePerPallet)}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Switch
                                            checked={rate.active}
                                            onCheckedChange={() => handleToggleActive(rate)}
                                            className="data-[state=checked]:bg-emerald-600"
                                        />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => openEdit(rate)} className="h-8 w-8 text-slate-500 hover:text-white hover:bg-slate-800">
                                                <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => setDeleteRate(rate)} className="h-8 w-8 text-slate-500 hover:text-red-400 hover:bg-red-950/30">
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>

            {/* Create / Edit dialog */}
            <Dialog open={dialogOpen} onOpenChange={(o) => !saving && setDialogOpen(o)}>
                <DialogContent className="dark bg-slate-950 border-slate-800 text-white sm:max-w-[440px]">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black tracking-tight flex items-center gap-2">
                            <Truck className="h-5 w-5 text-emerald-500" />
                            {editingRate ? "EDIT RATE CARD" : "ADD RATE CARD"}
                        </DialogTitle>
                        <DialogDescription className="text-slate-400 font-mono text-[10px] uppercase tracking-widest">
                            {editingRate
                                ? `${roadRouteLabel(editingRate.route)} · ${editingRate.userId ? (editingRate.customerCompany || editingRate.customerName) : "Default"}`
                                : "Per-customer road freight pricing - the 3 cost lines"}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {!editingRate && (
                            <>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Customer</Label>
                                    <Select
                                        value={form.userId || DEFAULT_SENTINEL}
                                        onValueChange={(v) => setForm({ ...form, userId: v === DEFAULT_SENTINEL ? "" : v })}
                                    >
                                        <SelectTrigger className="bg-slate-900 border-slate-800 h-9 text-sm">
                                            <SelectValue placeholder="Default - all customers" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-slate-800 text-white max-h-[260px]">
                                            <SelectItem value={DEFAULT_SENTINEL}>Default - all customers</SelectItem>
                                            {customers.map(c => (
                                                <SelectItem key={c.id} value={c.id}>
                                                    {c.companyName || c.name}{c.accountNumber ? ` (${c.accountNumber})` : ""}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-[10px] text-slate-500">
                                        The customer-specific card wins at quote time; the Default card covers everyone else.
                                    </p>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Route</Label>
                                    <Select value={form.route} onValueChange={(v) => setForm({ ...form, route: v })}>
                                        <SelectTrigger className="bg-slate-900 border-slate-800 h-9 text-sm">
                                            <SelectValue placeholder="Select corridor" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                            {ROAD_ROUTES.map(r => (
                                                <SelectItem key={r.code} value={r.code}>{r.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </>
                        )}

                        {/* Pallet band + drops included - the Britos-card tier model */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Pallets From</Label>
                                <NumericInput
                                    value={form.minPallets}
                                    onChange={(e) => setForm({ ...form, minPallets: e.target.value })}
                                    placeholder="1"
                                    className="bg-slate-900 border-slate-800 h-9 text-sm font-mono text-center"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Pallets To</Label>
                                <NumericInput
                                    value={form.maxPallets}
                                    onChange={(e) => setForm({ ...form, maxPallets: e.target.value })}
                                    placeholder="28"
                                    className="bg-slate-900 border-slate-800 h-9 text-sm font-mono text-center"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Drops Included</Label>
                                <NumericInput
                                    value={form.dropsIncluded}
                                    onChange={(e) => setForm({ ...form, dropsIncluded: e.target.value })}
                                    placeholder="1"
                                    className="bg-slate-900 border-slate-800 h-9 text-sm font-mono text-center"
                                />
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-500 -mt-2">
                            One line per band, e.g. 1 / 2-3 / 4-6 / 7-9… Bands can&apos;t overlap for the same customer + route.
                        </p>

                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Transport Cost per Pallet (ZAR)</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-sm">R</span>
                                <NumericInput
                                    value={form.transportCostPerPallet}
                                    onChange={(e) => setForm({ ...form, transportCostPerPallet: e.target.value })}
                                    placeholder="0.00"
                                    className="bg-slate-900 border-slate-800 h-9 text-sm font-mono pl-8 text-right"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Fee per Additional Drop</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-sm">R</span>
                                    <NumericInput
                                        value={form.additionalDropFee}
                                        onChange={(e) => setForm({ ...form, additionalDropFee: e.target.value })}
                                        placeholder="0.00"
                                        className="bg-slate-900 border-slate-800 h-9 text-sm font-mono pl-8 text-right"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Overhang Fee / Pallet</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-sm">R</span>
                                    <NumericInput
                                        value={form.overhangFeePerPallet}
                                        onChange={(e) => setForm({ ...form, overhangFeePerPallet: e.target.value })}
                                        placeholder="0.00"
                                        className="bg-slate-900 border-slate-800 h-9 text-sm font-mono pl-8 text-right"
                                    />
                                </div>
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-500">
                            Delivery points beyond the included count are charged the additional-drop fee each. Overhang fee is charged per pallet when the customer flags overhang.
                        </p>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDialogOpen(false)} disabled={saving} className="text-slate-400 hover:text-white hover:bg-slate-900">
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-6">
                            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            {editingRate ? "Update" : "Create"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Single delete confirm */}
            <Dialog open={!!deleteRate} onOpenChange={(o) => !deleting && !o && setDeleteRate(null)}>
                <DialogContent className="dark bg-slate-950 border-slate-800 text-white sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black">Delete Rate Card</DialogTitle>
                        <DialogDescription className="text-slate-400">
                            {deleteRate && (
                                <>Delete the {deleteRate.userId ? (deleteRate.customerCompany || deleteRate.customerName) : "Default"} card for {roadRouteLabel(deleteRate.route)}? Bookings already made keep their quoted price; new bookings fall back to the default card (or become unquotable if none exists).</>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDeleteRate(null)} disabled={deleting} className="text-slate-400">Cancel</Button>
                        <Button onClick={handleDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700 text-white font-bold">
                            {deleting && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <BulkDeleteBar
                count={selected.size}
                resourceLabel="rate card"
                resourceLabelPlural="rate cards"
                endpoint="/api/admin/road-rates/bulk-delete"
                ids={Array.from(selected)}
                onDeleted={() => { setSelected(new Set()); fetchRates() }}
                onClearSelection={() => setSelected(new Set())}
            />
        </div>
    )
}
