import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { containers, palletAllocations, trackingEvents } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

/**
 * Client-scoped tracking view for an allocation. Verifies ownership, then
 * returns the container's denorm fields + full event log so the bookings
 * page can render an inline tracking panel.
 */
export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ allocationId: string }> },
) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { allocationId } = await params;

        const [alloc] = await db
            .select()
            .from(palletAllocations)
            .where(eq(palletAllocations.id, allocationId))
            .limit(1);

        if (!alloc || alloc.userId !== session.user.id) {
            return NextResponse.json({ error: "Allocation not found" }, { status: 404 });
        }

        if (!alloc.containerId) {
            return NextResponse.json({ container: null, events: [] });
        }

        const [container] = await db
            .select()
            .from(containers)
            .where(eq(containers.id, alloc.containerId))
            .limit(1);

        if (!container) {
            return NextResponse.json({ container: null, events: [] });
        }

        const events = await db
            .select()
            .from(trackingEvents)
            .where(eq(trackingEvents.containerId, container.id))
            .orderBy(asc(trackingEvents.eventDate));

        return NextResponse.json({
            container: {
                route: container.route,
                vessel: container.vessel,
                voyageNumber: container.voyageNumber,
                etd: container.etd,
                eta: container.eta,
                status: container.status,
                trackingStatus: container.trackingStatus,
                metashipOrderNo: container.metashipOrderNo,
                lastPositionLat: container.lastPositionLat,
                lastPositionLng: container.lastPositionLng,
                lastPositionType: container.lastPositionType,
                lastPositionAt: container.lastPositionAt,
                lastEventDescription: container.lastEventDescription,
                lastEventAt: container.lastEventAt,
            },
            events,
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load tracking";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
