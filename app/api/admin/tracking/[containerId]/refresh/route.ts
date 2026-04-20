import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { containers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getTracking } from "@/lib/metaship";
import { syncTrackingEvents } from "@/lib/tracking/sync";

/**
 * Admin-triggered refresh. Pulls the current tracking snapshot from MetaShip
 * via GET /public/v2/tracking/{containerNo} and merges events into our DB.
 * Idempotent — repeats only insert new events.
 */
export async function POST(
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

        if (!container.metashipContainerNo) {
            return NextResponse.json(
                { error: "No MetaShip container number yet — tracking hasn't started. Wait for the first webhook event, or confirm the subscription was created." },
                { status: 400 },
            );
        }

        const snapshot = await getTracking(container.metashipContainerNo);

        const position = snapshot.position && Array.isArray(snapshot.position.coordinates)
            ? {
                lat: snapshot.position.coordinates[1],
                lng: snapshot.position.coordinates[0],
                type: snapshot.positionType ?? null,
                at: snapshot.positionLastUpdated ?? null,
            }
            : null;

        const result = await syncTrackingEvents({
            containerId: container.id,
            containerNo: snapshot.containerNo ?? null,
            events: snapshot.events ?? [],
            position,
        });

        return NextResponse.json({
            total: snapshot.events?.length ?? 0,
            ...result,
            metashipStatus: snapshot.status,
            holds: snapshot.importHolds?.holds?.length ?? 0,
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to refresh tracking";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
