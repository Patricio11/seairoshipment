"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
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
import { Plus, Loader2, MapPin } from "lucide-react"
import { toast } from "sonner"

interface CreateLocationForm {
    name: string
    code: string
    country: string
    type: "ORIGIN" | "DESTINATION" | "HUB"
    coordinates: string
    active: boolean
}

export function CreateLocationDialog() {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    const [formData, setFormData] = useState<CreateLocationForm>({
        name: "",
        code: "",
        country: "South Africa",
        type: "ORIGIN",
        coordinates: "",
        active: true,
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000))

        toast.success("Location created successfully!", {
            description: `${formData.name} (${formData.code}) has been added to the system.`
        })

        setLoading(false)
        setOpen(false)
        setFormData({
            name: "",
            code: "",
            country: "South Africa",
            type: "ORIGIN",
            coordinates: "",
            active: true,
        })
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 shadow-lg shadow-emerald-900/20">
                    <Plus className="mr-2 h-4 w-4" /> Add Location
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-slate-900 border-slate-800 text-white">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black tracking-tight flex items-center gap-2">
                            <MapPin className="h-5 w-5 text-emerald-500" />
                            ADD NEW LOCATION
                        </DialogTitle>
                        <DialogDescription className="text-slate-400 font-mono text-xs">
                            REGISTER A NEW PORT OR LANDSIDE FACILITY
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-6 py-6">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                Location Name
                            </Label>
                            <Input
                                id="name"
                                placeholder="e.g. Cape Town Port"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="bg-slate-950 border-slate-800 text-white h-11"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="code" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                    UN/LOCODE
                                </Label>
                                <Input
                                    id="code"
                                    placeholder="e.g. ZACPT"
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                    className="bg-slate-950 border-slate-800 text-white font-mono"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="type" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                    Type
                                </Label>
                                <Select
                                    value={formData.type}
                                    onValueChange={(val: any) => setFormData({ ...formData, type: val })}
                                >
                                    <SelectTrigger className="bg-slate-950 border-slate-800 text-white capitalize h-11">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                        <SelectItem value="ORIGIN">Origin</SelectItem>
                                        <SelectItem value="DESTINATION">Destination</SelectItem>
                                        <SelectItem value="HUB">Transhipment Hub</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="country" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                Country
                            </Label>
                            <Input
                                id="country"
                                placeholder="e.g. South Africa"
                                value={formData.country}
                                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                className="bg-slate-950 border-slate-800 text-white"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="coordinates" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                GPS Coordinates (Optional)
                            </Label>
                            <Input
                                id="coordinates"
                                placeholder="33.9188° S, 18.4233° E"
                                value={formData.coordinates}
                                onChange={(e) => setFormData({ ...formData, coordinates: e.target.value })}
                                className="bg-slate-950 border-slate-800 text-white font-mono text-xs"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setOpen(false)}
                            className="text-slate-400 hover:text-white hover:bg-slate-800"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold min-w-[120px]"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "CREATE LOCATION"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
