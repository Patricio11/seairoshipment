"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CloudSun, Eye, EyeOff, Loader2, MapPin, Plus, Trash2, Anchor, ArrowRight, Pencil, Save } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type PortRole = "ORIGIN" | "DEST" | "HUB"

interface Port {
    id: string
    cityName: string
    countryCode: string | null
    role: PortRole
    latitude: number
    longitude: number
    sortOrder: number
    active: boolean
    createdAt: string | Date
    updatedAt: string | Date
}

type FormMode = { kind: "create" } | { kind: "edit"; id: string } | null

const ROLE_OPTIONS: PortRole[] = ["ORIGIN", "DEST", "HUB"]
const ROLE_PILL: Record<PortRole, string> = {
    ORIGIN: "bg-emerald-900/30 text-emerald-400 border-emerald-800",
    DEST: "bg-blue-900/30 text-blue-400 border-blue-800",
    HUB: "bg-purple-900/30 text-purple-400 border-purple-800",
}

const EMPTY_FORM = { city: "", country: "", role: "DEST" as PortRole, lat: "", lng: "" }

export function DashboardWeatherPortsTable() {
    const [rows, setRows] = useState<Port[]>([])
    const [loading, setLoading] = useState(true)
    const [formMode, setFormMode] = useState<FormMode>(null)
    const [saving, setSaving] = useState(false)
    const [form, setForm] = useState(EMPTY_FORM)

    useEffect(() => {
        let cancelled = false
        fetch("/api/admin/dashboard-weather-ports", { cache: "no-store" })
            .then(r => r.json())
            .then(d => {
                if (cancelled) return
                if (Array.isArray(d.ports)) setRows(d.ports)
            })
            .catch(() => { })
            .finally(() => { if (!cancelled) setLoading(false) })
        return () => { cancelled = true }
    }, [])

    const updateRow = (id: string, patch: Partial<Port>) => {
        setRows(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)))
    }

    const handleSaveField = async (id: string, patch: Partial<Port>) => {
        try {
            const res = await fetch(`/api/admin/dashboard-weather-ports/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(patch),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) { toast.error(data.error || "Couldn't update"); return }
            updateRow(id, patch)
        } catch {
            toast.error("Couldn't update")
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Remove this port from the dashboard widget?")) return
        try {
            const res = await fetch(`/api/admin/dashboard-weather-ports/${id}`, { method: "DELETE" })
            if (!res.ok) { toast.error("Couldn't delete"); return }
            setRows(prev => prev.filter(r => r.id !== id))
            // Close the form if we were editing the row that just got deleted
            if (formMode?.kind === "edit" && formMode.id === id) closeForm()
            toast.success("Port removed")
        } catch {
            toast.error("Couldn't delete")
        }
    }

    const openCreate = () => {
        setForm(EMPTY_FORM)
        setFormMode({ kind: "create" })
    }

    const openEdit = (row: Port) => {
        setForm({
            city: row.cityName,
            country: row.countryCode ?? "",
            role: row.role,
            lat: String(row.latitude),
            lng: String(row.longitude),
        })
        setFormMode({ kind: "edit", id: row.id })
    }

    const closeForm = () => {
        setFormMode(null)
        setForm(EMPTY_FORM)
    }

    const submitForm = async () => {
        if (!formMode) return
        if (!form.city.trim()) { toast.error("City name is required"); return }
        const lat = Number(form.lat)
        const lng = Number(form.lng)
        if (!Number.isFinite(lat) || lat < -90 || lat > 90) { toast.error("Enter a valid latitude (-90 to 90)"); return }
        if (!Number.isFinite(lng) || lng < -180 || lng > 180) { toast.error("Enter a valid longitude (-180 to 180)"); return }

        const payload = {
            cityName: form.city.trim(),
            countryCode: form.country.trim() || null,
            role: form.role,
            latitude: lat,
            longitude: lng,
        }

        setSaving(true)
        try {
            if (formMode.kind === "create") {
                const res = await fetch("/api/admin/dashboard-weather-ports", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                })
                const data = await res.json().catch(() => ({}))
                if (!res.ok) { toast.error(data.error || "Couldn't create"); return }
                setRows(prev => [...prev, data.port])
                toast.success("Port added")
            } else {
                const res = await fetch(`/api/admin/dashboard-weather-ports/${formMode.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                })
                const data = await res.json().catch(() => ({}))
                if (!res.ok) { toast.error(data.error || "Couldn't save"); return }
                if (data.port) updateRow(formMode.id, data.port)
                toast.success("Port updated")
            }
            closeForm()
        } catch {
            toast.error("Couldn't save")
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16 text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading ports…
            </div>
        )
    }

    const isCreating = formMode?.kind === "create"
    const editingId = formMode?.kind === "edit" ? formMode.id : null

    return (
        <div className="space-y-4">
            {rows.length === 0 && !isCreating && (
                <div className="rounded-2xl border-2 border-dashed border-slate-700 bg-slate-900/40 p-10 text-center">
                    <div className="mx-auto h-14 w-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-4">
                        <CloudSun className="h-7 w-7 text-orange-400" />
                    </div>
                    <h3 className="text-lg font-bold text-white">No ports configured</h3>
                    <p className="text-sm text-slate-400 mt-1.5 max-w-md mx-auto">
                        Add 3–5 ports your clients ship to and from. The Key Port Weather widget on the client dashboard reads from here.
                    </p>
                    <Button
                        onClick={openCreate}
                        className="mt-5 bg-brand-blue hover:bg-brand-blue/90 text-white font-bold"
                    >
                        <Plus className="h-4 w-4 mr-1.5" /> Add your first port
                    </Button>
                </div>
            )}

            <div className="space-y-2">
                <AnimatePresence>
                    {rows.map(row => (
                        <motion.div
                            key={row.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: row.active ? 1 : 0.55 }}
                            exit={{ opacity: 0 }}
                            className={`rounded-2xl border p-4 bg-slate-900/60 ${
                                editingId === row.id
                                    ? "border-brand-blue/60 ring-1 ring-brand-blue/30"
                                    : row.active ? "border-slate-800" : "border-dashed border-slate-700"
                            }`}
                        >
                            <div className="flex items-start gap-4">
                                <div className="h-11 w-11 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                                    <Anchor className="h-5 w-5 text-orange-400" />
                                </div>
                                <div className="flex-1 min-w-0 space-y-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-base font-bold text-white">
                                            {row.cityName}
                                            {row.countryCode ? <span className="ml-2 text-xs font-mono text-slate-500">{row.countryCode}</span> : null}
                                        </p>
                                        <span className={`text-[10px] uppercase tracking-widest font-black px-1.5 py-0.5 rounded border ${ROLE_PILL[row.role]}`}>
                                            {row.role}
                                        </span>
                                        {!row.active && (
                                            <span className="text-[10px] uppercase tracking-widest font-black text-slate-400 px-1.5 py-0.5 rounded bg-slate-800">
                                                Inactive
                                            </span>
                                        )}
                                        {editingId === row.id && (
                                            <span className="text-[10px] uppercase tracking-widest font-black text-brand-blue px-1.5 py-0.5 rounded bg-blue-900/30 border border-brand-blue/30">
                                                Editing
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-slate-400">
                                        <span className="flex items-center gap-1 font-mono">
                                            <MapPin className="h-3 w-3" />
                                            {row.latitude.toFixed(4)}, {row.longitude.toFixed(4)}
                                        </span>
                                        <a
                                            href={`https://www.openstreetmap.org/?mlat=${row.latitude}&mlon=${row.longitude}#map=10/${row.latitude}/${row.longitude}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-brand-blue hover:underline flex items-center gap-1"
                                        >
                                            View on map <ArrowRight className="h-3 w-3" />
                                        </a>
                                    </div>
                                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                                        {ROLE_OPTIONS.map(role => (
                                            <button
                                                key={role}
                                                type="button"
                                                onClick={() => row.role !== role && handleSaveField(row.id, { role })}
                                                className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded border ${
                                                    row.role === role
                                                        ? "bg-slate-800 text-white border-slate-700"
                                                        : "text-slate-500 border-slate-800 hover:text-slate-300"
                                                }`}
                                            >
                                                {role}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="shrink-0 flex flex-col gap-1">
                                    <button
                                        type="button"
                                        onClick={() => editingId === row.id ? closeForm() : openEdit(row)}
                                        className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-brand-blue px-2 py-1 rounded flex items-center gap-1"
                                        title="Edit name + coordinates"
                                    >
                                        <Pencil className="h-3 w-3" /> {editingId === row.id ? "Close" : "Edit"}
                                    </button>
                                    {row.active ? (
                                        <button
                                            type="button"
                                            onClick={() => handleSaveField(row.id, { active: false })}
                                            className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-amber-400 px-2 py-1 rounded flex items-center gap-1"
                                            title="Hide from widget"
                                        >
                                            <EyeOff className="h-3 w-3" /> Hide
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => handleSaveField(row.id, { active: true })}
                                            className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 hover:text-emerald-300 px-2 py-1 rounded flex items-center gap-1"
                                            title="Show on widget"
                                        >
                                            <Eye className="h-3 w-3" /> Show
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(row.id)}
                                        className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-red-400 px-2 py-1 rounded flex items-center gap-1"
                                        title="Delete permanently"
                                    >
                                        <Trash2 className="h-3 w-3" /> Delete
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {formMode ? (
                <PortForm
                    mode={formMode.kind}
                    values={form}
                    onChange={setForm}
                    onCancel={closeForm}
                    onSubmit={submitForm}
                    saving={saving}
                />
            ) : rows.length > 0 ? (
                <button
                    type="button"
                    onClick={openCreate}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-slate-700 text-sm font-bold text-slate-400 hover:text-brand-blue hover:border-brand-blue hover:bg-blue-900/10 transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    Add another port
                </button>
            ) : null}
        </div>
    )
}

/* -------------------------------------------------------------------------- */
/* Reusable form — used for both create and edit                               */
/* -------------------------------------------------------------------------- */

interface PortFormValues {
    city: string
    country: string
    role: PortRole
    lat: string
    lng: string
}

interface PortFormProps {
    mode: "create" | "edit"
    values: PortFormValues
    onChange: (next: PortFormValues) => void
    onSubmit: () => void
    onCancel: () => void
    saving: boolean
}

function PortForm({ mode, values, onChange, onSubmit, onCancel, saving }: PortFormProps) {
    const set = <K extends keyof PortFormValues>(key: K, v: PortFormValues[K]) =>
        onChange({ ...values, [key]: v })

    const isEdit = mode === "edit"

    return (
        <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border-2 border-brand-blue/40 bg-blue-900/10 p-4 space-y-3"
        >
            <p className="text-[11px] uppercase tracking-widest font-black text-brand-blue">
                {isEdit ? "Edit port" : "Add new port"}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                    <label className="text-[11px] uppercase tracking-widest text-slate-400 font-bold">City name</label>
                    <Input
                        value={values.city}
                        onChange={e => set("city", e.target.value)}
                        placeholder="e.g. Cape Town"
                        className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-500"
                        autoFocus
                    />
                </div>
                <div>
                    <label className="text-[11px] uppercase tracking-widest text-slate-400 font-bold">Country code (optional)</label>
                    <Input
                        value={values.country}
                        onChange={e => set("country", e.target.value.toUpperCase().slice(0, 2))}
                        placeholder="ZA"
                        maxLength={2}
                        className="bg-slate-950 border-slate-800 text-white uppercase placeholder:text-slate-500"
                    />
                </div>
                <div>
                    <label className="text-[11px] uppercase tracking-widest text-slate-400 font-bold">Role</label>
                    <select
                        value={values.role}
                        onChange={e => set("role", e.target.value as PortRole)}
                        className="w-full h-9 rounded-md bg-slate-950 border border-slate-800 text-white text-sm px-3"
                    >
                        {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-[11px] uppercase tracking-widest text-slate-400 font-bold">Latitude</label>
                    <Input
                        value={values.lat}
                        onChange={e => set("lat", e.target.value)}
                        placeholder="-33.9249"
                        className="bg-slate-950 border-slate-800 text-white font-mono placeholder:text-slate-500"
                    />
                </div>
                <div>
                    <label className="text-[11px] uppercase tracking-widest text-slate-400 font-bold">Longitude</label>
                    <Input
                        value={values.lng}
                        onChange={e => set("lng", e.target.value)}
                        placeholder="18.4241"
                        className="bg-slate-950 border-slate-800 text-white font-mono placeholder:text-slate-500"
                    />
                </div>
            </div>
            <div className="flex gap-2 justify-end pt-1">
                <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-slate-800" onClick={onCancel}>
                    Cancel
                </Button>
                <Button onClick={onSubmit} disabled={saving} className="bg-brand-blue hover:bg-brand-blue/90 text-white">
                    {saving
                        ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        : isEdit ? <Save className="h-3.5 w-3.5 mr-1.5" /> : <Plus className="h-3.5 w-3.5 mr-1.5" />
                    }
                    {isEdit ? "Save changes" : "Add port"}
                </Button>
            </div>
        </motion.div>
    )
}
