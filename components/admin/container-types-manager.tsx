"use client"

import { useState, useEffect, useCallback } from "react"
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
import { Plus, Pencil, Trash2, Loader2, Container, Snowflake, Sun } from "lucide-react"
import { toast } from "sonner"
import { Switch } from "@/components/ui/switch"

interface ContainerType {
    id: string
    size: string
    type: string
    variant: string | null
    code: string
    displayName: string
    maxPallets: number
    active: boolean
    createdAt: string
    updatedAt: string
}

interface FormData {
    size: "20FT" | "40FT"
    type: "REEFER" | "DRY"
    variant: "STD" | "HC"
    displayName: string
    maxPallets: number
    active: boolean
}

const EMPTY_FORM: FormData = {
    size: "40FT",
    type: "REEFER",
    variant: "STD",
    displayName: "",
    maxPallets: 20,
    active: true,
}

function generateId(size: string, type: string, variant: string) {
    return `${size.toLowerCase()}-${type.toLowerCase()}-${variant.toLowerCase()}`
}

function generateCode(size: string, type: string, variant: string) {
    return `${size}-${type}-${variant}`
}

function generateDisplayName(size: string, type: string, variant: string) {
    const s = size === "20FT" ? "20ft" : "40ft"
    const v = variant === "HC" ? "HC " : ""
    const t = type === "REEFER" ? "Reefer" : "Dry Container"
    return `${s} ${v}${t}`
}

