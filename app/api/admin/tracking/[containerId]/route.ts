import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { containers, trackingEvents } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

/**
 * Return the container's tracking snapshot from our DB (fast, no MetaShip call).
 * The admin Refresh button calls /refresh to re-sync from MetaShip.
 */
export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ containerId: string }> },
) {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const { containerId } = await params;

        const [container] = await db
            .select()
            .from(containers)
            .where(eq(containers.id, containerId))
            .limit(1);

        if (!container) {
            return NextResponse.json({ error: "Container not found" }, { status: 404 });
        }

        const events = await db
            .select()
            .from(trackingEvents)
            .where(eq(trackingEvents.containerId, containerId))
            .orderBy(asc(trackingEvents.eventDate));

        return NextResponse.json({
            container: {
                id: container.id,
                route: container.route,
                vessel: container.vessel,
                voyageNumber: container.voyageNumber,
                etd: container.etd,
                eta: container.eta,
                status: container.status,
                trackingStatus: container.trackingStatus,
                metashipOrderNo: container.metashipOrderNo,
                metashipContainerNo: container.metashipContainerNo,
                lastPositionLat: container.lastPositionLat,
                lastPositionLng: container.lastPositionLng,
                lastPositionType: container.lastPositionType,
                lastPositionAt: container.lastPositionAt,
                lastEventType: container.lastEventType,
                lastEventAt: container.lastEventAt,
                lastEventDescription: container.lastEventDescription,
            },
            events,
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load tracking";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
