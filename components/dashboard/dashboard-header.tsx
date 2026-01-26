"use client"

import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SearchCommand } from "./search-command"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { authClient } from "@/lib/auth/client"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export function DashboardHeader() {
    const router = useRouter()

    const handleSignOut = async () => {
        try {
            await authClient.signOut()
            toast.success("Signed out successfully")
            router.push("/")
            router.refresh()
        } catch (error) {
            toast.error("Failed to sign out")
        }
    }

    return (
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-slate-200/50 bg-white/50 px-6 backdrop-blur-xl dark:border-slate-800/50 dark:bg-slate-900/50">
            <div className="flex flex-1 items-center gap-4">
                {/* Mobile menu trigger will be handled in layout */}
                <div className="hidden md:flex flex-col">
                    <h1 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Overview</h1>
                    <span className="text-xs text-slate-500">Dashboard / Welcome back</span>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <SearchCommand />

                <Button variant="ghost" size="icon" className="relative text-slate-500 hover:bg-slate-100/50 dark:text-slate-400 dark:hover:bg-slate-800/50">
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-950 animate-pulse" />
                    <span className="sr-only">Notifications</span>
                </Button>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-9 w-9 rounded-full ring-2 ring-white/50 dark:ring-slate-800/50">
                            <Avatar className="h-9 w-9">
                                <AvatarImage src="/avatars/01.png" alt="@johndoe" />
                                <AvatarFallback className="bg-gradient-to-br from-brand-blue to-brand-green text-white">JD</AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">John Doe</p>
                                <p className="text-xs leading-none text-muted-foreground">
                                    john.doe@savino.com
                                </p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                            Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            Billing
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            Settings
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className="text-red-500 focus:text-red-500 cursor-pointer"
                            onClick={handleSignOut}
                        >
                            Log out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    )
}