export function ContainerTypesManager() {
    const [types, setTypes] = useState<ContainerType[]>([])
    const [loading, setLoading] = useState(true)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingType, setEditingType] = useState<ContainerType | null>(null)
    const [formData, setFormData] = useState<FormData>(EMPTY_FORM)
    const [saving, setSaving] = useState(false)
    const [deleteDialog, setDeleteDialog] = useState<ContainerType | null>(null)
    const [deleting, setDeleting] = useState(false)

    const fetchTypes = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/container-types")
            if (res.ok) setTypes(await res.json())
        } catch {
            console.error("Failed to fetch container types")
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchTypes()
    }, [fetchTypes])

    const handleOpenCreate = () => {
        setEditingType(null)
        setFormData(EMPTY_FORM)
        setDialogOpen(true)
    }

    const handleOpenEdit = (ct: ContainerType) => {
        setEditingType(ct)
        setFormData({
            size: ct.size as "20FT" | "40FT",
            type: ct.type as "REEFER" | "DRY",
            variant: (ct.variant || "STD") as "STD" | "HC",
            displayName: ct.displayName,
            maxPallets: ct.maxPallets,
            active: ct.active,
        })
        setDialogOpen(true)
    }

    const handleSave = async () => {
        if (!formData.displayName.trim()) {
            toast.error("Display name is required")
            return
        }
        if (formData.maxPallets < 1) {
            toast.error("Max pallets must be at least 1")
            return
        }

        setSaving(true)
        try {
            if (editingType) {
                // Update
                const res = await fetch("/api/admin/container-types", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        id: editingType.id,
                        displayName: formData.displayName,
                        maxPallets: formData.maxPallets,
                        active: formData.active,
                    }),
                })
                if (res.ok) {
                    toast.success("Container type updated")
                    setDialogOpen(false)
                    fetchTypes()
                } else {
                    const data = await res.json()
                    toast.error(data.error || "Failed to update")
                }
            } else {
                // Create
                const id = generateId(formData.size, formData.type, formData.variant)
                const code = generateCode(formData.size, formData.type, formData.variant)
                const res = await fetch("/api/admin/container-types", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        id,
                        size: formData.size,
                        type: formData.type,
                        variant: formData.variant,
                        code,
                        displayName: formData.displayName || generateDisplayName(formData.size, formData.type, formData.variant),
                        maxPallets: formData.maxPallets,
                        active: formData.active,
                    }),
                })
                if (res.ok) {
                    toast.success("Container type created")
                    setDialogOpen(false)
                    fetchTypes()
                } else {
                    const data = await res.json()
                    toast.error(data.error || "Failed to create")
                }
            }
        } catch {
            toast.error("Failed to save container type")
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!deleteDialog) return
        setDeleting(true)
        try {
            const res = await fetch("/api/admin/container-types", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: deleteDialog.id }),
            })
            if (res.ok) {
                toast.success("Container type deleted")
                setDeleteDialog(null)
                fetchTypes()
            } else {
                const data = await res.json()
                toast.error(data.error || "Failed to delete")
            }
        } catch {
            toast.error("Failed to delete container type")
        } finally {
            setDeleting(false)
        }
    }

    const handleToggleActive = async (ct: ContainerType) => {
        try {
            const res = await fetch("/api/admin/container-types", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: ct.id, active: !ct.active }),
            })
            if (res.ok) {
                toast.success(`${ct.displayName} ${ct.active ? "deactivated" : "activated"}`)
                fetchTypes()
            }
        } catch {
            toast.error("Failed to toggle status")
        }
    }

    // Auto-generate display name when size/type/variant changes (create mode only)
    const handleFormChange = (updates: Partial<FormData>) => {
        setFormData(prev => {
            const next = { ...prev, ...updates }
            if (!editingType && ('size' in updates || 'type' in updates || 'variant' in updates)) {
                next.displayName = generateDisplayName(next.size, next.type, next.variant)
                // Auto-set default capacity
                if (next.size === "20FT") {
                    next.maxPallets = next.type === "DRY" ? 11 : 10
                } else {
                    next.maxPallets = next.type === "DRY" ? 22 : 20
                }
            }
            return next
        })
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                <div className="flex items-center gap-3">
                    <Container className="h-5 w-5 text-brand-blue" />
                    <div>
                        <h3 className="font-bold text-white text-sm">Container Types</h3>
                        <p className="text-xs text-slate-500">{types.length} types configured</p>
                    </div>
                </div>
                <Button className="bg-brand-blue hover:bg-brand-blue/90 text-white font-bold h-9" onClick={handleOpenCreate}>
                    <Plus className="mr-2 h-4 w-4" /> Add Type
                </Button>
            </div>

            {/* Table */}
            {loading ? (
                <div className="flex items-center justify-center py-12 text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...
                </div>
            ) : (
                <div className="rounded-xl border border-slate-800 overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-900/80 border-slate-800">
                                <TableHead className="text-slate-400 text-xs font-bold uppercase">Type</TableHead>
                                <TableHead className="text-slate-400 text-xs font-bold uppercase">Size</TableHead>
                                <TableHead className="text-slate-400 text-xs font-bold uppercase">Category</TableHead>
                                <TableHead className="text-slate-400 text-xs font-bold uppercase">Variant</TableHead>
                                <TableHead className="text-slate-400 text-xs font-bold uppercase text-center">Max Pallets</TableHead>
                                <TableHead className="text-slate-400 text-xs font-bold uppercase text-center">Service</TableHead>
                                <TableHead className="text-slate-400 text-xs font-bold uppercase text-center">Active</TableHead>
                                <TableHead className="text-slate-400 text-xs font-bold uppercase text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {types.map((ct) => (
                                <TableRow key={ct.id} className="border-slate-800 hover:bg-slate-900/50">
                                    <TableCell className="font-bold text-white">
                                        <div className="flex items-center gap-2">
                                            {ct.type === "REEFER" ? (
                                                <Snowflake className="h-4 w-4 text-sky-400" />
                                            ) : (
                                                <Sun className="h-4 w-4 text-amber-400" />
                                            )}
                                            {ct.displayName}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-slate-300 font-mono text-sm">{ct.size}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={ct.type === "REEFER" ? "border-sky-500/30 text-sky-400" : "border-amber-500/30 text-amber-400"}>
                                            {ct.type}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-slate-400 text-sm">{ct.variant || "STD"}</TableCell>
                                    <TableCell className="text-center">
                                        <span className="font-mono font-bold text-white text-lg">{ct.maxPallets}</span>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge className={ct.type === "REEFER" ? "bg-blue-500/20 text-blue-400 border-none" : "bg-emerald-500/20 text-emerald-400 border-none"}>
                                            {ct.type === "REEFER" ? "SRS" : "SCS"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Switch
                                            checked={ct.active}
                                            onCheckedChange={() => handleToggleActive(ct)}
                                            className="data-[state=checked]:bg-brand-blue"
                                        />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-slate-500 hover:text-white hover:bg-slate-800"
                                                onClick={() => handleOpenEdit(ct)}
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-slate-500 hover:text-red-400 hover:bg-red-950/30"
                                                onClick={() => setDeleteDialog(ct)}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[480px] bg-slate-950 border-slate-800 text-white">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-black">
                            {editingType ? "Edit Container Type" : "New Container Type"}
                        </DialogTitle>
                        <DialogDescription className="text-slate-400">
                            {editingType ? "Update display name, capacity, or status." : "Define a new container type with size, category, and capacity."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {!editingType && (
                            <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Size</Label>
                                    <Select value={formData.size} onValueChange={(v) => handleFormChange({ size: v as "20FT" | "40FT" })}>
                                        <SelectTrigger className="bg-slate-900 border-slate-800 h-9 text-sm">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                            <SelectItem value="20FT">20FT</SelectItem>
                                            <SelectItem value="40FT">40FT</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Category</Label>
                                    <Select value={formData.type} onValueChange={(v) => handleFormChange({ type: v as "REEFER" | "DRY" })}>
                                        <SelectTrigger className="bg-slate-900 border-slate-800 h-9 text-sm">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                            <SelectItem value="REEFER">Reefer</SelectItem>
                                            <SelectItem value="DRY">Dry</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Variant</Label>
                                    <Select value={formData.variant} onValueChange={(v) => handleFormChange({ variant: v as "STD" | "HC" })}>
                                        <SelectTrigger className="bg-slate-900 border-slate-800 h-9 text-sm">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                            <SelectItem value="STD">Standard</SelectItem>
                                            <SelectItem value="HC">High Cube</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Display Name</Label>
                            <Input
                                value={formData.displayName}
                                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                                placeholder="e.g. 40ft HC Reefer"
                                className="bg-slate-900 border-slate-800 h-9 text-sm"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Max Pallets</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    value={formData.maxPallets}
                                    onChange={(e) => setFormData({ ...formData, maxPallets: parseInt(e.target.value) || 0 })}
                                    className="bg-slate-900 border-slate-800 h-9 text-sm font-mono"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Status</Label>
                                <div className="flex items-center gap-2 h-9">
                                    <Switch
                                        checked={formData.active}
                                        onCheckedChange={(v) => setFormData({ ...formData, active: v })}
                                        className="data-[state=checked]:bg-brand-blue"
                                    />
                                    <span className="text-sm text-slate-400">{formData.active ? "Active" : "Inactive"}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="ghost" onClick={() => setDialogOpen(false)} className="text-slate-400 hover:text-white hover:bg-slate-900">
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={saving} className="bg-brand-blue hover:bg-brand-blue/90 text-white font-bold px-6">
                            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            {saving ? "Saving..." : editingType ? "Update" : "Create"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
                <DialogContent className="bg-slate-950 border-slate-800 text-white max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-black">Delete Container Type</DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Are you sure you want to delete <span className="text-white font-bold">{deleteDialog?.displayName}</span>? This cannot be undone and may affect existing containers and rates.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="ghost" onClick={() => setDeleteDialog(null)} className="text-slate-400 hover:text-white hover:bg-slate-900">
                            Cancel
                        </Button>
                        <Button onClick={handleDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700 text-white font-bold">
                            {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            {deleting ? "Deleting..." : "Delete"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
