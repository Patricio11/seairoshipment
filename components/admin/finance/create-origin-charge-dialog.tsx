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

export function CreateOriginChargeDialog() {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [containers, setContainers] = useState<ContainerTypeData[]>([])
    const [salesRateTypes, setSalesRateTypes] = useState<SalesRateTypeData[]>([])
    const [originLocations, setOriginLocations] = useState<LocationData[]>([])

    useEffect(() => {
        const timeout = setTimeout(async () => {
            try {
                const [cRes, sRes, lRes] = await Promise.all([
                    fetch("/api/admin/container-types"),
                    fetch("/api/admin/sales-rate-types"),
                    fetch("/api/admin/locations?type=ORIGIN"),
                ])
                if (cRes.ok) setContainers(await cRes.json())
                if (sRes.ok) setSalesRateTypes(await sRes.json())
                if (lRes.ok) setOriginLocations(await lRes.json())
            } catch { /* silently fail */ }
        }, 0)
        return () => clearTimeout(timeout)
    }, [])

    const [formData, setFormData] = useState({
        originId: "cpt",
        customOriginName: "",
        country: "South Africa",
        customCountryName: "",
        containerId: "40ft-reefer-hc",
        salesRateTypeId: "srs",
        effectiveFrom: new Date().toISOString().split("T")[0],
    })

    const isCustomOrigin = formData.originId === "other"
    const isCustomCountry = formData.country === "other"

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        const selectedLoc = originLocations.find(l => l.code.toLowerCase().slice(2) === formData.originId)

        // Build query params
        const params = new URLSearchParams({
            originId: formData.originId,
            originName: isCustomOrigin ? formData.customOriginName : (selectedLoc?.name || formData.originId),
            country: isCustomCountry ? formData.customCountryName : formData.country,
            containerId: formData.containerId,
            salesRateTypeId: formData.salesRateTypeId,
            effectiveFrom: formData.effectiveFrom,
        })

        // Navigate to /new with initial data in query params
        router.push(`/admin/finance/origin-charges/new?${params.toString()}`)

        // Close dialog
        setOpen(false)
        setLoading(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-brand-blue hover:bg-brand-blue/90">
                    <Plus className="mr-2 h-4 w-4" />
                    New Rate Card
                </Button>
            </DialogTrigger>
            <DialogContent
                className="sm:max-w-[450px]"
                onInteractOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
            >
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Create New Rate Card</DialogTitle>
                        <DialogDescription>
                            Set the basic details for the new origin charge rate card.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="origin" className="text-right">
                                Origin
                            </Label>
                            <Select
                                value={formData.originId}
                                onValueChange={(val) => setFormData({ ...formData, originId: val })}
                            >
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select origin" />
                                </SelectTrigger>
                                <SelectContent>
                                    {originLocations.map(loc => (
                                        <SelectItem key={loc.id} value={loc.code.toLowerCase().slice(2)}>
                                            {loc.name} ({loc.code.slice(2)})
                                        </SelectItem>
                                    ))}
                                    <SelectItem value="other" className="font-semibold text-brand-blue">
                                        Other (New Landside)
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {isCustomOrigin && (
                            <div className="grid grid-cols-4 items-center gap-4 animate-in fade-in slide-in-from-top-1">
                                <Label htmlFor="customOrigin" className="text-right text-xs text-slate-500 italic">
                                    Name
                                </Label>
                                <Input
                                    id="customOrigin"
                                    placeholder="e.g. Johannesburg City Deep"
                                    value={formData.customOriginName}
                                    onChange={(e) => setFormData({ ...formData, customOriginName: e.target.value })}
                                    className="col-span-3"
                                    autoFocus
                                    required
                                />
                            </div>
                        )}

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="country" className="text-right">
                                Country
                            </Label>
                            <Select
                                value={formData.country}
                                onValueChange={(val) => setFormData({ ...formData, country: val })}
                            >
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select country" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="South Africa">South Africa</SelectItem>
                                    <SelectItem value="Namibia">Namibia</SelectItem>
                                    <SelectItem value="Botswana">Botswana</SelectItem>
                                    <SelectItem value="other" className="font-semibold text-brand-blue">
                                        Other Country
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {isCustomCountry && (
                            <div className="grid grid-cols-4 items-center gap-4 animate-in fade-in slide-in-from-top-1">
                                <Label htmlFor="customCountry" className="text-right text-xs text-slate-500 italic">
                                    Country Name
                                </Label>
                                <Input
                                    id="customCountry"
                                    placeholder="Enter country name"
                                    value={formData.customCountryName}
                                    onChange={(e) => setFormData({ ...formData, customCountryName: e.target.value })}
                                    className="col-span-3"
                                    autoFocus
                                    required
                                />
                            </div>
                        )}

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="container" className="text-right">
                                Container
                            </Label>
                            <Select
                                value={formData.containerId}
                                onValueChange={(val) => setFormData({ ...formData, containerId: val })}
                            >
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select container type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {containers.filter(c => c.active).map((container) => (
                                        <SelectItem key={container.id} value={container.id}>
                                            {container.displayName}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="rateType" className="text-right whitespace-nowrap">
                                Rate Type
                            </Label>
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
                            <Label htmlFor="effectiveFrom" className="text-right">
                                Effective
                            </Label>
                            <Input
                                id="effectiveFrom"
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
                        <Button type="submit" className="bg-brand-blue hover:bg-brand-blue/90" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create & Continue
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
