import { db } from "@/lib/db";
import { containers, trackingEvents, containerStatusEnum } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { createHash } from "crypto";
import type { MetaShipTrackingEvent } from "@/lib/metaship";

export interface TrackingSyncInput {
    containerId: string;
    containerNo?: string | null;
    events: MetaShipTrackingEvent[];
    position?: { lat: number; lng: number; type?: string | null; at?: string | null } | null;
}

export interface TrackingSyncResult {
    inserted: number;
    skipped: number;
    statusChanged: (typeof containerStatusEnum.enumValues)[number] | null;
    newContainerNo: string | null;
}

/**
 * Idempotent upsert of MetaShip tracking events for a container.
 * Dedupes by metashipEventId when present, otherwise by hash(date+typeCode+location).
 * Also updates container denorm fields (last event, last position) and auto-promotes
 * container.status when a qualifying vessel event lands.
 */
export async function syncTrackingEvents(input: TrackingSyncInput): Promise<TrackingSyncResult> {
    const { containerId, events } = input;

    // Load existing event IDs + hashes for dedupe
    const existing = await db
        .select({
            metashipEventId: trackingEvents.metashipEventId,
            eventDate: trackingEvents.eventDate,
            typeCode: trackingEvents.typeCode,
            location: trackingEvents.location,
        })
        .from(trackingEvents)
        .where(eq(trackingEvents.containerId, containerId));

    const seenMetashipIds = new Set(existing.map(e => e.metashipEventId).filter(Boolean) as string[]);
    const seenHashes = new Set(existing.map(e => hashEvent(e.eventDate.toISOString(), e.typeCode, e.location)));

    let inserted = 0;
    let skipped = 0;
    const now = new Date();
    let latestEvent: MetaShipTrackingEvent | null = null;
    let sawVesselDeparture = false;
    let sawFinalDelivery = false;

    for (const ev of events) {
        const metashipId = ev.id != null ? String(ev.id) : null;
        const eventDateIso = new Date(ev.date).toISOString();
        const hash = hashEvent(eventDateIso, ev.typeCode, ev.location ?? null);

        if (metashipId && seenMetashipIds.has(metashipId)) { skipped++; continue; }
        if (!metashipId && seenHashes.has(hash)) { skipped++; continue; }

        await db.insert(trackingEvents).values({
            id: `TRK-${nanoid(10)}`,
            containerId,
            metashipEventId: metashipId,
            eventDate: new Date(ev.date),
            eventType: mapEventType(ev.eventType),
            typeCode: ev.typeCode ?? null,
            type: ev.type ?? null,
            description: ev.description,
            location: ev.location ?? null,
            facilityCode: ev.facilityCode ?? null,
            lat: ev.lat ?? null,
            lng: ev.lng ?? null,
            modeOfTransport: (ev.modeOfTransport ?? null) as "TRUCK" | "VESSEL" | "RAIL" | "BARGE" | null,
            isActual: ev.isActual ?? true,
            isEmpty: ev.isEmpty ?? null,
            vesselName: ev.vesselName ?? null,
            vesselIMO: ev.vesselIMO ?? null,
            voyage: ev.voyage ?? null,
            registrationNo: ev.registrationNo ?? null,
            payload: ev as unknown as Record<string, unknown>,
        });

        inserted++;
        if (metashipId) seenMetashipIds.add(metashipId);
        seenHashes.add(hash);

        // Track the most recent event across this batch
        if (!latestEvent || new Date(ev.date) > new Date(latestEvent.date)) latestEvent = ev;

        // Status-promotion signals
        const typeCode = (ev.typeCode ?? "").toUpperCase();
        const type = (ev.type ?? "").toUpperCase();
        if ((typeCode === "DEPA" || type === "VESSEL_DEPARTURE") && ev.modeOfTransport === "VESSEL") {
            sawVesselDeparture = true;
        }
        // Empty gate-out at destination after vessel arrival = delivered
        if ((typeCode === "GTOT" || type === "GATE_OUT") && ev.modeOfTransport === "TRUCK" && ev.isEmpty === false) {
            sawFinalDelivery = true;
        }
    }

    // After inserts, check whether we also need to look beyond this batch for latest event (e.g. webhook pushed an old event)
    const [mostRecent] = await db
        .select()
        .from(trackingEvents)
        .where(eq(trackingEvents.containerId, containerId))
        .orderBy(desc(trackingEvents.eventDate))
        .limit(1);

    // Current container state
    const [current] = await db
        .select({ status: containers.status, metashipContainerNo: containers.metashipContainerNo })
        .from(containers)
        .where(eq(containers.id, containerId))
        .limit(1);

    // Decide new status (only promote forward, never backward)
    let nextStatus: typeof current.status | null = null;
    if (current) {
        if (sawFinalDelivery && current.status !== "DELIVERED") nextStatus = "DELIVERED";
        else if (sawVesselDeparture && (current.status === "OPEN" || current.status === "THRESHOLD_REACHED" || current.status === "BOOKED")) nextStatus = "SAILING";
    }

    const newContainerNo = input.containerNo && !current?.metashipContainerNo ? input.containerNo : null;

    // Denorm container fields
    const updates: Partial<typeof containers.$inferInsert> = { updatedAt: now };
    if (mostRecent) {
        updates.lastEventAt = mostRecent.eventDate;
        updates.lastEventType = mostRecent.type ?? mostRecent.typeCode ?? mostRecent.eventType;
        updates.lastEventDescription = mostRecent.description;
    }
    if (input.position) {
        updates.lastPositionLat = input.position.lat;
        updates.lastPositionLng = input.position.lng;
        if (input.position.type) updates.lastPositionType = input.position.type;
        updates.lastPositionAt = input.position.at ? new Date(input.position.at) : now;
    } else if (mostRecent && mostRecent.lat != null && mostRecent.lng != null) {
        // Fall back to the latest event's coordinates
        updates.lastPositionLat = mostRecent.lat;
        updates.lastPositionLng = mostRecent.lng;
        updates.lastPositionType = mostRecent.modeOfTransport === "VESSEL" ? "VESSEL" : mostRecent.modeOfTransport === "TRUCK" ? "TRUCK" : "AIS";
        updates.lastPositionAt = mostRecent.eventDate;
    }
    if (newContainerNo) updates.metashipContainerNo = newContainerNo;
    if (nextStatus) updates.status = nextStatus;

    if (Object.keys(updates).length > 1) {
        await db.update(containers).set(updates).where(eq(containers.id, containerId));
    }

    return {
        inserted,
        skipped,
        statusChanged: nextStatus,
        newContainerNo,
    };
}

