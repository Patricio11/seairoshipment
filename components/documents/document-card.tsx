"use client"

import { FileText, MoreVertical, Download, Eye, Share2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export type DocType = "Invoice" | "BoL" | "CoA" | "PackingList" | "Other"

interface DocumentCardProps {
    id: string
    name: string
    type: DocType
    size: string
    date: string
    refId?: string
}

const TypeColors: Record<DocType, string> = {
    Invoice: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    BoL: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
    CoA: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
    PackingList: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
    Other: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
}

export function DocumentCard({ name, type, size, date, refId }: DocumentCardProps) {
    return (
        <Card className="group hover:shadow-lg transition-all border-slate-200 dark:border-slate-800">
            <CardContent className="p-4">
                <div className="flex items-start justify-between">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${TypeColors[type]}`}>
                        <FileText className="h-5 w-5" />
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                                <Eye className="mr-2 h-4 w-4" /> Preview
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <Download className="mr-2 h-4 w-4" /> Download
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <Share2 className="mr-2 h-4 w-4" /> Share
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <div className="mt-4 space-y-1">
                    <h3 className="font-medium text-slate-900 dark:text-slate-100 truncate" title={name}>
                        {name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>{size}</span>
                        <span>•</span>
                        <span>{date}</span>
                    </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                    <Badge variant="secondary" className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-none">
                        {type}
                    </Badge>
                    {refId && (
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-50 dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                            {refId}
                        </span>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
