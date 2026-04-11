"use client"

import { FleetScheduler } from "@/components/admin/fleet-scheduler"
import { ContainerTypesManager } from "@/components/admin/container-types-manager"
import { Ship, Container } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function FleetPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center">
                    <Ship className="h-6 w-6 text-brand-blue" />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Fleet & Containers</h1>
                    <p className="text-slate-500">Manage containers, container types, allocations, and MetaShip bookings.</p>
                </div>
            </div>

            <Tabs defaultValue="containers" className="w-full">
                <TabsList className="bg-slate-950 border border-slate-800">
                    <TabsTrigger value="containers" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400 text-xs font-bold uppercase tracking-wider">
                        <Ship className="h-3.5 w-3.5 mr-1.5" /> Containers
                    </TabsTrigger>
                    <TabsTrigger value="types" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400 text-xs font-bold uppercase tracking-wider">
                        <Container className="h-3.5 w-3.5 mr-1.5" /> Container Types
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="containers" className="mt-4">
                    <FleetScheduler />
                </TabsContent>

                <TabsContent value="types" className="mt-4">
                    <ContainerTypesManager />
                </TabsContent>
            </Tabs>
        </div>
    )
}
