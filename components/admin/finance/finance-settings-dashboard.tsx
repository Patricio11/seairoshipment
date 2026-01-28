"use client"

import { MOCK_EXCHANGE_RATES, getFinanceSettings, getTotalFinanceRate } from "@/lib/mock-data/finance-settings"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
    TrendingUp,
    RefreshCw,
    Edit,
    Calendar,
    DollarSign,
    Percent
} from "lucide-react"
import { toast } from "sonner"

export function FinanceSettingsDashboard() {
    const financeSettings = getFinanceSettings()
    const totalRate = getTotalFinanceRate()

    const handleManualOverride = (currency: string) => {
        toast.info(`Manual override for ${currency}/ZAR - Feature coming soon`)
    }

    const handleUpdateSettings = () => {
        toast.success("Finance settings updated successfully")
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                    Finance Settings & Exchange Rates
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Manage exchange rates, prime lending rate, and global finance parameters
                </p>
            </div>

            {/* Exchange Rates */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        Current Exchange Rates
                    </h3>
                    <Button variant="outline" size="sm">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refresh Rates
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {MOCK_EXCHANGE_RATES.map((rate) => (
                        <Card key={rate.id} className="p-6">
                            <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <DollarSign className="h-4 w-4 text-slate-400" />
                                        <span className="text-sm font-medium text-slate-500">
                                            {rate.fromCurrency} → ZAR
                                        </span>
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-3xl font-black text-slate-900 dark:text-white">
                                            {rate.rate.toFixed(2)}
                                        </span>
                                        <TrendingUp className="h-5 w-5 text-emerald-500" />
                                    </div>
                                </div>
                                <Badge
                                    variant="outline"
                                    className="text-xs font-mono bg-slate-100 dark:bg-slate-800"
                                >
                                    {rate.source}
                                </Badge>
                            </div>
                            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <div className="flex items-center justify-between text-xs text-slate-500">
                                    <span>Updated: {new Date(rate.effectiveDate).toLocaleDateString()}</span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs"
                                        onClick={() => handleManualOverride(rate.fromCurrency)}
                                    >
                                        <Edit className="mr-1 h-3 w-3" />
                                        Override
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>

            <Separator />

            {/* Finance Settings */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        Global Finance Parameters
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Calendar className="h-3 w-3" />
                        Effective from: {new Date(financeSettings.effectiveFrom).toLocaleDateString()}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column */}
                    <Card className="p-6 space-y-6">
                        <div>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4">
                                Interest Rate Settings
                            </h4>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-xs text-slate-500">Prime Lending Rate (%)</Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="number"
                                            step="0.01"
                                            defaultValue={financeSettings.primeLendingRate}
                                            className="font-mono text-lg font-bold"
                                        />
                                        <Percent className="h-4 w-4 text-slate-400" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs text-slate-500">Finance Margin (%)</Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="number"
                                            step="0.01"
                                            defaultValue={financeSettings.financeMargin}
                                            className="font-mono text-lg font-bold"
                                        />
                                        <Percent className="h-4 w-4 text-slate-400" />
                                    </div>
                                </div>

                                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-blue-900 dark:text-blue-300">
                                            Total Finance Rate
                                        </span>
                                        <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
                                            {totalRate.toFixed(2)}%
                                        </span>
                                    </div>
                                    <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                                        Prime ({financeSettings.primeLendingRate}%) + Margin ({financeSettings.financeMargin}%)
                                    </p>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Right Column */}
                    <Card className="p-6 space-y-6">
                        <div>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4">
                                Payment Split Settings
                            </h4>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-xs text-slate-500">Deposit Percentage (%)</Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="number"
                                            step="1"
                                            defaultValue={financeSettings.depositPercentage}
                                            className="font-mono text-lg font-bold"
                                        />
                                        <Percent className="h-4 w-4 text-slate-400" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs text-slate-500">Balance Percentage (%)</Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="number"
                                            step="1"
                                            defaultValue={financeSettings.balancePercentage}
                                            className="font-mono text-lg font-bold"
                                        />
                                        <Percent className="h-4 w-4 text-slate-400" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs text-slate-500">VAT Rate (%)</Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="number"
                                            step="0.01"
                                            defaultValue={financeSettings.vatRate}
                                            className="font-mono text-lg font-bold"
                                        />
                                        <Percent className="h-4 w-4 text-slate-400" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="flex justify-end pt-4">
                    <Button className="bg-brand-blue hover:bg-blue-700" onClick={handleUpdateSettings}>
                        Save Finance Settings
                    </Button>
                </div>
            </div>
        </div>
    )
}
