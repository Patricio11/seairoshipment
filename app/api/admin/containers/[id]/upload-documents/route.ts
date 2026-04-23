import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { containers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { uploadAllocationDocsToMetaShip } from "@/lib/metaship/upload-allocation-docs";

/**
 * One-shot retry: push every CLIENT_UPLOAD document on the container's confirmed
 * allocations to the existing MetaShip order. Used when the initial order
 * creation succeeded but docs failed or were empty, and we don't want to
 * recreate the order.
 */
export async function POST(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const { id: containerId } = await params;

        const [container] = await db
            .select({
                id: containers.id,
                metashipOrderNo: containers.metashipOrderNo,
                metashipOrderId: containers.metashipOrderId,
            })
            .from(containers)
            .where(eq(containers.id, containerId))
            .limit(1);

        if (!container) {
            return NextResponse.json({ error: "Container not found" }, { status: 404 });
        }
        if (!container.metashipOrderId) {
            return NextResponse.json(
                { error: "Container has no MetaShip order — create the order first before uploading documents." },
                { status: 400 },
            );
        }

        const summary = await uploadAllocationDocsToMetaShip({
            containerId,
            metashipOrderId: container.metashipOrderId,
        });

        return NextResponse.json({
            orderNo: container.metashipOrderNo,
            orderId: container.metashipOrderId,
            ...summary,
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to upload documents";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
