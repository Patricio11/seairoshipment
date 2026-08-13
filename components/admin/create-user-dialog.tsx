"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Loader2, UserPlus, RefreshCw, Copy, Truck, Building2 } from "lucide-react"
import { PAYMENT_TERMS, type PaymentTerms } from "@/lib/payment-terms"
import { toast } from "sonner"

const CREATABLE_ROLES = [
    { value: "client", label: "Customer", description: "Full customer account - books sea + road freight. Skips onboarding/vetting." },
    { value: "road_manager", label: "Road Freight Manager", description: "Trucks, road rates, approvals, PODs" },
    { value: "road_ops", label: "Road Freight Operations", description: "Confirm loads and PODs only - no rates or truck changes" },
] as const
type CreatableRole = (typeof CREATABLE_ROLES)[number]["value"]

function generatePassword() {
    // Readable temp password: 3 blocks of 4 from an unambiguous alphabet
    const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789"
    const block = () => Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("")
    return `${block()}-${block()}-${block()}`
}

export function CreateUserDialog() {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [companyName, setCompanyName] = useState("")
    const [password, setPassword] = useState(generatePassword())
    const [role, setRole] = useState<CreatableRole>("client")
    const [terms, setTerms] = useState<PaymentTerms>("SPLIT_60_40")

    const reset = () => {
        setName("")
        setEmail("")
        setCompanyName("")
        setPassword(generatePassword())
        setRole("client")
        setTerms("SPLIT_60_40")
    }

    const handleCreate = async () => {
        setSaving(true)
        try {
            const res = await fetch("/api/admin/users/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    email,
                    password,
                    role,
                    ...(role === "client" ? { companyName, paymentTerms: terms } : {}),
                }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Failed to create user")
            toast.success(`${role === "client" ? "Customer" : "Staff"} account created`, {
                description: `${email} can now sign in with the temporary password.`,
            })
            setOpen(false)
            reset()
            router.refresh()
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to create user")
        } finally {
            setSaving(false)
        }
    }

    const copyCredentials = async () => {
        try {
            await navigator.clipboard.writeText(`Email: ${email}\nTemporary password: ${password}`)
            toast.success("Credentials copied - share them securely")
        } catch {
            toast.error("Couldn't copy to clipboard")
        }
    }

    return (
        <>
            <Button
                onClick={() => setOpen(true)}
                className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold gap-2"
            >
                <UserPlus className="h-4 w-4" /> Add User
            </Button>

            <Dialog open={open} onOpenChange={(v) => { if (!saving) setOpen(v) }}>
                <DialogContent className="dark bg-slate-950 border-slate-800 text-slate-200 sm:max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-white flex items-center gap-2">
                            <UserPlus className="h-5 w-5 text-emerald-500" /> Add User
                        </DialogTitle>
                        <DialogDescription className="text-slate-500">
                            Creates a ready-to-use account with a temporary password. They can change it later in Settings → Security.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Account type</Label>
                            <div className="space-y-2">
                                {CREATABLE_ROLES.map((r) => (
                                    <button
                                        key={r.value}
                                        type="button"
                                        onClick={() => setRole(r.value)}
                                        className={`w-full text-left rounded-lg border px-3 py-2.5 transition-all ${
                                            role === r.value
                                                ? "border-emerald-600 bg-emerald-950/40"
                                                : "border-slate-800 bg-slate-900 hover:border-slate-700"
                                        }`}
                                    >
                                        <p className="text-sm font-bold text-white flex items-center gap-1.5">
                                            {r.value === "client" ? <Building2 className="h-3.5 w-3.5 text-slate-400" /> : <Truck className="h-3.5 w-3.5 text-slate-400" />}
                                            {r.label}
                                        </p>
                                        <p className="text-[11px] text-slate-500 mt-0.5">{r.description}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Full name</Label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Thabo Nkosi"
                                className="bg-slate-900 border-slate-800 text-white"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Email</Label>
                            <Input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@company.co.za"
                                className="bg-slate-900 border-slate-800 text-white"
                            />
                        </div>
                        {role === "client" && (
                            <>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Company name</Label>
                                    <Input
                                        value={companyName}
                                        onChange={(e) => setCompanyName(e.target.value)}
                                        placeholder="e.g. Britos Meat Distributors"
                                        className="bg-slate-900 border-slate-800 text-white"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Payment terms</Label>
                                    <select
                                        value={terms}
                                        onChange={(e) => setTerms(e.target.value as PaymentTerms)}
                                        className="w-full h-10 rounded-md border border-slate-800 bg-slate-900 px-3 text-sm text-white"
                                    >
                                        {PAYMENT_TERMS.map((t) => (
                                            <option key={t.value} value={t.value}>{t.label}</option>
                                        ))}
                                    </select>
                                    <p className="text-[11px] text-slate-500">
                                        {PAYMENT_TERMS.find((t) => t.value === terms)?.description}
                                    </p>
                                </div>
                            </>
                        )}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Temporary password</Label>
                            <div className="flex gap-2">
                                <Input
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="bg-slate-900 border-slate-800 text-white font-mono"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setPassword(generatePassword())}
                                    className="border-slate-800 bg-slate-900 text-slate-400 hover:text-white shrink-0"
                                    title="Generate new password"
                                >
                                    <RefreshCw className="h-4 w-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={copyCredentials}
                                    className="border-slate-800 bg-slate-900 text-slate-400 hover:text-white shrink-0"
                                    title="Copy email + password"
                                >
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </div>
                            <p className="text-[11px] text-slate-500">Copy and share these credentials securely - the password isn&apos;t shown again after creation.</p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setOpen(false)}
                            disabled={saving}
                            className="border-slate-800 bg-slate-900 text-slate-300 hover:text-white"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreate}
                            disabled={saving || !name.trim() || !email.trim() || password.length < 8}
                            className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold"
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
                            Create Account
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
