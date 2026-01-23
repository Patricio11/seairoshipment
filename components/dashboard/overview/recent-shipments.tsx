"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { ArrowRight, MoreHorizontal } from "lucide-react"

const shipments = [
    {
        ref: "REF-2024-001",
        route: "CPT → LND",
        vessel: "MSC Orchestra",
        eta: "Nov 14, 2024",
        status: "Sailing",
        pallets: 20,
    },
    {
        ref: "REF-2024-003",
        route: "CPT → ASH",
        vessel: "Maersk Vallvik",
        eta: "Nov 18, 2024",
        status: "Booked",
        pallets: 12,
    },
    {
        ref: "REF-2024-008",
        route: "CPT → RTM",
        vessel: "Santa Rita",
        eta: "Nov 22, 2024",
        status: "Inspection",
        pallets: 18,
    },
    {
        ref: "REF-2024-012",
        route: "CPT → LND",
        vessel: "MSC Opera",
        eta: "Nov 29, 2024",
        status: "Pending Docs",
        pallets: 5,
    },
]

export function RecentShipments() {
    return (
        <Card className="col-span-1 md:col-span-2 lg:col-span-3 border-slate-200/50 dark:border-slate-800/50">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-lg font-medium">Recent Shipments</CardTitle>
                    <CardDescription>You have 14 active shipments in transit.</CardDescription>
                </div>
                <Button variant="outline" size="sm" className="hidden sm:flex">
                    View All
                    <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[100px]">Reference</TableHead>
                            <TableHead>Route</TableHead>
                            <TableHead className="hidden md:table-cell">Vessel</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="hidden md:table-cell">ETA</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {shipments.map((shipment) => (
                            <TableRow key={shipment.ref}>
                                <TableCell className="font-medium text-brand-blue">{shipment.ref}</TableCell>
                                <TableCell>{shipment.route}</TableCell>
                                <TableCell className="hidden md:table-cell text-muted-foreground">{shipment.vessel}</TableCell>
                                <TableCell>
                                    {shipment.status === "Sailing" && (
                                        <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-0 flex w-fit items-center gap-1">
                                            <span className="relative flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                            </span>
                                            Sailing
                                        </Badge>
                                    )}
                                    {shipment.status === "Booked" && (
                                        <Badge variant="outline" className="border-slate-300 text-slate-500">Booked</Badge>
                                    )}
                                    {shipment.status === "Inspection" && (
                                        <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-0">Inspection</Badge>
                                    )}
                                    {shipment.status === "Pending Docs" && (
                                        <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-200 border-0">Action Req</Badge>
                                    )}
                                </TableCell>
                                <TableCell className="hidden md:table-cell">{shipment.eta}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
