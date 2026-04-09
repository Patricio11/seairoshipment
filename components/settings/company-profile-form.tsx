"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Save, Building, MapPin, Hash, Globe, Mail, Phone } from "lucide-react"

export function CompanyProfileForm() {
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        // Simulate API call
        setTimeout(() => setIsLoading(false), 1500)
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8 max-w-2xl"
        >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Organization Details</h2>
                    <p className="text-sm text-slate-500 mt-1">
                        These details will appear on your Invoices and Bills of Lading.
                    </p>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-blue-50 dark:bg-slate-800 flex items-center justify-center">
                    <Building className="h-6 w-6 text-brand-blue" />
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="companyName">Company Name</Label>
                        <div className="relative">
                            <Building className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <Input id="companyName" defaultValue="Acme Logistics Ltd" className="pl-10 h-11 bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900 transition-all font-medium" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="regNumber">Registration Number</Label>
                        <div className="relative">
                            <Hash className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <Input id="regNumber" defaultValue="2024/001234/07" className="pl-10 h-11 bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900 transition-all font-medium font-mono text-sm" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="vatNumber">VAT Number</Label>
                        <div className="relative">
                            <Hash className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <Input id="vatNumber" defaultValue="4900123456" className="pl-10 h-11 bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900 transition-all font-medium font-mono text-sm" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="website">Website</Label>
                        <div className="relative">
                            <Globe className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <Input id="website" defaultValue="https://acmelogistics.com" className="pl-10 h-11 bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900 transition-all font-medium" />
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="address">Registered Address</Label>
                    <div className="relative">
                        <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input id="address" defaultValue="12 Maritime Way, Foreshore, Cape Town, 8001" className="pl-10 h-11 bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900 transition-all font-medium" />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    <div className="space-y-2">
                        <Label htmlFor="contactEmail">Finance Contact Email</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <Input type="email" id="contactEmail" defaultValue="accounts@acmelogistics.com" className="pl-10 h-11 bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900 transition-all font-medium" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="contactPhone">Finance Contact Phone</Label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <Input type="tel" id="contactPhone" defaultValue="+27 21 555 1234" className="pl-10 h-11 bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900 transition-all font-medium" />
                        </div>
                    </div>
                </div>

                <div className="pt-6 flex justify-end">
                    <Button
                        disabled={isLoading}
                        className="bg-brand-blue hover:bg-brand-blue/90 text-white min-w-[140px] h-12 rounded-xl font-bold shadow-lg shadow-brand-blue/20 transition-all active:scale-95"
                    >
                        {isLoading ? (
                            <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                Save Changes
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </motion.div>
    )
}
