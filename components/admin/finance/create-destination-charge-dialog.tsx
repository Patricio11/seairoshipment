"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Plus, Loader2 } from "lucide-react"

interface ContainerTypeData { id: string; displayName: string; active: boolean }
interface SalesRateTypeData { id: string; code: string; name: string; active: boolean }
interface LocationData { id: string; name: string; code: string; country: string }

export function CreateDestinationChargeDialog({ onSuccess }: { onSuccess?: () => void }) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [containers, setContainers] = useState<ContainerTypeData[]>([])
    const [salesRateTypes, setSalesRateTypes] = useState<SalesRateTypeData[]>([])
    const [destLocations, setDestLocations] = useState<LocationData[]>([])

    useEffect(() => {
        const timeout = setTimeout(async () => {
            try {
                const [cRes, sRes, lRes] = await Promise.all([
                    fetch("/api/admin/container-types"),
                    fetch("/api/admin/sales-rate-types"),
                    fetch("/api/admin/locations?type=DESTINATION"),
                ])
                if (cRes.ok) setContainers(await cRes.json())
                if (sRes.ok) setSalesRateTypes(await sRes.json())
                if (lRes.ok) setDestLocations(await lRes.json())
            } catch { /* silently fail */ }
        }, 0)
        return () => clearTimeout(timeout)
    }, [])

    const [formData, setFormData] = useState({
        destinationId: "",
        containerId: "40ft-reefer-hc",
        salesRateTypeId: "srs",
        currency: "GBP",
        exchangeRateToZAR: "22.30",
        effectiveFrom: new Date().toISOString().split("T")[0],
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        const selectedLoc = destLocations.find(l => l.id === formData.destinationId)
        if (!selectedLoc) {
            setLoading(false)
            return
        }

        const params = new URLSearchParams({
            destinationId: selectedLoc.code.toLowerCase().slice(2),
            destinationName: selectedLoc.name,
            destinationPortCode: selectedLoc.code,
            containerId: formData.containerId,
            salesRateTypeId: formData.salesRateTypeId,
            currency: formData.currency,
            exchangeRateToZAR: formData.exchangeRateToZAR,
            effectiveFrom: formData.effectiveFrom,
        })

        router.push(`/admin/finance/destination-charges/new?${params.toString()}`)
        setOpen(false)
        setLoading(false)
        onSuccess?.()
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-brand-blue hover:bg-blue-700">
                    <Plus className="mr-2 h-4 w-4" />
                    New DAP Card
                </Button>
            </DialogTrigger>
            <DialogContent
                className="sm:max-w-[450px]"
                onInteractOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
            >
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Create New DAP Rate Card</DialogTitle>
                        <DialogDescription>
                            Set the basic details for the new destination charge rate card.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Destination</Label>
                            <Select
                                value={formData.destinationId}
                                onValueChange={(val) => setFormData({ ...formData, destinationId: val })}
                            >
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select destination" />
                                </SelectTrigger>
                                <SelectContent>
                                    {destLocations.map(loc => (
                                        <SelectItem key={loc.id} value={loc.id}>
                                            {loc.name} ({loc.code})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Container</Label>
                            <Select
                                value={formData.containerId}
                                onValueChange={(val) => setFormData({ ...formData, containerId: val })}
                            >
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select container type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {containers.filter(c => c.active).map((c) => (
                                        <SelectItem key={c.id} value={c.id}>
                                            {c.displayName}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right whitespace-nowrap">Rate Type</Label>
                            <Select
                                value={formData.salesRateTypeId}
                                onValueChange={(val) => setFormData({ ...formData, salesRateTypeId: val })}
                            >
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select rate type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {salesRateTypes.filter(t => t.active).map((type) => (
                                        <SelectItem key={type.id} value={type.id}>
                                            {type.name} ({type.code})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Currency</Label>
                            <Select
                                value={formData.currency}
                                onValueChange={(val) => setFormData({ ...formData, currency: val })}
                            >
                                <SelectTrigger className="col-span-3">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="GBP">GBP (£)</SelectItem>
                                    <SelectItem value="EUR">EUR (€)</SelectItem>
                                    <SelectItem value="USD">USD ($)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right whitespace-nowrap">ROE to ZAR</Label>
                            <Input
                                type="number"
                                step="0.01"
                                value={formData.exchangeRateToZAR}
                                onChange={(e) => setFormData({ ...formData, exchangeRateToZAR: e.target.value })}
                                className="col-span-3"
                            />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Effective</Label>
                            <Input
                                type="date"
                                value={formData.effectiveFrom}
                                onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
                                className="col-span-3"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" className="bg-brand-blue hover:bg-blue-700" disabled={loading || !formData.destinationId}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create & Continue
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
