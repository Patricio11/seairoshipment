import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { findContainerForWebhook, syncTrackingEvents } from "@/lib/tracking/sync";
import type { MetaShipTrackingEvent } from "@/lib/metaship";

/**
 * MetaShip tracking webhook.
 * Receives events pushed by MetaShip for every subscribed container.
 * Verified via HMAC-SHA256 of the raw request body with METASHIP_WEBHOOK_SECRET.
 *
 * Expected envelope shape (normalised from a few common formats):
 *   { containerNo?, bookingNo?, billOfLadingNo?, subscriptionId?, events[]?, event?, position? }
 */
export async function POST(req: NextRequest) {
    const secret = process.env.METASHIP_WEBHOOK_SECRET;
    if (!secret) {
        return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
    }

    const rawBody = await req.text();

    // Signature verification — accept either header name MetaShip happens to use.
    const signature = req.headers.get("x-metaship-signature") || req.headers.get("x-signature");
    if (!signature) {
        return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }
    if (!verifySignature(rawBody, signature, secret)) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    let body: WebhookBody;
    try {
        body = JSON.parse(rawBody) as WebhookBody;
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    // Normalise events (single or batch)
    const events: MetaShipTrackingEvent[] = Array.isArray(body.events)
        ? body.events
        : body.event ? [body.event] : [];

    if (events.length === 0) {
        return NextResponse.json({ received: 0, note: "No events in payload" });
    }

    const container = await findContainerForWebhook({
        subscriptionId: body.subscriptionId ?? null,
        containerNo: body.containerNo ?? null,
        bookingNo: body.bookingNo ?? null,
    });

    if (!container) {
        // Respond 200 so MetaShip doesn't retry forever; log the miss
        console.warn("[metaship webhook] no container match", { containerNo: body.containerNo, subscriptionId: body.subscriptionId, bookingNo: body.bookingNo });
        return NextResponse.json({ received: 0, note: "No matching container" });
    }

    const position = body.position && typeof body.position.lat === "number" && typeof body.position.lng === "number"
        ? { lat: body.position.lat, lng: body.position.lng, type: body.position.type ?? null, at: body.position.at ?? null }
        : null;

    const result = await syncTrackingEvents({
        containerId: container.id,
        containerNo: body.containerNo ?? null,
        events,
        position,
    });

    return NextResponse.json({
        received: events.length,
        ...result,
    });
}

interface WebhookBody {
    containerNo?: string;
    bookingNo?: string;
    billOfLadingNo?: string;
    subscriptionId?: string;
    events?: MetaShipTrackingEvent[];
    event?: MetaShipTrackingEvent;
    position?: { lat: number; lng: number; type?: string; at?: string };
}

function verifySignature(rawBody: string, signature: string, secret: string): boolean {
    // MetaShip's exact scheme is TBD — accept either a plain hex HMAC or a prefixed form like "sha256=..."
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    const provided = signature.startsWith("sha256=") ? signature.slice(7) : signature;
    if (provided.length !== expected.length) return false;
    try {
        return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(provided, "hex"));
    } catch {
        return false;
    }
}
