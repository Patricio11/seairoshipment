import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { palletAllocations, containers, documents, invoices } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { parseBulkIds, runBulkDelete } from "@/lib/bulk-delete";

/**
 * Bulk variant of /api/admin/allocations/[id] DELETE. Same per-row rules:
 *  - Refuse if any linked invoice is PAID.
 *  - Cascade documents + invoices.
 *  - Decrement container counters only for CONFIRMED allocations.
 *  - Revert container status from THRESHOLD_REACHED → OPEN if the counter
 *    drops below 15 after the decrement.
 */
export async function POST(req: NextRequest) {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const parsed = parseBulkIds(await req.json().catch(() => ({})));
    if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const result = await runBulkDelete(parsed.ids, async (id) => {
        const [allocation] = await db.select().from(palletAllocations).where(eq(palletAllocations.id, id)).limit(1);
        if (!allocation) return { ok: false, reason: "not found" };

        const linkedInvoices = await db.select().from(invoices).where(eq(invoices.allocationId, id));
        if (linkedInvoices.some((inv) => inv.status === "PAID")) {
            return { ok: false, reason: "has a paid invoice" };
        }

        await db.delete(documents).where(eq(documents.allocationId, id));
        await db.delete(invoices).where(eq(invoices.allocationId, id));

        if (allocation.status === "CONFIRMED") {
            const [container] = await db.select().from(containers).where(eq(containers.id, allocation.containerId)).limit(1);
            if (container) {
                const updates: Record<string, unknown> = { updatedAt: new Date() };
                if (allocation.cargoType === "CUBE") {
                    const newCBM = Math.max(0, Number(container.totalCBM ?? 0) - Number(allocation.cbmVolume ?? 0));
                    updates.totalCBM = newCBM.toFixed(4);
                } else {
                    const newTotal = Math.max(0, container.totalPallets - (allocation.palletCount || 0));
                    updates.totalPallets = newTotal;
                    if (container.status === "THRESHOLD_REACHED" && newTotal < 15) updates.status = "OPEN";
                }
                await db.update(containers).set(updates).where(eq(containers.id, container.id));
            }
        }

        await db.delete(palletAllocations).where(eq(palletAllocations.id, id));
        return { ok: true };
    });

    return NextResponse.json(result);
}
