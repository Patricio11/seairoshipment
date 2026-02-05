import { getDestinationChargeById } from "@/lib/mock-data/destination-charges"
import { DestinationChargeEditor } from "@/components/admin/finance/destination-charge-editor"
import { notFound } from "next/navigation"

export default async function EditDestinationChargePage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const destinationCharge = getDestinationChargeById(id)

    if (!destinationCharge) {
        notFound()
    }

    return (
        <div className="p-6">
            <DestinationChargeEditor initialData={destinationCharge} />
        </div>
    )
}
