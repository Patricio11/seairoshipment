import { OriginChargeEditor } from "@/components/admin/finance/origin-charge-editor"
import { notFound } from "next/navigation"
import { getSession } from "@/lib/auth/server"
import { db } from "@/lib/db"
import { originCharges, originChargeItems, containerTypes, salesRateTypes } from "@/lib/db/schema"
import { eq, asc } from "drizzle-orm"
import type { ChargeCategory } from "@/lib/types/finance"

export default async function OriginChargeDetailPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const session = await getSession()
    if (!session) notFound()

    const { id } = await params

    const [header] = await db
        .select({
            id: originCharges.id,
            salesRateTypeId: originCharges.salesRateTypeId,
            originId: originCharges.originId,
            originName: originCharges.originName,
            containerId: originCharges.containerId,
            effectiveFrom: originCharges.effectiveFrom,
            effectiveTo: originCharges.effectiveTo,
            currency: originCharges.currency,
            active: originCharges.active,
            containerDisplayName: containerTypes.displayName,
            salesRateTypeName: salesRateTypes.name,
        })
        .from(originCharges)
        .leftJoin(containerTypes, eq(originCharges.containerId, containerTypes.id))
        .leftJoin(salesRateTypes, eq(originCharges.salesRateTypeId, salesRateTypes.id))
        .where(eq(originCharges.id, id))
        .limit(1)

    if (!header) {
        notFound()
    }

    const items = await db
        .select()
        .from(originChargeItems)
        .where(eq(originChargeItems.originChargeId, id))
        .orderBy(asc(originChargeItems.sortOrder))

    const initialData = {
        id: header.id,
        salesRateTypeId: header.salesRateTypeId || "srs",
        originId: header.originId,
        originName: header.originName,
        containerId: header.containerId,
        containerDisplayName: header.containerDisplayName || header.containerId,
        effectiveFrom: header.effectiveFrom,
        effectiveTo: header.effectiveTo,
        currency: "ZAR" as const,
        active: header.active,
        items: items.map(item => ({
            id: item.id,
            originChargeId: item.originChargeId,
            chargeCode: item.chargeCode || "",
            chargeName: item.chargeName,
            chargeType: item.chargeType as "PER_PALLET" | "PER_CONTAINER" | "FIXED",
            category: (item.category || "OTHER") as ChargeCategory,
            unitCost: item.unitCost ? Number(item.unitCost) : null,
            containerCost: item.containerCost ? Number(item.containerCost) : null,
            mandatory: item.mandatory,
            sortOrder: item.sortOrder || 0,
            notes: item.notes,
            createdAt: item.createdAt.toISOString(),
            updatedAt: item.updatedAt.toISOString(),
        })),
    }

    return (
        <div className="p-6">
            <OriginChargeEditor initialData={initialData} />
        </div>
    )
}