function hashEvent(dateIso: string, typeCode: string | null, location: string | null): string {
    return createHash("sha1").update(`${dateIso}|${typeCode ?? ""}|${location ?? ""}`).digest("hex");
}

function mapEventType(raw: string): "EQUIPMENT" | "TRANSPORT" | "AIS" | "HOLD" | "OTHER" {
    const v = (raw ?? "").toUpperCase();
    if (v === "EQUIPMENT" || v === "TRANSPORT" || v === "AIS" || v === "HOLD") return v;
    return "OTHER";
}

/**
 * Look up a container from webhook payload fields.
 * Tries (in order): subscriptionId, containerNo, bookingNo (via metashipReference).
 */
export async function findContainerForWebhook(fields: {
    subscriptionId?: string | null;
    containerNo?: string | null;
    bookingNo?: string | null;
}): Promise<{ id: string; metashipContainerNo: string | null } | null> {
    if (fields.subscriptionId) {
        const [row] = await db
            .select({ id: containers.id, metashipContainerNo: containers.metashipContainerNo })
            .from(containers)
            .where(eq(containers.metashipTrackingSubscriptionId, fields.subscriptionId))
            .limit(1);
        if (row) return row;
    }
    if (fields.containerNo) {
        const [row] = await db
            .select({ id: containers.id, metashipContainerNo: containers.metashipContainerNo })
            .from(containers)
            .where(eq(containers.metashipContainerNo, fields.containerNo))
            .limit(1);
        if (row) return row;
    }
    if (fields.bookingNo) {
        const [row] = await db
            .select({ id: containers.id, metashipContainerNo: containers.metashipContainerNo })
            .from(containers)
            .where(
                and(
                    eq(containers.metashipReference, fields.bookingNo),
                ),
            )
            .limit(1);
        if (row) return row;
    }
    return null;
}
