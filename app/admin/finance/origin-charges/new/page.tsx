import { OriginChargeEditor } from "@/components/admin/finance/origin-charge-editor"
import { db } from "@/lib/db"
import { containerTypes } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import type { OriginChargeItem } from "@/lib/types/finance"

export default async function NewOriginChargePage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const params = await searchParams
    const originId = (params.originId as string) || "cpt"
    const originName = (params.originName as string) || "Cape Town"
    const country = (params.country as string) || "South Africa"
    const containerId = (params.containerId as string) || "40ft-reefer-hc"
    const salesRateTypeId = (params.salesRateTypeId as string) || "srs"
    const effectiveFrom = (params.effectiveFrom as string) || new Date().toISOString().split("T")[0]

    const [container] = await db
        .select({ displayName: containerTypes.displayName })
        .from(containerTypes)
        .where(eq(containerTypes.id, containerId))
        .limit(1)

    const initialData = {
        id: "new",
        salesRateTypeId,
        originId,
        originName,
        country,
        containerId,
        containerDisplayName: container?.displayName || "40ft HC Reefer",
        effectiveFrom,
        effectiveTo: null,
        currency: "ZAR" as const,
        items: [] as OriginChargeItem[],
        active: true,
    }

    return (
        <div className="p-6">
            <OriginChargeEditor initialData={initialData} />
        </div>
    )
}
