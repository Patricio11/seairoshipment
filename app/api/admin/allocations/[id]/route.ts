import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { palletAllocations, containers, documents, invoices } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Hard-delete an allocation (admin only). Cascades:
 *
 *   1. Refuses if any linked invoice is PAID - admin should never accidentally
 *      drop a paid booking. They can void the invoice manually first if that
 *      really is the intent.
 *   2. Deletes linked documents rows (storage objects in Supabase are left
 *      orphaned for now - acceptable for v1; a cleanup job can sweep later).
 *   3. Deletes linked invoices rows.
 *   4. Decrements the container's totalPallets or totalCBM depending on the
 *      allocation's cargoType. If totalPallets drops back below 15 and the
 *      container's status is THRESHOLD_REACHED, reverts it to OPEN so the
 *      container becomes deletable / re-bookable again.
 *   5. Deletes the allocation row itself.
 *
 * For soft delete (cancel without removing), use POST /[id]/reject instead.
 */
export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await requireAdmin();
        if (auth.error) return auth.error;

        const { id } = await params;

        const [allocation] = await db
            .select()
            .from(palletAllocations)
            .where(eq(palletAllocations.id, id))
            .limit(1);

        if (!allocation) {
            return NextResponse.json({ error: "Allocation not found" }, { status: 404 });
        }

        // Refuse if any linked invoice has been paid
        const linkedInvoices = await db
            .select()
            .from(invoices)
            .where(eq(invoices.allocationId, id));

        const hasPaidInvoice = linkedInvoices.some(inv => inv.status === "PAID");
        if (hasPaidInvoice) {
            return NextResponse.json(
                { error: "Cannot delete a booking that has a paid invoice. Void the invoice first." },
                { status: 400 }
            );
        }

        // Cascade: documents → invoices → allocation
        await db.delete(documents).where(eq(documents.allocationId, id));
        await db.delete(invoices).where(eq(invoices.allocationId, id));

        // Decrement container counter for this allocation's cargo type - but
        // ONLY if the allocation was CONFIRMED. The container.totalPallets and
        // totalCBM counters are only ever incremented on approve, so a PENDING
        // allocation never contributed to them; subtracting on delete in that
        // case would put the counter out of sync (and shrink the apparent
        // remaining capacity the next time someone tries to book).
        if (allocation.status === "CONFIRMED") {
            const [container] = await db
                .select()
                .from(containers)
                .where(eq(containers.id, allocation.containerId))
                .limit(1);

            if (container) {
                const updates: Record<string, unknown> = { updatedAt: new Date() };

                if (allocation.cargoType === "CUBE") {
                    const currentCBM = Number(container.totalCBM ?? 0);
                    const allocCBM = Number(allocation.cbmVolume ?? 0);
                    const newCBM = Math.max(0, currentCBM - allocCBM);
                    updates.totalCBM = newCBM.toFixed(4);
                } else {
                    const newTotal = Math.max(0, container.totalPallets - (allocation.palletCount || 0));
                    updates.totalPallets = newTotal;
                    // Revert THRESHOLD_REACHED back to OPEN if we drop below 15
                    // so the container becomes deletable / re-bookable again.
                    if (container.status === "THRESHOLD_REACHED" && newTotal < 15) {
                        updates.status = "OPEN";
                    }
                }

                await db
                    .update(containers)
                    .set(updates)
                    .where(eq(containers.id, container.id));
            }
        }

        // Finally drop the allocation row
        await db.delete(palletAllocations).where(eq(palletAllocations.id, id));

        return NextResponse.json({ success: true });
    } catch (err: unknown) {
        console.error("[admin allocation delete] error:", err);
        const message = err instanceof Error ? err.message : "Failed to delete allocation";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
