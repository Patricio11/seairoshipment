import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { containerRequests, adminNotifications, clientNotifications } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { nanoid } from "nanoid";

/**
 * Client endpoint — create a request for a container that doesn't exist yet.
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const {
            originCode,
            destinationCode,
            salesRateTypeId,
            productId,
            temperature,
            sailingId,
            palletCount,
            desiredEtd,
            commodityNotes,
            notes,
        } = body;

        if (!originCode || !destinationCode || !palletCount || palletCount < 1) {
            return NextResponse.json(
                { error: "Route (origin + destination) and pallet count are required" },
                { status: 400 }
            );
        }

        const id = `CRQ-${nanoid(10)}`;

        await db.insert(containerRequests).values({
            id,
            userId: session.user.id,
            originCode: originCode.toUpperCase(),
            destinationCode: destinationCode.toUpperCase(),
            salesRateTypeId: salesRateTypeId || "srs",
            productId: productId || null,
            temperature: temperature || null,
            sailingId: sailingId || null,
            palletCount,
            desiredEtd: desiredEtd ? new Date(desiredEtd) : null,
            commodityNotes: commodityNotes || null,
            notes: notes || null,
            status: "PENDING",
        });

        // Admin notification
        await db.insert(adminNotifications).values({
            id: `NTF-${nanoid(10)}`,
            type: "BOOKING_CREATED",
            title: "New Container Request",
            message: `A client requested a container on route ${originCode}→${destinationCode} (${palletCount} pallet${palletCount === 1 ? "" : "s"}). No existing container matched — please review.`,
            containerId: null,
            isRead: false,
        });

        // Client confirmation
        await db.insert(clientNotifications).values({
            id: `CNT-${nanoid(10)}`,
            userId: session.user.id,
            type: "GENERAL",
            title: "Request Submitted",
            message: `Your container request (${id}) for ${originCode}→${destinationCode} has been submitted. You'll be notified when an admin responds.`,
            allocationId: null,
            isRead: false,
        });

        return NextResponse.json({ success: true, id }, { status: 201 });
    } catch (err) {
        console.error("Create container request error:", err);
        const message = err instanceof Error ? err.message : "Failed to submit request";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

/**
 * Client GET — list your own requests.
 */
export async function GET() {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const rows = await db
            .select()
            .from(containerRequests)
            .where(eq(containerRequests.userId, session.user.id))
            .orderBy(desc(containerRequests.createdAt));

        return NextResponse.json(rows);
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fetch requests";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
