import { getOriginChargeById } from "@/lib/mock-data/origin-charges"
import { OriginChargeEditor } from "@/components/admin/finance/origin-charge-editor"
import { notFound } from "next/navigation"

export default async function OriginChargeDetailPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const originCharge = getOriginChargeById(id)

    if (!originCharge) {
        notFound()
    }

    return (
        <div className="p-6">
            <OriginChargeEditor initialData={originCharge} />
        </div>
    )
}
