"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
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
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Layers,
    Loader2,
    Plus,
    Pencil,
    Trash2,
    Container,
    Apple,
    FileText,
    Snowflake,
    Sun,
    Search,
    X,
    ArrowLeft,
    CheckSquare,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { DOCUMENT_TYPES, documentLabel } from "@/lib/constants/document-types"

type Temperature = "frozen" | "chilled" | "ambient"

interface Category {
    id: string
    name: string
    description: string | null
    salesRateTypeId: "srs" | "scs"
    allowedTemperatures: Temperature[]
    requiredDocuments: string[]
    active: boolean
    createdAt: string
    updatedAt: string
    productCount: number
    containerCount: number
}

interface ProductOption {
    id: string
    name: string
    hsCode: string
    description: string
    categoryId: string | null
    active: boolean
}

interface CategoryDetail extends Category {
    products: Array<{ id: string; name: string; hsCode: string; description: string; active: boolean }>
}

const ALL_TEMPS: Array<{ value: Temperature; label: string; icon: typeof Snowflake }> = [
    { value: "frozen", label: "-18°C Frozen", icon: Snowflake },
    { value: "chilled", label: "+5°C Chilled", icon: Snowflake },
    { value: "ambient", label: "+18°C Ambient", icon: Sun },
]

function tempLabel(t: Temperature) {
    return ALL_TEMPS.find(x => x.value === t)?.label || t
}

