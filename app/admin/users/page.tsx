import { UserVettingTable } from "@/components/admin/user-vetting-table"
import { Users } from "lucide-react"

export default function UsersPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center">
                    <Users className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">User Vetting Queue</h1>
                    <p className="text-slate-500">Review and approve new client applications.</p>
                </div>
            </div>

            <UserVettingTable />
        </div>
    )
}
