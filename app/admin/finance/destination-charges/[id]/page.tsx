import { DestinationChargeEditor } from "@/components/admin/finance/destination-charge-editor"
import { notFound } from "next/navigation"
import { getSession } from "@/lib/auth/server"
import { db } from "@/lib/db"
import { destinationCharges, destinationChargeItems, containerTypes, salesRateTypes } from "@/lib/db/schema"
import { eq, asc } from "drizzle-orm"

export default async function EditDestinationChargePage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const session = await getSession()
    if (!session) notFound()

    const { id } = await params

    const [header] = await db
        .select({
            id: destinationCharges.id,
            salesRateTypeId: destinationCharges.salesRateTypeId,
            destinationId: destinationCharges.destinationId,
            destinationName: destinationCharges.destinationName,
            destinationPortCode: destinationCharges.destinationPortCode,
            containerId: destinationCharges.containerId,
            cargoType: destinationCharges.cargoType,
            currency: destinationCharges.currency,
            exchangeRateToZAR: destinationCharges.exchangeRateToZAR,
            buyExchangeRateToZAR: destinationCharges.buyExchangeRateToZAR,
            effectiveFrom: destinationCharges.effectiveFrom,
            effectiveTo: destinationCharges.effectiveTo,
            active: destinationCharges.active,
            containerDisplayName: containerTypes.displayName,
            containerVolumeCBM: containerTypes.volumeCBM,
            containerMaxPallets: containerTypes.maxPallets,
            salesRateTypeName: salesRateTypes.name,
        })
        .from(destinationCharges)
        .leftJoin(containerTypes, eq(destinationCharges.containerId, containerTypes.id))
        .leftJoin(salesRateTypes, eq(destinationCharges.salesRateTypeId, salesRateTypes.id))
        .where(eq(destinationCharges.id, id))
        .limit(1)

    if (!header) {
        notFound()
    }

    const items = await db
        .select()
        .from(destinationChargeItems)
        .where(eq(destinationChargeItems.destinationChargeId, id))
        .orderBy(asc(destinationChargeItems.sortOrder))

    const initialData = {
        id: header.id,
        salesRateTypeId: header.salesRateTypeId || "srs",
        salesRateTypeName: header.salesRateTypeName || "SRS",
        destinationId: header.destinationId,
        destinationName: header.destinationName,
        destinationPortCode: header.destinationPortCode,
        containerId: header.containerId,
        containerDisplayName: header.containerDisplayName || header.containerId,
        containerVolumeCBM: header.containerVolumeCBM ? Number(header.containerVolumeCBM) : null,
        containerMaxPallets: header.containerMaxPallets ?? null,
        cargoType: (header.cargoType || "PALLET") as "PALLET" | "CUBE",
        currency: header.currency as "GBP" | "EUR" | "USD",
        exchangeRateToZAR: Number(header.exchangeRateToZAR),
        buyExchangeRateToZAR: header.buyExchangeRateToZAR ? Number(header.buyExchangeRateToZAR) : null,
        effectiveFrom: header.effectiveFrom,
        effectiveTo: header.effectiveTo,
        active: header.active,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        items: items.map(item => ({
            id: item.id,
            destinationChargeId: item.destinationChargeId,
            chargeCode: item.chargeCode || "",
            chargeName: item.chargeName,
            chargeType: (item.chargeType || "PER_CONTAINER") as "PER_CONTAINER" | "FIXED" | "PER_CBM" | "PER_PALLET",
            amountLocal: Number(item.amountLocal),
            amountZAR: Number(item.amountZAR),
            // Buy-side ZAR — saved by the POST/PUT path but was being
            // dropped here on load, so the per-item buy cell read 0.00
            // after every save.
            buyAmountZAR: item.buyAmountZAR ? Number(item.buyAmountZAR) : null,
            sortOrder: item.sortOrder || 0,
            notes: item.notes,
            createdAt: item.createdAt.toISOString(),
            updatedAt: item.updatedAt.toISOString(),
        })),
    }

    return (
        <div className="p-6">
            <DestinationChargeEditor initialData={initialData} />
        </div>
    )
}
