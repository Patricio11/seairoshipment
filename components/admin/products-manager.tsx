"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"
import { Apple, Loader2, RefreshCcw, Search, Container } from "lucide-react"
import { toast } from "sonner"

interface Product {
    id: string
    metashipId: number
    name: string
    hsCode: string
    description: string
    category: string | null
    active: boolean
    lastSyncedAt: string
    updatedAt: string
    containerCount: number
}

export function ProductsManager() {
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)
    const [syncing, setSyncing] = useState(false)
    const [search, setSearch] = useState("")
    const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
    const [categoryDraft, setCategoryDraft] = useState("")

    const fetchProducts = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch("/api/admin/products")
            if (res.ok) setProducts(await res.json())
        } catch {
            toast.error("Failed to fetch products")
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchProducts()
    }, [fetchProducts])

    const handleSync = async () => {
        setSyncing(true)
        try {
            const res = await fetch("/api/admin/products/sync", { method: "POST" })
            const data = await res.json()
            if (!res.ok) {
                toast.error(data.error || "Sync failed")
                return
            }
            toast.success(`Synced ${data.total} products`, {
                description: `${data.inserted} new, ${data.updated} updated`,
                duration: 5000,
            })
            fetchProducts()
        } catch {
            toast.error("Sync failed")
        } finally {
            setSyncing(false)
        }
    }

    const handleToggleActive = async (product: Product) => {
        try {
            const res = await fetch("/api/admin/products", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: product.id, active: !product.active }),
            })
            if (res.ok) {
                setProducts(prev => prev.map(p => p.id === product.id ? { ...p, active: !p.active } : p))
                toast.success(`${product.name} ${product.active ? "deactivated" : "activated"}`)
            } else {
                toast.error("Failed to update")
            }
        } catch {
            toast.error("Failed to update")
        }
    }

    const startEditCategory = (product: Product) => {
        setEditingCategoryId(product.id)
        setCategoryDraft(product.category || "")
    }

    const saveCategory = async (productId: string) => {
        try {
            const res = await fetch("/api/admin/products", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: productId, category: categoryDraft.trim() || null }),
            })
            if (res.ok) {
                setProducts(prev => prev.map(p => p.id === productId ? { ...p, category: categoryDraft.trim() || null } : p))
                toast.success("Category updated")
                setEditingCategoryId(null)
            } else {
                toast.error("Failed to update category")
            }
        } catch {
            toast.error("Failed to update category")
        }
    }

    const filtered = products.filter(p => {
        if (!search) return true
        const q = search.toLowerCase()
        return p.name.toLowerCase().includes(q) ||
            p.hsCode.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            p.category?.toLowerCase().includes(q)
    })

    const lastSyncedAt = products.reduce<string | null>((latest, p) => {
        if (!p.lastSyncedAt) return latest
        if (!latest) return p.lastSyncedAt
        return p.lastSyncedAt > latest ? p.lastSyncedAt : latest
    }, null)

    return (
        <div className="space-y-4">
            {/* Header + actions */}
            <div className="flex items-center justify-between gap-3 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                <div className="flex items-center gap-3">
                    <Apple className="h-5 w-5 text-brand-blue" />
                    <div>
                        <h3 className="font-bold text-white text-sm">Products</h3>
                        <p className="text-xs text-slate-500">
                            {products.length} total · {products.filter(p => p.active).length} active
                            {lastSyncedAt && ` · last synced ${new Date(lastSyncedAt).toLocaleString()}`}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <Input
                            placeholder="Search name, HS code, category..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 h-9 bg-slate-950 border-slate-800 text-white min-w-[280px]"
                        />
                    </div>
                    <Button
                        onClick={handleSync}
                        disabled={syncing}
                        className="bg-brand-blue hover:bg-brand-blue/90 text-white font-bold h-9"
                    >
                        {syncing ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <RefreshCcw className="mr-2 h-4 w-4" />
                        )}
                        {syncing ? "Syncing..." : "Sync from MetaShip"}
                    </Button>
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div className="flex items-center justify-center py-16 text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading products...
                </div>
            ) : products.length === 0 ? (
                <div className="text-center py-16 text-slate-500 border border-slate-800 rounded-xl bg-slate-950/30">
                    <Apple className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="font-bold">No products synced yet</p>
                    <p className="text-sm mt-1">Click &quot;Sync from MetaShip&quot; to pull your product catalogue.</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-16 text-slate-500 border border-slate-800 rounded-xl bg-slate-950/30">
                    <p className="text-sm">No products match &quot;{search}&quot;</p>
                </div>
            ) : (
                <div className="rounded-xl border border-slate-800 overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-900/80 border-slate-800">
                                <TableHead className="text-slate-400 text-xs font-bold uppercase">Product</TableHead>
                                <TableHead className="text-slate-400 text-xs font-bold uppercase">HS Code</TableHead>
                                <TableHead className="text-slate-400 text-xs font-bold uppercase">Category</TableHead>
                                <TableHead className="text-slate-400 text-xs font-bold uppercase text-center">Containers</TableHead>
                                <TableHead className="text-slate-400 text-xs font-bold uppercase text-center">Active</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.map((p) => (
                                <TableRow key={p.id} className="border-slate-800 hover:bg-slate-900/50">
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-white">{p.name}</span>
                                            {p.description && (
                                                <span className="text-[10px] text-slate-500 mt-0.5">{p.description}</span>
                                            )}
                                            <span className="text-[10px] text-slate-600 font-mono mt-0.5">ID: {p.metashipId}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-mono text-slate-300 text-sm">
                                        {p.hsCode || <span className="text-slate-600">—</span>}
                                    </TableCell>
                                    <TableCell>
                                        {editingCategoryId === p.id ? (
                                            <div className="flex items-center gap-1">
                                                <Input
                                                    value={categoryDraft}
                                                    onChange={(e) => setCategoryDraft(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter") saveCategory(p.id)
                                                        if (e.key === "Escape") setEditingCategoryId(null)
                                                    }}
                                                    autoFocus
                                                    placeholder="e.g. FISH"
                                                    className="h-7 text-xs bg-slate-900 border-slate-700"
                                                />
                                                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => saveCategory(p.id)}>
                                                    Save
                                                </Button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => startEditCategory(p)}
                                                className="text-xs text-slate-400 hover:text-white"
                                                title="Click to edit"
                                            >
                                                {p.category ? (
                                                    <Badge variant="outline" className="border-slate-700 text-slate-300 font-mono uppercase text-[10px]">
                                                        {p.category}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-slate-600 italic">set category…</span>
                                                )}
                                            </button>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {p.containerCount > 0 ? (
                                            <Badge className="bg-emerald-500/15 text-emerald-400 border-none font-mono">
                                                <Container className="h-3 w-3 mr-1" /> {p.containerCount}
                                            </Badge>
                                        ) : (
                                            <span className="text-slate-600 text-xs">—</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Switch
                                            checked={p.active}
                                            onCheckedChange={() => handleToggleActive(p)}
                                            className="data-[state=checked]:bg-brand-blue"
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    )
}