export function CategoriesManager() {
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [serviceFilter, setServiceFilter] = useState<"all" | "srs" | "scs">("all")

    // Create/edit dialog
    const [formOpen, setFormOpen] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [form, setForm] = useState<{
        name: string
        description: string
        salesRateTypeId: "srs" | "scs"
        allowedTemperatures: Temperature[]
        requiredDocuments: string[]
        active: boolean
    }>({
        name: "",
        description: "",
        salesRateTypeId: "srs",
        allowedTemperatures: [],
        requiredDocuments: [],
        active: true,
    })
    const [saving, setSaving] = useState(false)

    // Detail view (for managing products)
    const [detailCat, setDetailCat] = useState<CategoryDetail | null>(null)
    const [loadingDetail, setLoadingDetail] = useState(false)
    const [allProducts, setAllProducts] = useState<ProductOption[]>([])
    const [assignSearch, setAssignSearch] = useState("")
    const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set())
    const [assigning, setAssigning] = useState(false)

    // Delete confirm
    const [deleteDialog, setDeleteDialog] = useState<Category | null>(null)
    const [deleting, setDeleting] = useState(false)

    // Seed
    const [seeding, setSeeding] = useState(false)
    const handleSeed = async () => {
        setSeeding(true)
        try {
            const res = await fetch("/api/admin/product-categories/seed", { method: "POST" })
            const data = await res.json()
            if (!res.ok) {
                toast.error(data.error || "Seed failed")
                return
            }
            toast.success(`Seeded ${data.created} categor${data.created === 1 ? "y" : "ies"}`, {
                description: data.skipped > 0 ? `${data.skipped} already existed and were skipped.` : undefined,
            })
            fetchCategories()
        } catch {
            toast.error("Seed failed")
        } finally {
            setSeeding(false)
        }
    }

    const fetchCategories = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch("/api/admin/product-categories")
            if (res.ok) setCategories(await res.json())
        } catch {
            toast.error("Failed to fetch categories")
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchCategories()
    }, [fetchCategories])

    const openCreate = () => {
        setEditingId(null)
        setForm({
            name: "",
            description: "",
            salesRateTypeId: "srs",
            allowedTemperatures: ["frozen"],
            requiredDocuments: ["COMMERCIAL_INVOICE", "PACKING_LIST", "BILL_OF_LADING"],
            active: true,
        })
        setFormOpen(true)
    }

    const openEdit = (cat: Category) => {
        setEditingId(cat.id)
        setForm({
            name: cat.name,
            description: cat.description || "",
            salesRateTypeId: cat.salesRateTypeId,
            allowedTemperatures: cat.allowedTemperatures,
            requiredDocuments: cat.requiredDocuments,
            active: cat.active,
        })
        setFormOpen(true)
    }

    const handleServiceTypeChange = (v: "srs" | "scs") => {
        setForm(prev => ({
            ...prev,
            salesRateTypeId: v,
            // SCS is ambient-only; SRS can't be ambient
            allowedTemperatures: v === "scs"
                ? ["ambient"]
                : prev.allowedTemperatures.filter(t => t !== "ambient"),
        }))
    }

    const toggleTemp = (t: Temperature) => {
        setForm(prev => {
            // SCS categories are locked to ambient
            if (prev.salesRateTypeId === "scs") return { ...prev, allowedTemperatures: ["ambient"] }
            // SRS can't select ambient
            if (t === "ambient") return prev
            const has = prev.allowedTemperatures.includes(t)
            const next = has
                ? prev.allowedTemperatures.filter(x => x !== t)
                : [...prev.allowedTemperatures, t]
            return { ...prev, allowedTemperatures: next as Temperature[] }
        })
    }

    const toggleDoc = (code: string) => {
        setForm(prev => {
            const has = prev.requiredDocuments.includes(code)
            return {
                ...prev,
                requiredDocuments: has
                    ? prev.requiredDocuments.filter(c => c !== code)
                    : [...prev.requiredDocuments, code],
            }
        })
    }

    const handleSave = async () => {
        if (!form.name.trim()) {
            toast.error("Name is required")
            return
        }
        if (form.allowedTemperatures.length === 0) {
            toast.error("Pick at least one allowed temperature")
            return
        }
        setSaving(true)
        try {
            const url = editingId
                ? `/api/admin/product-categories/${editingId}`
                : "/api/admin/product-categories"
            const method = editingId ? "PATCH" : "POST"
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            })
            const data = await res.json()
            if (!res.ok) {
                toast.error(data.error || "Failed to save")
                return
            }
            toast.success(editingId ? "Category updated" : "Category created")
            setFormOpen(false)
            fetchCategories()
        } catch {
            toast.error("Failed to save category")
        } finally {
            setSaving(false)
        }
    }

    const handleToggleActive = async (cat: Category) => {
        try {
            const res = await fetch(`/api/admin/product-categories/${cat.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ active: !cat.active }),
            })
            if (res.ok) {
                setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, active: !c.active } : c))
                toast.success(`${cat.name} ${cat.active ? "deactivated" : "activated"}`)
            } else {
                toast.error("Failed to update")
            }
        } catch {
            toast.error("Failed to update")
        }
    }

    const handleDelete = async () => {
        if (!deleteDialog) return
        setDeleting(true)
        try {
            const res = await fetch(`/api/admin/product-categories/${deleteDialog.id}`, { method: "DELETE" })
            const data = await res.json()
            if (!res.ok) {
                toast.error(data.error || "Failed to delete")
                return
            }
            toast.success("Category deleted")
            setDeleteDialog(null)
            fetchCategories()
        } catch {
            toast.error("Failed to delete")
        } finally {
            setDeleting(false)
        }
    }

    const openDetail = async (cat: Category) => {
        setLoadingDetail(true)
        try {
            const [detailRes, productsRes] = await Promise.all([
                fetch(`/api/admin/product-categories/${cat.id}`),
                fetch("/api/admin/products"),
            ])
            if (detailRes.ok) setDetailCat(await detailRes.json())
            if (productsRes.ok) setAllProducts(await productsRes.json())
            setSelectedProductIds(new Set())
            setAssignSearch("")
        } catch {
            toast.error("Failed to load category detail")
        } finally {
            setLoadingDetail(false)
        }
    }

    const refreshDetail = async () => {
        if (!detailCat) return
        try {
            const [detailRes, productsRes] = await Promise.all([
                fetch(`/api/admin/product-categories/${detailCat.id}`),
                fetch("/api/admin/products"),
            ])
            if (detailRes.ok) setDetailCat(await detailRes.json())
            if (productsRes.ok) setAllProducts(await productsRes.json())
            fetchCategories()
        } catch {
            // ignore
        }
    }

    const assignableProducts = useMemo(() => {
        // products not already in this category (could be uncategorised or in another)
        return allProducts
            .filter(p => p.categoryId !== detailCat?.id)
            .filter(p => {
                if (!assignSearch) return true
                const q = assignSearch.toLowerCase()
                return p.name.toLowerCase().includes(q) || p.hsCode.toLowerCase().includes(q)
            })
            .slice(0, 200)
    }, [allProducts, detailCat?.id, assignSearch])

    const handleAssign = async () => {
        if (!detailCat || selectedProductIds.size === 0) return
        setAssigning(true)
        try {
            const res = await fetch(`/api/admin/product-categories/${detailCat.id}/products`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productIds: Array.from(selectedProductIds) }),
            })
            const data = await res.json()
            if (!res.ok) {
                toast.error(data.error || "Failed to assign")
                return
            }
            toast.success(`Assigned ${data.assigned} product${data.assigned === 1 ? "" : "s"}`)
            setSelectedProductIds(new Set())
            refreshDetail()
        } catch {
            toast.error("Failed to assign products")
        } finally {
            setAssigning(false)
        }
    }

    const handleUnassign = async (productId: string) => {
        if (!detailCat) return
        try {
            const res = await fetch(`/api/admin/product-categories/${detailCat.id}/products`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productIds: [productId] }),
            })
            if (res.ok) {
                toast.success("Product removed from category")
                refreshDetail()
            } else {
                toast.error("Failed to remove")
            }
        } catch {
            toast.error("Failed to remove")
        }
    }

    const filtered = categories.filter(c => {
        if (serviceFilter !== "all" && c.salesRateTypeId !== serviceFilter) return false
        if (!search) return true
        const q = search.toLowerCase()
        return c.name.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q)
    })

    // Detail view
    if (detailCat) {
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => setDetailCat(null)} className="text-slate-400 hover:text-white">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex-1">
                        <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                            {detailCat.name}
                            <Badge className={detailCat.salesRateTypeId === "srs" ? "bg-blue-500/15 text-blue-400 border-none" : "bg-emerald-500/15 text-emerald-400 border-none"}>
                                {detailCat.salesRateTypeId.toUpperCase()}
                            </Badge>
                            {!detailCat.active && <Badge className="bg-slate-700 text-slate-400 border-none">INACTIVE</Badge>}
                        </h2>
                        {detailCat.description && <p className="text-sm text-slate-500 mt-0.5">{detailCat.description}</p>}
                    </div>
                    <Button onClick={() => openEdit(detailCat)} variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
                        <Pencil className="h-3.5 w-3.5 mr-2" /> Edit category
                    </Button>
                </div>

                {/* Spec summary */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Allowed Temperatures</p>
                        <div className="flex flex-wrap gap-1.5">
                            {detailCat.allowedTemperatures.map(t => {
                                const opt = ALL_TEMPS.find(x => x.value === t)
                                const Icon = opt?.icon || Snowflake
                                return (
                                    <Badge key={t} variant="outline" className={
                                        t === "ambient"
                                            ? "border-amber-500/40 text-amber-400"
                                            : "border-sky-500/40 text-sky-400"
                                    }>
                                        <Icon className="h-3 w-3 mr-1" /> {opt?.label || t}
                                    </Badge>
                                )
                            })}
                        </div>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                            Required Documents ({detailCat.requiredDocuments.length})
                        </p>
                        <div className="flex flex-wrap gap-1">
                            {detailCat.requiredDocuments.length === 0 ? (
                                <span className="text-xs text-slate-600 italic">No required documents set</span>
                            ) : (
                                detailCat.requiredDocuments.map(code => (
                                    <Badge key={code} variant="outline" className="border-slate-700 text-slate-300 text-[10px]">
                                        {documentLabel(code)}
                                    </Badge>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Assigned products */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/30 overflow-hidden">
                    <div className="p-4 flex items-center justify-between border-b border-slate-800">
                        <div className="flex items-center gap-2">
                            <Apple className="h-4 w-4 text-brand-blue" />
                            <h3 className="font-bold text-white text-sm">Assigned Products</h3>
                            <Badge className="bg-slate-800 text-slate-300 border-none">{detailCat.products.length}</Badge>
                        </div>
                    </div>
                    {detailCat.products.length === 0 ? (
                        <div className="py-8 text-center text-slate-500 text-sm">
                            No products assigned yet. Use the picker below to add products.
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-800">
                            {detailCat.products.map(p => (
                                <div key={p.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-900/50">
                                    <div className="flex flex-col">
                                        <span className="text-sm text-white font-medium">{p.name}</span>
                                        {p.hsCode && <span className="text-[10px] text-slate-500 font-mono">HS {p.hsCode}</span>}
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleUnassign(p.id)}
                                        className="h-7 w-7 text-slate-500 hover:text-red-400"
                                        title="Remove from category"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Add products */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/30 overflow-hidden">
                    <div className="p-4 border-b border-slate-800">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Plus className="h-4 w-4 text-brand-blue" />
                                <h3 className="font-bold text-white text-sm">Add Products</h3>
                            </div>
                            <Button
                                onClick={handleAssign}
                                disabled={assigning || selectedProductIds.size === 0}
                                className="bg-brand-blue hover:bg-brand-blue/90 text-white font-bold h-8"
                            >
                                {assigning ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <CheckSquare className="h-3.5 w-3.5 mr-1.5" />}
                                Assign {selectedProductIds.size > 0 ? `(${selectedProductIds.size})` : ""}
                            </Button>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                            <Input
                                placeholder="Search products by name or HS code…"
                                value={assignSearch}
                                onChange={(e) => setAssignSearch(e.target.value)}
                                className="pl-10 h-9 bg-slate-950 border-slate-800 text-white"
                            />
                        </div>
                    </div>
                    {assignableProducts.length === 0 ? (
                        <div className="py-8 text-center text-slate-500 text-sm">
                            {allProducts.length === 0
                                ? "No products synced yet. Go to Products → Sync from MetaShip first."
                                : "No other products to add — all are already assigned or match no filter."}
                        </div>
                    ) : (
                        <div className="max-h-[320px] overflow-y-auto">
                            {assignableProducts.map(p => (
                                <label
                                    key={p.id}
                                    className="flex items-center gap-3 px-4 py-2 hover:bg-slate-900/50 cursor-pointer border-b border-slate-800 last:border-0"
                                >
                                    <Checkbox
                                        checked={selectedProductIds.has(p.id)}
                                        onCheckedChange={(checked) => {
                                            setSelectedProductIds(prev => {
                                                const next = new Set(prev)
                                                if (checked) next.add(p.id)
                                                else next.delete(p.id)
                                                return next
                                            })
                                        }}
                                    />
                                    <div className="flex-1">
                                        <div className="text-sm text-white font-medium">{p.name}</div>
                                        <div className="text-[10px] text-slate-500 font-mono">
                                            {p.hsCode && <>HS {p.hsCode}</>}
                                            {p.categoryId && <span className="text-amber-400 ml-2">· currently in another category</span>}
                                        </div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        )
    }

    // List view
    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex-wrap">
                <div className="flex items-center gap-3">
                    <Layers className="h-5 w-5 text-brand-blue" />
                    <div>
                        <h3 className="font-bold text-white text-sm">Product Categories</h3>
                        <p className="text-xs text-slate-500">
                            {categories.length} total · {categories.filter(c => c.active).length} active
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg">
                        {(["all", "srs", "scs"] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setServiceFilter(f)}
                                className={cn(
                                    "px-3 h-7 rounded text-[10px] font-bold uppercase tracking-wider",
                                    serviceFilter === f ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"
                                )}
                            >
                                {f === "all" ? "All" : f}
                            </button>
                        ))}
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <Input
                            placeholder="Search categories…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 h-9 bg-slate-950 border-slate-800 text-white min-w-[240px]"
                        />
                    </div>
                    <Button onClick={openCreate} className="bg-brand-blue hover:bg-brand-blue/90 text-white font-bold h-9">
                        <Plus className="mr-2 h-4 w-4" /> New Category
                    </Button>
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div className="flex items-center justify-center py-16 text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-16 text-slate-500 border border-slate-800 rounded-xl bg-slate-950/30">
                    <Layers className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="font-bold">No categories{search || serviceFilter !== "all" ? " match your filter" : " yet"}</p>
                    {!search && serviceFilter === "all" && categories.length === 0 && (
                        <>
                            <p className="text-sm mt-1 mb-4">Seed the 8 default categories (Frozen Seafood, Poultry, Meat, Dairy, Fruit, Hunting Trophies, Wine &amp; Spirits, Other Dry Mixed) or create your own.</p>
                            <div className="flex items-center justify-center gap-2">
                                <Button onClick={handleSeed} disabled={seeding} variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
                                    {seeding ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : null}
                                    Seed 8 default categories
                                </Button>
                                <Button onClick={openCreate} className="bg-brand-blue hover:bg-brand-blue/90 text-white font-bold">
                                    <Plus className="mr-2 h-4 w-4" /> Create from scratch
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            ) : (
                <div className="rounded-xl border border-slate-800 overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-900/80 border-slate-800">
                                <TableHead className="text-slate-400 text-xs font-bold uppercase">Name</TableHead>
                                <TableHead className="text-slate-400 text-xs font-bold uppercase">Service</TableHead>
                                <TableHead className="text-slate-400 text-xs font-bold uppercase">Allowed Temps</TableHead>
                                <TableHead className="text-slate-400 text-xs font-bold uppercase text-center">Products</TableHead>
                                <TableHead className="text-slate-400 text-xs font-bold uppercase text-center">Containers</TableHead>
                                <TableHead className="text-slate-400 text-xs font-bold uppercase text-center">Docs</TableHead>
                                <TableHead className="text-slate-400 text-xs font-bold uppercase text-center">Active</TableHead>
                                <TableHead className="text-slate-400 text-xs font-bold uppercase text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.map(cat => (
                                <TableRow key={cat.id} className="border-slate-800 hover:bg-slate-900/50 cursor-pointer" onClick={() => openDetail(cat)}>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-white">{cat.name}</span>
                                            {cat.description && (
                                                <span className="text-[10px] text-slate-500 mt-0.5 max-w-[320px] truncate">{cat.description}</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={cat.salesRateTypeId === "srs" ? "bg-blue-500/15 text-blue-400 border-none text-[10px]" : "bg-emerald-500/15 text-emerald-400 border-none text-[10px]"}>
                                            {cat.salesRateTypeId.toUpperCase()}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {cat.allowedTemperatures.map(t => (
                                                <span
                                                    key={t}
                                                    className={cn(
                                                        "text-[9px] font-mono uppercase px-1.5 py-0.5 rounded",
                                                        t === "ambient"
                                                            ? "bg-amber-500/15 text-amber-400"
                                                            : "bg-sky-500/15 text-sky-400",
                                                    )}
                                                >
                                                    {t}
                                                </span>
                                            ))}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge className="bg-slate-800 text-slate-300 border-none font-mono">
                                            <Apple className="h-3 w-3 mr-1" /> {cat.productCount}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {cat.containerCount > 0 ? (
                                            <Badge className="bg-emerald-500/15 text-emerald-400 border-none font-mono">
                                                <Container className="h-3 w-3 mr-1" /> {cat.containerCount}
                                            </Badge>
                                        ) : (
                                            <span className="text-slate-600 text-xs">—</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge className="bg-slate-800 text-slate-300 border-none font-mono">
                                            <FileText className="h-3 w-3 mr-1" /> {cat.requiredDocuments.length}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                                        <Switch
                                            checked={cat.active}
                                            onCheckedChange={() => handleToggleActive(cat)}
                                            className="data-[state=checked]:bg-brand-blue"
                                        />
                                    </TableCell>
                                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center justify-end gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => openEdit(cat)} className="h-8 w-8 text-slate-500 hover:text-white hover:bg-slate-800">
                                                <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => setDeleteDialog(cat)} className="h-8 w-8 text-slate-500 hover:text-red-400 hover:bg-red-950/30">
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

            {/* Create / Edit dialog */}
            <Dialog open={formOpen} onOpenChange={setFormOpen}>
                <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto bg-slate-950 border-slate-800 text-white">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-black">
                            {editingId ? "Edit Category" : "New Category"}
                        </DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Define a consolidation group that determines container compatibility and document requirements.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-5 py-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5 col-span-2">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Name</Label>
                                <Input
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    placeholder="e.g. Frozen Seafood"
                                    className="bg-slate-900 border-slate-800 h-9 text-sm"
                                />
                            </div>
                            <div className="space-y-1.5 col-span-2">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Description (optional)</Label>
                                <Input
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    placeholder="Short note, e.g. 'Hakes, squid, yellow tail, etc.'"
                                    className="bg-slate-900 border-slate-800 h-9 text-sm"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Service Type</Label>
                            <div className="grid grid-cols-2 gap-2">
                                {(["srs", "scs"] as const).map(type => (
                                    <button
                                        key={type}
                                        type="button"
                                        disabled={!!editingId}
                                        onClick={() => handleServiceTypeChange(type)}
                                        className={cn(
                                            "p-3 rounded-lg border-2 text-left transition-all",
                                            editingId && "opacity-60 cursor-not-allowed",
                                            form.salesRateTypeId === type
                                                ? type === "srs" ? "border-blue-500 bg-blue-500/10" : "border-emerald-500 bg-emerald-500/10"
                                                : "border-slate-800 hover:border-slate-700"
                                        )}
                                    >
                                        <div className="font-bold text-white text-sm">{type.toUpperCase()}</div>
                                        <div className="text-[10px] text-slate-400 mt-0.5">
                                            {type === "srs" ? "Shared Reefer (frozen/chilled)" : "Shared Container (ambient)"}
                                        </div>
                                    </button>
                                ))}
                            </div>
                            {editingId && (
                                <p className="text-[10px] text-slate-500 italic">Service type is locked after creation.</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Allowed Temperatures</Label>
                            <div className="grid grid-cols-3 gap-2">
                                {ALL_TEMPS.map(t => {
                                    const selected = form.allowedTemperatures.includes(t.value)
                                    const disabled = form.salesRateTypeId === "scs"
                                        ? t.value !== "ambient"
                                        : t.value === "ambient"
                                    const Icon = t.icon
                                    return (
                                        <button
                                            key={t.value}
                                            type="button"
                                            disabled={disabled}
                                            onClick={() => toggleTemp(t.value)}
                                            className={cn(
                                                "flex items-center justify-center gap-1.5 h-9 rounded-lg border text-xs font-bold",
                                                disabled && "border-slate-800 text-slate-600 cursor-not-allowed opacity-40",
                                                !disabled && !selected && "border-slate-700 text-slate-400 hover:border-brand-blue hover:text-white",
                                                selected && "border-brand-blue bg-brand-blue/15 text-brand-blue"
                                            )}
                                        >
                                            <Icon className="h-3.5 w-3.5" /> {t.label}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                Required Documents ({form.requiredDocuments.length})
                            </Label>
                            <div className="grid grid-cols-2 gap-1 max-h-[280px] overflow-y-auto rounded-lg border border-slate-800 bg-slate-900/50 p-1">
                                {DOCUMENT_TYPES.map(doc => {
                                    const selected = form.requiredDocuments.includes(doc.code)
                                    return (
                                        <label
                                            key={doc.code}
                                            className={cn(
                                                "flex items-start gap-2 p-2 rounded-md cursor-pointer text-xs",
                                                selected ? "bg-brand-blue/15" : "hover:bg-slate-800/50"
                                            )}
                                        >
                                            <Checkbox
                                                checked={selected}
                                                onCheckedChange={() => toggleDoc(doc.code)}
                                                className="mt-0.5"
                                            />
                                            <div>
                                                <div className={cn("font-bold", selected ? "text-brand-blue" : "text-white")}>
                                                    {doc.label}
                                                </div>
                                                {doc.description && (
                                                    <div className="text-[10px] text-slate-500 leading-tight mt-0.5">{doc.description}</div>
                                                )}
                                            </div>
                                        </label>
                                    )
                                })}
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 border border-slate-800">
                            <div>
                                <div className="text-sm font-bold text-white">Active</div>
                                <div className="text-[10px] text-slate-500">Inactive categories won&apos;t appear for clients</div>
                            </div>
                            <Switch
                                checked={form.active}
                                onCheckedChange={(v) => setForm({ ...form, active: v })}
                                className="data-[state=checked]:bg-brand-blue"
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="ghost" onClick={() => setFormOpen(false)} disabled={saving} className="text-slate-400 hover:text-white">
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={saving} className="bg-brand-blue hover:bg-brand-blue/90 text-white font-bold px-6">
                            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            {saving ? "Saving…" : editingId ? "Update" : "Create"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete dialog */}
            <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
                <DialogContent className="bg-slate-950 border-slate-800 text-white max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-black">Delete Category</DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Delete <span className="text-white font-bold">{deleteDialog?.name}</span>? Products in it
                            will become uncategorised. This can&apos;t be undone. Containers using this category
                            will block deletion.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="ghost" onClick={() => setDeleteDialog(null)} className="text-slate-400 hover:text-white">Cancel</Button>
                        <Button onClick={handleDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700 text-white font-bold">
                            {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            {deleting ? "Deleting…" : "Delete"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Loading detail overlay */}
            {loadingDetail && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <Loader2 className="h-6 w-6 animate-spin text-white" />
                </div>
            )}
        </div>
    )
}
