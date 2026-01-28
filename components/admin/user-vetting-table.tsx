"use client"

import { useState } from "react"
import { Check, X, Eye, FileText, UserCheck, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

const MOCK_USERS = [
    { id: "USR-PEND-01", name: "Global Fruits Trading", contact: "Sarah Jenkins", email: "sarah@gft.co.za", status: "PENDING", date: "2 mins ago", docs: ["CK Document", "Tax Clearance"] },
    { id: "USR-PEND-02", name: "Oceanic Seafoods", contact: "Mike Ross", email: "mike@oceanic.com", status: "PENDING", date: "45 mins ago", docs: ["CK Document"] },
    { id: "USR-VET-01", name: "Cape Citrus Exporters", contact: "John Doe", email: "john@cce.co.za", status: "VETTED", date: "2 days ago", account: "ACC-9921" },
    { id: "USR-REJ-01", name: "Fake Co Ltd", contact: "Scammer Steve", email: "steve@fake.com", status: "REJECTED", date: "5 days ago", reason: "Invalid Tax Number" },
]

export function UserVettingTable() {
    const [selectedUser, setSelectedUser] = useState<any>(null)
    const [isApproveOpen, setIsApproveOpen] = useState(false)
    const [generatedAcc, setGeneratedAcc] = useState("")

    const handleApproveClick = (user: any) => {
        setSelectedUser(user)
        setGeneratedAcc(`ACC-${Math.floor(Math.random() * 10000)}`)
        setIsApproveOpen(true)
    }

    return (
        <div className="space-y-6">
            <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950/30">
                <Table>
                    <TableHeader className="bg-slate-900">
                        <TableRow className="hover:bg-transparent border-slate-800">
                            <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Company Info</TableHead>
                            <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Status</TableHead>
                            <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Docs Submitted</TableHead>
                            <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-[10px] text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {MOCK_USERS.map((user) => (
                            <TableRow key={user.id} className="border-slate-800 hover:bg-slate-900/40">
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-white">{user.name}</span>
                                        <span className="text-xs text-slate-500">{user.contact} • {user.email}</span>
                                        <span className="text-[10px] text-slate-600 mt-1 font-mono">{user.date}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {user.status === 'PENDING' && <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">PENDING REVIEW</Badge>}
                                    {user.status === 'VETTED' && <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">VETTED • {user.account}</Badge>}
                                    {user.status === 'REJECTED' && <Badge className="bg-red-500/10 text-red-500 border-red-500/20">REJECTED</Badge>}
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-wrap gap-2 text-xs">
                                        {user.docs?.map((doc: string) => (
                                            <div key={doc} className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded border border-slate-800 text-slate-400">
                                                <FileText className="h-3 w-3" />
                                                {doc}
                                            </div>
                                        )) || <span className="text-slate-600 italic">No docs viewed</span>}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">
                                    {user.status === 'PENDING' ? (
                                        <div className="flex justify-end gap-2">
                                            <Button size="sm" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800">
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            <Button onClick={() => handleApproveClick(user)} size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                                                <Check className="h-4 w-4 mr-1" /> Approve
                                            </Button>
                                            <Button size="sm" className="h-8 bg-slate-900 border border-slate-700 hover:bg-red-950 hover:text-red-500 hover:border-red-900 text-slate-400 font-bold">
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button size="sm" variant="ghost" disabled className="text-slate-600">
                                            Processed
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isApproveOpen} onOpenChange={setIsApproveOpen}>
                <DialogContent className="bg-slate-900 border-slate-800 text-white sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <UserCheck className="h-5 w-5 text-emerald-500" />
                            Approve Account
                        </DialogTitle>
                        <DialogDescription className="text-slate-400">
                            You are about to vetting <strong>{selectedUser?.name}</strong>. This will generate a unique account number and send the welcome email.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="p-4 bg-slate-950 rounded-lg space-y-4 border border-slate-800 mt-4">
                        <div className="space-y-2">
                            <Label className="text-xs text-slate-500 uppercase font-bold">Generated Account #</Label>
                            <div className="flex gap-2">
                                <Input value={generatedAcc} readOnly className="bg-slate-900 border-slate-800 text-emerald-400 font-mono font-bold" />
                                <Button size="icon" variant="outline" className="border-slate-800"><ShieldAlert className="h-4 w-4 text-slate-500" /></Button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs text-slate-500 uppercase font-bold">Assign Credit Limit (ZAR)</Label>
                            <Input defaultValue="500,000" className="bg-slate-900 border-slate-800" />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsApproveOpen(false)} className="text-slate-400 hover:text-white">Cancel</Button>
                        <Button onClick={() => setIsApproveOpen(false)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                            Authorize & Send Email
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
