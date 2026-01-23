"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

interface PaymentTrackerProps {
    refId: string
    totalAmount: number
    depositPaid: boolean
    finalPaid: boolean
}

export function PaymentTracker({ refId, totalAmount, depositPaid, finalPaid }: PaymentTrackerProps) {
    // Logic: 0% -> 60% -> 100%
    const progress = finalPaid ? 100 : depositPaid ? 60 : 0

    return (
        <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold">{refId}</span>
                    <Badge variant="outline" className="text-[10px] font-normal">
                        Total: ${totalAmount.toLocaleString()}
                    </Badge>
                </div>
                <span className="text-xs font-medium text-slate-500">
                    {progress}% Settle
                </span>
            </CardHeader>
            <CardContent className="p-4 pt-2">
                <div className="relative pt-1">
                    <Progress value={progress} className="h-3" />

                    {/* Markers */}
                    <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-medium">
                        <span className={depositPaid ? "text-emerald-600 font-bold" : ""}>
                            Deposit (60%)
                        </span>
                        <span className={finalPaid ? "text-emerald-600 font-bold" : ""}>
                            Final Balance (40%)
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
