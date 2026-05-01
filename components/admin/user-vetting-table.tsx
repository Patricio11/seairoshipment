"use client"

import { useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, Eye, Loader2, Inbox, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { UserReviewModal, type VettingUser } from "./user-review-modal"

type Tab = "PENDING_REVIEW" | "EMAIL_PENDING" | "ONBOARDING_PENDING" | "APPROVED" | "REJECTED" | "ALL"

const TAB_LABELS: Record<Tab, string> = {
    PENDING_REVIEW: "Pending Review",
    EMAIL_PENDING: "Email Pending",
    ONBOARDING_PENDING: "Onboarding",
    APPROVED: "Approved",
    REJECTED: "Rejected",
    ALL: "All",
}

export function UserVettingTable() {
    const [users, setUsers] = useState<VettingUser[]>([])
    const [loading, setLoading] = useState(true)
    const [tab, setTab] = useState<Tab>("PENDING_REVIEW")
    const [search, setSearch] = useState("")
    const [selected, setSelected] = useState<VettingUser | null>(null)
    const [refreshKey, setRefreshKey] = useState(0)

    useEffect(() => {
        let cancelled = false
        fetch("/api/admin/users/vetting", { cache: "no-store" })
            .then(r => r.json())
            .then(d => {
                if (cancelled) return
                if (Array.isArray(d.users)) setUsers(d.users)
            })
            .catch(() => { })
            .finally(() => { if (!cancelled) setLoading(false) })
        return () => { cancelled = true }
    }, [refreshKey])

    const counts = useMemo(() => {
        const c: Record<Tab, number> = {
            PENDING_REVIEW: 0,
            EMAIL_PENDING: 0,
            ONBOARDING_PENDING: 0,
            APPROVED: 0,
            REJECTED: 0,
            ALL: users.length,
        }
        for (const u of users) {
            if (u.vettingStatus === "PENDING_REVIEW") c.PENDING_REVIEW++
            else if (u.vettingStatus === "EMAIL_PENDING") c.EMAIL_PENDING++
            else if (u.vettingStatus === "ONBOARDING_PENDING") c.ONBOARDING_PENDING++
            else if (u.vettingStatus === "APPROVED") c.APPROVED++
            else if (u.vettingStatus === "REJECTED") c.REJECTED++
        }
        return c
    }, [users])

    const filtered = useMemo(() => {
        let list = users
        if (tab !== "ALL") list = list.filter(u => u.vettingStatus === tab)
        if (search.trim()) {
            const q = search.toLowerCase()
            list = list.filter(u =>
                (u.companyName || "").toLowerCase().includes(q) ||
                u.name.toLowerCase().includes(q) ||
                u.email.toLowerCase().includes(q) ||
                (u.companyReg || "").toLowerCase().includes(q),
            )
        }
        return list
    }, [users, tab, search])

    const refresh = () => setRefreshKey(k => k + 1)

    return (
        <div className="space-y-4">
            {/* Tabs + search */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-2xl p-1 w-fit">
                    {(["PENDING_REVIEW", "EMAIL_PENDING", "ONBOARDING_PENDING", "APPROVED", "REJECTED", "ALL"] as Tab[]).map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={cn(
                                "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                                tab === t
                                    ? "bg-slate-900 text-white shadow-sm"
                                    : "text-slate-500 hover:text-white",
                            )}
                        >
                            {TAB_LABELS[t]}
                            <span className={cn(
                                "px-1.5 py-0.5 rounded-md text-[9px] font-mono",
                                tab === t ? "bg-brand-blue/20 text-brand-blue" : "bg-slate-800 text-slate-500",
                            )}>
                                {counts[t]}
                            </span>
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative max-w-xs w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                        <Input
                            placeholder="Search company, contact or reg no…"
                            className="pl-9 h-9 bg-slate-950 border-slate-800 text-sm"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={refresh}
                        className="h-9 w-9 border-slate-800 bg-slate-950 hover:bg-slate-900"
                        aria-label="Refresh"
                    >
                        <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950/30">
                <Table>
                    <TableHeader className="bg-slate-900">
                        <TableRow className="hover:bg-transparent border-slate-800">
                            <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Company</TableHead>
                            <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Contact</TableHead>
                            <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Reg / VAT</TableHead>
                            <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Docs</TableHead>
                            <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Status</TableHead>
                            <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow className="border-slate-800">
                                <TableCell colSpan={6} className="py-12 text-center text-slate-500">
                                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                                    Loading vetting queue…
                                </TableCell>
                            </TableRow>
                        ) : filtered.length === 0 ? (
                            <TableRow className="border-slate-800">
                                <TableCell colSpan={6} className="py-16 text-center">
                                    <Inbox className="h-8 w-8 mx-auto mb-2 text-slate-700" />
                                    <p className="text-sm font-bold text-slate-400">
                                        {tab === "PENDING_REVIEW" ? "No applications waiting" : "Nothing here"}
                                    </p>
                                    <p className="text-xs text-slate-600 mt-1">
                                        {tab === "PENDING_REVIEW"
                                            ? "New onboarding submissions will appear here."
                                            : "Try a different tab."}
                                    </p>
                                </TableCell>
                            </TableRow>
                        ) : (
                            <AnimatePresence>
                                {filtered.map(u => (
                                    <motion.tr
                                        key={u.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="border-slate-800 hover:bg-slate-900/40 cursor-pointer"
                                        onClick={() => setSelected(u)}
                                    >
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-white truncate max-w-[220px]">{u.companyName || <span className="italic text-slate-500">— not provided —</span>}</span>
                                                <span className="text-[10px] text-slate-600 mt-0.5 font-mono">{u.id}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-medium text-slate-300">{u.name}</span>
                                                <span className="text-[10px] text-slate-500">{u.email}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-mono text-slate-300">{u.companyReg || "—"}</span>
                                                <span className="text-[10px] text-slate-500 font-mono">VAT {u.vatNumber || "—"}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-xs font-mono text-slate-400">{u.documents.length}</span>
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge status={u.vettingStatus} accountNumber={u.accountNumber} />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={(e) => { e.stopPropagation(); setSelected(u) }}
                                                className="h-8 text-slate-400 hover:text-brand-blue"
                                            >
                                                <Eye className="h-3.5 w-3.5 mr-1" /> Review
                                            </Button>
                                        </TableCell>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                        )}
                    </TableBody>
                </Table>
            </div>

            <UserReviewModal
                user={selected}
                open={!!selected}
                onClose={() => setSelected(null)}
                onActionComplete={refresh}
            />
        </div>
    )
}

function StatusBadge({ status, accountNumber }: { status: VettingUser["vettingStatus"]; accountNumber: string | null }) {
    if (status === "APPROVED") {
        return (
            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] uppercase tracking-widest font-black">
                Approved{accountNumber ? ` · ${accountNumber}` : ""}
            </Badge>
        )
    }
    if (status === "REJECTED") {
        return <Badge className="bg-red-500/10 text-red-400 border-red-500/30 text-[10px] uppercase tracking-widest font-black">Rejected</Badge>
    }
    if (status === "PENDING_REVIEW") {
        return <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px] uppercase tracking-widest font-black">Pending Review</Badge>
    }
    if (status === "ONBOARDING_PENDING") {
        return <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-[10px] uppercase tracking-widest font-black">Onboarding</Badge>
    }
    return <Badge className="bg-slate-500/10 text-slate-400 border-slate-500/30 text-[10px] uppercase tracking-widest font-black">Email Pending</Badge>
}
