"use client"

import { useSearchParams } from "next/navigation"
import { DestinationChargeEditor } from "@/components/admin/finance/destination-charge-editor"
import { Suspense } from "react"
import type { DestinationCharge } from "@/lib/types/finance"

function NewDestinationChargeContent() {
    const searchParams = useSearchParams()

    const destinationId = searchParams.get("destinationId") || ""
    const destinationName = searchParams.get("destinationName") || ""
    const destinationPortCode = searchParams.get("destinationPortCode") || ""
    const containerId = searchParams.get("containerId") || "40ft-reefer-hc"
    const salesRateTypeId = searchParams.get("salesRateTypeId") || "srs"
    const currency = searchParams.get("currency") || "GBP"
    const exchangeRateToZAR = searchParams.get("exchangeRateToZAR") || "22.30"
    const effectiveFrom = searchParams.get("effectiveFrom") || new Date().toISOString().split("T")[0]

    const initialData: DestinationCharge = {
        id: "new",
        salesRateTypeId,
        salesRateTypeName: salesRateTypeId.toUpperCase(),
        destinationId,
        destinationName,
        destinationPortCode,
        containerId,
        containerDisplayName: "",
        currency: currency as DestinationCharge["currency"],
        exchangeRateToZAR: parseFloat(exchangeRateToZAR),
        effectiveFrom,
        effectiveTo: null,
        items: [],
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    }

    return <DestinationChargeEditor initialData={initialData} />
}

export default function NewDestinationChargePage() {
    return (
        <div className="p-6">
            <Suspense fallback={<div className="text-slate-500">Loading...</div>}>
                <NewDestinationChargeContent />
            </Suspense>
        </div>
    )
}
