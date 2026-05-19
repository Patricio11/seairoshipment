import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { containers, palletAllocations, documents, invoices } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { parseBulkIds, runBulkDelete } from "@/lib/bulk-delete";

/**
 * Bulk variant of /api/admin/containers/[id] DELETE.
 * Mirrors the cascade: find allocations → refuse if any has a PAID invoice →
 * delete docs + invoices + allocations + container-level docs + the container.
 */
export async function POST(req: NextRequest) {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const parsed = parseBulkIds(await req.json().catch(() => ({})));
    if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const result = await runBulkDelete(parsed.ids, async (id) => {
        const [existing] = await db.select().from(containers).where(eq(containers.id, id)).limit(1);
        if (!existing) return { ok: false, reason: "not found" };

        const allocs = await db.select({ id: palletAllocations.id })
            .from(palletAllocations)
            .where(eq(palletAllocations.containerId, id));
        const allocIds = allocs.map((a) => a.id);

        if (allocIds.length > 0) {
            const linkedInvoices = await db.select().from(invoices).where(inArray(invoices.allocationId, allocIds));
            if (linkedInvoices.some((inv) => inv.status === "PAID")) {
                return { ok: false, reason: "at least one booking has a paid invoice" };
            }
            await db.delete(documents).where(inArray(documents.allocationId, allocIds));
            await db.delete(invoices).where(inArray(invoices.allocationId, allocIds));
        }

        await db.delete(documents).where(eq(documents.containerId, id));
        await db.delete(palletAllocations).where(eq(palletAllocations.containerId, id));
        await db.delete(containers).where(eq(containers.id, id));
        return { ok: true };
    });

    return NextResponse.json(result);
}
