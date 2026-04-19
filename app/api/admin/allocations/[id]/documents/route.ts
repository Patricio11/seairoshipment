import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { documents, palletAllocations } from "@/lib/db/schema";
import { eq, and, or } from "drizzle-orm";

/**
 * Returns all documents relevant to an allocation, grouped by source:
 *   - finalisedFromMetaShip: METASHIP_CLIENT docs matched to this allocation
 *   - containerDocuments:     METASHIP_SHARED docs attached to the container
 *                              (all clients on the container see these)
 *   - clientUploads:          CLIENT_UPLOAD drafts (hidden by default on UI)
 */
export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const { id } = await params;

        // Look up the allocation's container
        const [alloc] = await db
            .select({ containerId: palletAllocations.containerId })
            .from(palletAllocations)
            .where(eq(palletAllocations.id, id))
            .limit(1);

        const containerId = alloc?.containerId || null;

        const rows = await db
            .select()
            .from(documents)
            .where(
                or(
                    eq(documents.allocationId, id),
                    containerId ? and(
                        eq(documents.containerId, containerId),
                        eq(documents.source, "METASHIP_SHARED"),
                    ) : undefined,
                )
            );

        const clientUploads = rows.filter(d => d.source === "CLIENT_UPLOAD");
        const finalisedFromMetaShip = rows.filter(d => d.source === "METASHIP_CLIENT" && d.allocationId === id);
        const containerDocuments = rows.filter(d => d.source === "METASHIP_SHARED");

        // Flat array (for back-compat with existing callers) + grouped
        return NextResponse.json({
            flat: rows,
            clientUploads,
            finalisedFromMetaShip,
            containerDocuments,
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to fetch documents";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
