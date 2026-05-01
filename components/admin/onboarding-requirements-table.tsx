"use client"

import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core"
import {
    SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
    GripVertical, FileText, UploadCloud, Trash2, ExternalLink, Plus, Loader2, Eye, EyeOff, Check, X,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { uploadFile, STORAGE_PATHS } from "@/lib/supabase"

interface Requirement {
    id: string
    name: string
    description: string | null
    templateUrl: string | null
    templateOriginalName: string | null
    templateMimeType: string | null
    templateSizeBytes: number | null
    required: boolean
    sortOrder: number
    active: boolean
    createdAt: string | Date
    updatedAt: string | Date
}

export function OnboardingRequirementsTable() {
    const [rows, setRows] = useState<Requirement[]>([])
    const [loading, setLoading] = useState(true)
    const [creating, setCreating] = useState(false)
    const [newName, setNewName] = useState("")
    const [newDescription, setNewDescription] = useState("")
    const [newRequired, setNewRequired] = useState(true)
    const [savingNew, setSavingNew] = useState(false)

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    )

    useEffect(() => {
        let cancelled = false
        fetch("/api/admin/onboarding-requirements", { cache: "no-store" })
            .then(r => r.json())
            .then(d => {
                if (cancelled) return
                if (Array.isArray(d.requirements)) setRows(d.requirements)
            })
            .catch(() => { })
            .finally(() => { if (!cancelled) setLoading(false) })
        return () => { cancelled = true }
    }, [])

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event
        if (!over || active.id === over.id) return
        const oldIdx = rows.findIndex(r => r.id === active.id)
        const newIdx = rows.findIndex(r => r.id === over.id)
        if (oldIdx === -1 || newIdx === -1) return

        // Optimistic local update
        const newRows = arrayMove(rows, oldIdx, newIdx).map((r, i) => ({ ...r, sortOrder: (i + 1) * 10 }))
        setRows(newRows)

        // Persist
        try {
            await fetch("/api/admin/onboarding-requirements/reorder", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ order: newRows.map(r => ({ id: r.id, sortOrder: r.sortOrder })) }),
            })
        } catch {
            toast.error("Couldn't save the new order")
        }
    }

    const updateRow = (id: string, patch: Partial<Requirement>) => {
        setRows(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)))
    }

    const handleSaveField = async (id: string, field: "name" | "description" | "required" | "active", value: unknown) => {
        try {
            const res = await fetch(`/api/admin/onboarding-requirements/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ [field]: value }),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
                toast.error(data.error || "Couldn't update")
                return
            }
            updateRow(id, { [field]: value } as Partial<Requirement>)
        } catch {
            toast.error("Couldn't update")
        }
    }

    const handleSoftDelete = async (id: string) => {
        if (!confirm("Deactivate this requirement? Existing uploads stay; new applications won't see it.")) return
        try {
            const res = await fetch(`/api/admin/onboarding-requirements/${id}`, { method: "DELETE" })
            if (!res.ok) { toast.error("Couldn't deactivate"); return }
            updateRow(id, { active: false })
            toast.success("Deactivated")
        } catch {
            toast.error("Couldn't deactivate")
        }
    }

    const handleCreate = async () => {
        if (!newName.trim()) {
            toast.error("Name is required")
            return
        }
        setSavingNew(true)
        try {
            const res = await fetch("/api/admin/onboarding-requirements", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newName, description: newDescription, required: newRequired }),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
                toast.error(data.error || "Couldn't create")
                return
            }
            setRows(prev => [...prev, data.requirement])
            setNewName(""); setNewDescription(""); setNewRequired(true); setCreating(false)
            toast.success("Requirement created")
        } catch {
            toast.error("Couldn't create")
        } finally {
            setSavingNew(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16 text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading requirements…
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={rows.map(r => r.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                        <AnimatePresence>
                            {rows.map(row => (
                                <SortableRow
                                    key={row.id}
                                    row={row}
                                    onSaveField={handleSaveField}
                                    onSoftDelete={handleSoftDelete}
                                    onTemplateUpdate={(template) => updateRow(row.id, template)}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                </SortableContext>
            </DndContext>

            {creating ? (
                <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border-2 border-brand-blue/40 bg-blue-900/10 p-4 space-y-3"
                >
                    <Input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Requirement name (e.g. Credit Application)"
                        className="font-bold bg-slate-950 border-slate-800 text-white placeholder:text-slate-500"
                        autoFocus
                    />
                    <Textarea
                        value={newDescription}
                        onChange={(e) => setNewDescription(e.target.value)}
                        placeholder="Short description shown under the card on the onboarding form"
                        className="min-h-[64px] bg-slate-950 border-slate-800 text-white placeholder:text-slate-500"
                    />
                    <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-sm text-slate-200">
                            <input
                                type="checkbox"
                                checked={newRequired}
                                onChange={(e) => setNewRequired(e.target.checked)}
                                className="rounded"
                            />
                            Required
                        </label>
                        <div className="flex gap-2">
                            <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-slate-800" onClick={() => { setCreating(false); setNewName(""); setNewDescription("") }}>Cancel</Button>
                            <Button onClick={handleCreate} disabled={savingNew} className="bg-brand-blue hover:bg-brand-blue/90 text-white">
                                {savingNew ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1.5" />}
                                Create
                            </Button>
                        </div>
                    </div>
                </motion.div>
            ) : (
                <button
                    type="button"
                    onClick={() => setCreating(true)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-slate-700 text-sm font-bold text-slate-400 hover:text-brand-blue hover:border-brand-blue hover:bg-blue-900/10 transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    Add new requirement
                </button>
            )}
        </div>
    )
}

/* -------------------------------------------------------------------------- */
/* Sortable Row                                                                */
/* -------------------------------------------------------------------------- */

interface SortableRowProps {
    row: Requirement
    onSaveField: (id: string, field: "name" | "description" | "required" | "active", value: unknown) => void
    onSoftDelete: (id: string) => void
    onTemplateUpdate: (template: Partial<Requirement>) => void
}

function SortableRow({ row, onSaveField, onSoftDelete, onTemplateUpdate }: SortableRowProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.id })

    const [editing, setEditing] = useState<"name" | "description" | null>(null)
    const [draftName, setDraftName] = useState(row.name)
    const [draftDescription, setDraftDescription] = useState(row.description ?? "")
    const [uploading, setUploading] = useState(false)
    const fileRef = useRef<HTMLInputElement>(null)

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : row.active ? 1 : 0.55,
    }

    const handleUploadTemplate = async (file: File) => {
        setUploading(true)
        try {
            const result = await uploadFile(file, STORAGE_PATHS.ONBOARDING_TEMPLATES)
            if (!result.success || !result.url) {
                toast.error(result.error || "Upload failed")
                return
            }
            const res = await fetch(`/api/admin/onboarding-requirements/${row.id}/template`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    url: result.url,
                    originalName: file.name,
                    mimeType: file.type,
                    sizeBytes: file.size,
                }),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
                toast.error(data.error || "Couldn't attach template")
                return
            }
            onTemplateUpdate({
                templateUrl: data.requirement.templateUrl,
                templateOriginalName: data.requirement.templateOriginalName,
                templateMimeType: data.requirement.templateMimeType,
                templateSizeBytes: data.requirement.templateSizeBytes,
            })
            toast.success("Template uploaded")
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Couldn't upload")
        } finally {
            setUploading(false)
        }
    }

    const handleRemoveTemplate = async () => {
        if (!confirm("Remove the template? The slot becomes a 'user-supplied document'.")) return
        try {
            const res = await fetch(`/api/admin/onboarding-requirements/${row.id}/template`, { method: "DELETE" })
            if (!res.ok) { toast.error("Couldn't remove"); return }
            onTemplateUpdate({ templateUrl: null, templateOriginalName: null, templateMimeType: null, templateSizeBytes: null })
            toast.success("Template removed")
        } catch {
            toast.error("Couldn't remove")
        }
    }

    return (
        <motion.div
            ref={setNodeRef}
            style={style}
            initial={{ opacity: 0 }}
            animate={{ opacity: style.opacity ?? 1 }}
            exit={{ opacity: 0 }}
            className={`rounded-2xl border bg-slate-900/60 p-4 ${
                row.active ? "border-slate-800" : "border-dashed border-slate-700"
            }`}
        >
            <div className="flex items-start gap-3">
                {/* Drag handle */}
                <button
                    type="button"
                    {...attributes}
                    {...listeners}
                    className="shrink-0 mt-1 h-7 w-7 rounded-md flex items-center justify-center text-slate-500 hover:text-slate-200 cursor-grab active:cursor-grabbing"
                    aria-label="Drag to reorder"
                >
                    <GripVertical className="h-4 w-4" />
                </button>

                {/* Body */}
                <div className="flex-1 min-w-0 space-y-2">
                    {/* Name (inline edit) */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {editing === "name" ? (
                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                <Input
                                    value={draftName}
                                    onChange={(e) => setDraftName(e.target.value)}
                                    className="h-8 text-sm font-bold bg-slate-950 border-slate-800 text-white"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            onSaveField(row.id, "name", draftName.trim())
                                            setEditing(null)
                                        }
                                        if (e.key === "Escape") {
                                            setDraftName(row.name); setEditing(null)
                                        }
                                    }}
                                />
                                <button onClick={() => { onSaveField(row.id, "name", draftName.trim()); setEditing(null) }} className="h-7 w-7 rounded-md flex items-center justify-center text-emerald-400 hover:bg-emerald-500/10">
                                    <Check className="h-3.5 w-3.5" />
                                </button>
                                <button onClick={() => { setDraftName(row.name); setEditing(null) }} className="h-7 w-7 rounded-md flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-500/10">
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        ) : (
                            <button onClick={() => setEditing("name")} className="text-base font-bold text-white hover:text-brand-blue text-left">
                                {row.name}
                            </button>
                        )}
                        {!row.active && (
                            <span className="text-[10px] uppercase tracking-widest font-black text-slate-400 px-1.5 py-0.5 rounded bg-slate-800">
                                Inactive
                            </span>
                        )}
                        {row.required ? (
                            <span className="text-[10px] uppercase tracking-widest font-black text-red-400 px-1.5 py-0.5 rounded bg-red-900/30 border border-red-900/40">
                                Required
                            </span>
                        ) : (
                            <span className="text-[10px] uppercase tracking-widest font-black text-slate-400 px-1.5 py-0.5 rounded bg-slate-800">
                                Optional
                            </span>
                        )}
                        {row.templateUrl && (
                            <span className="text-[10px] uppercase tracking-widest font-black text-brand-blue px-1.5 py-0.5 rounded bg-blue-900/30 border border-brand-blue/30">
                                Has template
                            </span>
                        )}
                    </div>

                    {/* Description (inline edit) */}
                    {editing === "description" ? (
                        <div className="flex items-start gap-1.5">
                            <Textarea
                                value={draftDescription}
                                onChange={(e) => setDraftDescription(e.target.value)}
                                className="text-sm min-h-[64px] bg-slate-950 border-slate-800 text-white"
                                autoFocus
                            />
                            <div className="flex flex-col gap-1">
                                <button onClick={() => { onSaveField(row.id, "description", draftDescription.trim() || null); setEditing(null) }} className="h-7 w-7 rounded-md flex items-center justify-center text-emerald-400 hover:bg-emerald-500/10">
                                    <Check className="h-3.5 w-3.5" />
                                </button>
                                <button onClick={() => { setDraftDescription(row.description ?? ""); setEditing(null) }} className="h-7 w-7 rounded-md flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-500/10">
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button onClick={() => setEditing("description")} className="text-xs text-slate-400 hover:text-slate-200 text-left block w-full">
                            {row.description || <span className="italic">+ Add a description</span>}
                        </button>
                    )}

                    {/* Template controls */}
                    <div className="flex items-center gap-2 flex-wrap pt-1">
                        {row.templateUrl ? (
                            <>
                                <a
                                    href={row.templateUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-950/60 text-slate-200 hover:border-brand-blue hover:text-brand-blue"
                                >
                                    <FileText className="h-3 w-3" />
                                    {row.templateOriginalName || "Open template"}
                                    <ExternalLink className="h-3 w-3 opacity-60" />
                                </a>
                                <button
                                    type="button"
                                    onClick={() => fileRef.current?.click()}
                                    disabled={uploading}
                                    className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-950/60 text-slate-200 hover:border-brand-blue hover:text-brand-blue disabled:opacity-60"
                                >
                                    {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <UploadCloud className="h-3 w-3" />}
                                    Replace
                                </button>
                                <button
                                    type="button"
                                    onClick={handleRemoveTemplate}
                                    className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-950/60 text-slate-200 hover:border-red-400 hover:text-red-400"
                                >
                                    <Trash2 className="h-3 w-3" />
                                    Remove template
                                </button>
                            </>
                        ) : (
                            <button
                                type="button"
                                onClick={() => fileRef.current?.click()}
                                disabled={uploading}
                                className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-dashed border-slate-700 text-slate-400 hover:border-brand-blue hover:text-brand-blue disabled:opacity-60"
                            >
                                {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <UploadCloud className="h-3 w-3" />}
                                Attach a fillable template
                            </button>
                        )}
                        <input
                            ref={fileRef}
                            type="file"
                            accept="application/pdf,image/*,.doc,.docx,.xls,.xlsx"
                            className="hidden"
                            onChange={(e) => {
                                const f = e.target.files?.[0]
                                if (f) handleUploadTemplate(f)
                                if (fileRef.current) fileRef.current.value = ""
                            }}
                        />
                    </div>
                </div>

                {/* Side actions */}
                <div className="shrink-0 flex flex-col gap-1">
                    <button
                        type="button"
                        onClick={() => onSaveField(row.id, "required", !row.required)}
                        className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-brand-blue px-2 py-1 rounded"
                        title={row.required ? "Make optional" : "Make required"}
                    >
                        {row.required ? "Optional?" : "Require?"}
                    </button>
                    {row.active ? (
                        <button
                            type="button"
                            onClick={() => onSoftDelete(row.id)}
                            className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-red-400 px-2 py-1 rounded flex items-center gap-1"
                            title="Deactivate"
                        >
                            <EyeOff className="h-3 w-3" />
                            Hide
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => onSaveField(row.id, "active", true)}
                            className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 hover:text-emerald-300 px-2 py-1 rounded flex items-center gap-1"
                            title="Re-activate"
                        >
                            <Eye className="h-3 w-3" />
                            Show
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
    )
}
