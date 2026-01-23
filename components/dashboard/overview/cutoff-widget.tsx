"use client"

import { useEffect, useState } from "react"
import { Clock, Ship } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

export function CutoffWidget() {
    // Mock Logic: Calculate time until next Friday 12:00
    // For demo, we'll just show a static "3 days 4 hours" or typical countdown visualization

    const [progress, setProgress] = useState(65)

    useEffect(() => {
        const timer = setTimeout(() => setProgress(66), 500)
        return () => clearTimeout(timer)
    }, [])

    return (
        <Card className="col-span-1 border-slate-200/50 dark:border-slate-800/50 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-900/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-slate-500">Next Cut-Off</CardTitle>
                <Ship className="h-4 w-4 text-brand-blue" />
            </CardHeader>
            <CardContent>
                <div className="flex flex-col gap-4">
                    <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">2d 14h</span>
                        <span className="text-sm font-medium text-slate-500">remaining</span>
                    </div>

                    <div className="space-y-1">
                        <div className="flex w-full justify-between text-xs text-muted-foreground">
                            <span>Target: Fri 12:00</span>
                            <span className="text-amber-600 font-medium">Closing Soon</span>
                        </div>
                        <Progress value={progress} className="h-2 bg-slate-100" indicatorClassName="bg-amber-500" />
                    </div>

                    <div className="rounded-lg bg-blue-50/50 p-2 border border-blue-100 dark:bg-blue-900/20 dark:border-blue-800 flex items-center gap-2 text-xs text-slate-600 dark:text-blue-100">
                        <Clock className="h-3 w-3 text-brand-blue" />
                        <span>Next Vessel: <strong>MSC Orchestra</strong> (Voy 921)</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
