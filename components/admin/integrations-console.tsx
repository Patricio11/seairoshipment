"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { MapPin, Mail, MessageCircle, Loader2, ArrowRight, CheckCircle2, XCircle, Plug } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { INTEGRATIONS, type IntegrationMeta } from "@/lib/integrations"

const ICONS: Record<string, typeof MapPin> = {
    google_maps: MapPin,
    resend: Mail,
    whatsapp: MessageCircle,
}

interface IntegrationStatus {
    key: string
    enabled: boolean
    configured: boolean
}

export function IntegrationsConsole() {
    const [statuses, setStatuses] = useState<Record<string, IntegrationStatus>>({})
    const [loading, setLoading] = useState(true)
    const [configuring, setConfiguring] = useState<IntegrationMeta | null>(null)

    const fetchStatuses = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/integrations", { cache: "no-store" })
            if (res.ok) {
                const d = await res.json()
                const map: Record<string, IntegrationStatus> = {}
                for (const s of d.statuses ?? []) map[s.key] = s
                setStatuses(map)
            }
        } catch { /* silently fail */ }
        finally { setLoading(false) }
    }, [])

    useEffect(() => { fetchStatuses() }, [fetchStatuses])

    const handleToggle = async (meta: IntegrationMeta, enabled: boolean) => {
        // Toggling on without config → open the config dialog instead.
        const status = statuses[meta.key]
        if (enabled && !status?.configured) {
            setConfiguring(meta)
            return
        }
        try {
            const res = await fetch(`/api/admin/integrations/${meta.key}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ enabled, creds: {} }),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
                toast.error(data.error || "Failed to update")
                return
            }
            toast.success(`${meta.name} ${enabled ? "enabled" : "disabled"}`)
            fetchStatuses()
        } catch {
            toast.error("Failed to update")
        }
    }

    return (
        <div className="space-y-6">
            {loading ? (
                <div className="flex items-center justify-center py-20 text-slate-500">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading integrations…
                </div>
            ) : (
                <div className="grid md:grid-cols-2 gap-4">
                    {INTEGRATIONS.map(meta => {
                        const status = statuses[meta.key] ?? { enabled: false, configured: false }
                        const Icon = ICONS[meta.key] ?? Plug
                        return (
                            <div key={meta.key} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col gap-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className="h-12 w-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
                                            <Icon className="h-6 w-6 text-emerald-500" />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-black text-white text-lg leading-tight">{meta.name}</h3>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{meta.category}</p>
                                        </div>
                                    </div>
                                    <Switch
                                        checked={status.enabled}
                                        onCheckedChange={(v) => handleToggle(meta, v)}
                                        className="data-[state=checked]:bg-emerald-600"
                                    />
                                </div>
                                <p className="text-sm text-slate-400 leading-relaxed">{meta.description}</p>
                                <div className="flex items-center justify-between mt-auto pt-2">
                                    {status.configured ? (
                                        <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">
                                            <CheckCircle2 className="h-3 w-3 mr-1" /> Configured
                                        </Badge>
                                    ) : (
                                        <Badge className="bg-slate-500/10 text-slate-400 border-slate-500/20 text-[10px]">
                                            Not configured
                                        </Badge>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setConfiguring(meta)}
                                        className="inline-flex items-center gap-1 text-xs font-bold text-slate-300 hover:text-white"
                                    >
                                        Configure <ArrowRight className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {configuring && (
                <IntegrationConfigDialog
                    meta={configuring}
                    status={statuses[configuring.key] ?? { key: configuring.key, enabled: false, configured: false }}
                    onClose={() => setConfiguring(null)}
                    onSaved={() => { setConfiguring(null); fetchStatuses() }}
                />
            )}
        </div>
    )
}

function IntegrationConfigDialog({
    meta,
    status,
    onClose,
    onSaved,
}: {
    meta: IntegrationMeta
    status: IntegrationStatus
    onClose: () => void
    onSaved: () => void
}) {
    const [values, setValues] = useState<Record<string, string>>({})
    const [enabled, setEnabled] = useState(status.enabled)
    const [saving, setSaving] = useState(false)
    const [testing, setTesting] = useState(false)
    const [testResult, setTestResult] = useState<{ ok: boolean; detail: string } | null>(null)

    const Icon = ICONS[meta.key] ?? Plug

    const handleTest = async () => {
        setTesting(true)
        setTestResult(null)
        try {
            const res = await fetch(`/api/admin/integrations/${meta.key}/test`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ creds: values }),
            })
            const data = await res.json().catch(() => ({}))
            setTestResult({ ok: Boolean(data.ok), detail: data.detail || (data.ok ? "Connected." : "Test failed.") })
        } catch {
            setTestResult({ ok: false, detail: "Could not run the test." })
        } finally {
            setTesting(false)
        }
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            const res = await fetch(`/api/admin/integrations/${meta.key}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ enabled, creds: values }),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
                toast.error(data.error || "Failed to save")
                return
            }
            toast.success(`${meta.name} saved${enabled ? " and enabled" : ""}`)
            onSaved()
        } catch {
            toast.error("Failed to save")
        } finally {
            setSaving(false)
        }
    }

    return (
        <Dialog open onOpenChange={(o) => !saving && !o && onClose()}>
            <DialogContent className="dark bg-slate-950 border-slate-800 text-white sm:max-w-[440px]">
                <DialogHeader>
                    <DialogTitle className="text-xl font-black tracking-tight flex items-center gap-2">
                        <Icon className="h-5 w-5 text-emerald-500" />
                        {meta.name.toUpperCase()}
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                        {meta.description}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {meta.fields.map(field => (
                        <div key={field.name} className="space-y-1.5">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{field.label}</Label>
                            <Input
                                type={field.secret ? "password" : "text"}
                                value={values[field.name] ?? ""}
                                onChange={(e) => setValues({ ...values, [field.name]: e.target.value })}
                                placeholder={status.configured && field.secret ? "•••••• (blank keeps the stored value)" : field.placeholder}
                                className="bg-slate-900 border-slate-800 h-9 text-sm font-mono"
                                autoComplete="off"
                            />
                        </div>
                    ))}

                    <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3">
                        <div>
                            <p className="text-sm font-bold text-white">Enabled</p>
                            <p className="text-[10px] text-slate-500">Features stay dormant until switched on.</p>
                        </div>
                        <Switch checked={enabled} onCheckedChange={setEnabled} className="data-[state=checked]:bg-emerald-600" />
                    </div>

                    {testResult && (
                        <div className={cn(
                            "flex items-start gap-2 rounded-lg border px-3 py-2.5 text-xs",
                            testResult.ok
                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                                : "border-red-500/30 bg-red-500/10 text-red-300",
                        )}>
                            {testResult.ok ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" /> : <XCircle className="h-4 w-4 shrink-0 mt-0.5" />}
                            {testResult.detail}
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2">
                    <Button
                        variant="outline"
                        onClick={handleTest}
                        disabled={testing || saving}
                        className="bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
                    >
                        {testing && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                        Test connection
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={saving || testing}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-6"
                    >
                        {saving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                        Save
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
