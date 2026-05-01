import Link from "next/link"
import { UserVettingTable } from "@/components/admin/user-vetting-table"
import { Users, FileSpreadsheet } from "lucide-react"

export default function UsersPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center">
                        <Users className="h-6 w-6 text-purple-500" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight">User Vetting Queue</h1>
                        <p className="text-slate-500">Review and approve new client applications.</p>
                    </div>
                </div>
                <Link
                    href="/admin/users/requirements"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-slate-700 text-sm font-bold text-slate-300 hover:text-white transition-colors"
                >
                    <FileSpreadsheet className="h-4 w-4" />
                    Manage Onboarding Requirements
                </Link>
            </div>

            <UserVettingTable />
        </div>
    )
}
