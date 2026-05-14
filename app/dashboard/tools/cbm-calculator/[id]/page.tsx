import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { cargoCalculations } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"
import { requireRole } from "@/lib/auth/server"
import { CalculationEditor } from "@/components/cbm/calculation-editor"
import type { CargoItem } from "@/lib/db/schema/pallet-allocations"

export const dynamic = "force-dynamic"

export default async function CBMCalculationDetailPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const session = await requireRole(["client"])
    const { id } = await params

    const [row] = await db
        .select()
        .from(cargoCalculations)
        .where(and(
            eq(cargoCalculations.id, id),
            eq(cargoCalculations.userId, session.user.id),
        ))
        .limit(1)

    if (!row) notFound()

    return (
        <CalculationEditor
            initial={{
                id: row.id,
                name: row.name,
                notes: row.notes,
                cargoItems: (row.cargoItems ?? []) as CargoItem[],
            }}
        />
    )
}
