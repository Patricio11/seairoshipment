import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { containers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { subscribeTracking, getTracking } from "@/lib/metaship";
import { syncTrackingEvents } from "@/lib/tracking/sync";

/**
 * Manual retry for tracking subscription when auto-subscribe failed at order
 * creation, or when admin wants to re-subscribe. Idempotent on the MetaShip
 * side — re-subscribing an already-subscribed container returns the existing
 * subscription per the API's "active subscription linked to your organisation"
 * contract.
 */
export async function POST(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id: containerId } = await params;
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const [container] = await db
            .select()
            .from(containers)
            .where(eq(containers.id, containerId))
            .limit(1);

        if (!container) {
            return NextResponse.json({ error: "Container not found" }, { status: 404 });
        }

        if (!container.metashipReference) {
            return NextResponse.json(
                { error: "Container has no MetaShip order yet — create the order first." },
                { status: 400 },
            );
        }

        const [originCode, destinationCode] = container.route.split("-");

        const subRes = await subscribeTracking({
            bookingNo: container.metashipReference,
            pol: originCode,
            pod: destinationCode,
            finalDestination: destinationCode,
            initialETD: container.etd?.toISOString(),
            initialETA: container.eta?.toISOString(),
            customerReference: container.id,
            ownerReference: container.metashipOrderNo ?? undefined,
        });

        const resolvedContainerNo = (subRes as unknown as { containerNo?: string }).containerNo || null;

        await db
            .update(containers)
            .set({
                metashipTrackingSubscriptionId: subRes.subscriptionId,
                metashipContainerNo: resolvedContainerNo ?? container.metashipContainerNo,
                trackingStatus: "SUBSCRIBED",
                updatedAt: new Date(),
            })
            .where(eq(containers.id, containerId));

        let seededEvents = 0;
        const containerNoForSnapshot = resolvedContainerNo || container.metashipContainerNo;
        if (containerNoForSnapshot) {
            try {
                const snapshot = await getTracking(containerNoForSnapshot);
                const position = snapshot.position && Array.isArray(snapshot.position.coordinates)
                    ? {
                        lat: snapshot.position.coordinates[1],
                        lng: snapshot.position.coordinates[0],
                        type: snapshot.positionType ?? null,
                        at: snapshot.positionLastUpdated ?? null,
                    }
                    : null;
                const sync = await syncTrackingEvents({
                    containerId,
                    containerNo: containerNoForSnapshot,
                    events: snapshot.events ?? [],
                    position,
                });
                seededEvents = sync.inserted;
            } catch (seedErr) {
                console.warn("[tracking] seed snapshot failed", seedErr);
            }
        }

        return NextResponse.json({
            subscribed: true,
            subscriptionId: subRes.subscriptionId,
            containerNo: resolvedContainerNo,
            seededEvents,
        });
    } catch (err: unknown) {
        try {
            await db.update(containers).set({ trackingStatus: "FAILED", updatedAt: new Date() }).where(eq(containers.id, containerId));
        } catch { /* ignore */ }
        const message = err instanceof Error ? err.message : "Failed to subscribe tracking";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
