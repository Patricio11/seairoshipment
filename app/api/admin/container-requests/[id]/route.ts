import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { containerRequests, clientNotifications } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

/**
 * Admin — update the status of a container request.
 * Body: { status: "ACKNOWLEDGED" | "FULFILLED" | "DECLINED", adminResponse?, fulfilledContainerId? }
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const { id } = await params;
        const body = await request.json();
        const { status, adminResponse, fulfilledContainerId } = body;

        const validStatuses = ["PENDING", "ACKNOWLEDGED", "FULFILLED", "DECLINED"];
        if (status && !validStatuses.includes(status)) {
            return NextResponse.json({ error: "Invalid status" }, { status: 400 });
        }

        const [existing] = await db
            .select()
            .from(containerRequests)
            .where(eq(containerRequests.id, id))
            .limit(1);

        if (!existing) {
            return NextResponse.json({ error: "Request not found" }, { status: 404 });
        }

        const updates: Record<string, unknown> = { updatedAt: new Date() };
        if (status !== undefined) updates.status = status;
        if (adminResponse !== undefined) updates.adminResponse = adminResponse;
        if (fulfilledContainerId !== undefined) updates.fulfilledContainerId = fulfilledContainerId;

        await db.update(containerRequests).set(updates).where(eq(containerRequests.id, id));

        // Notify the client on terminal state changes
        if (status === "FULFILLED" || status === "DECLINED" || status === "ACKNOWLEDGED") {
            const titleMap = {
                FULFILLED: "Your Container Request Was Fulfilled",
                DECLINED: "Your Container Request Was Declined",
                ACKNOWLEDGED: "Your Container Request Is Being Reviewed",
            };
            const messageMap = {
                FULFILLED: adminResponse
                    ? `Your request (${id}) was fulfilled — a container is now available. ${adminResponse}`
                    : `Your request (${id}) was fulfilled — a matching container is now available for booking.`,
                DECLINED: adminResponse
                    ? `Your request (${id}) was declined. Reason: ${adminResponse}`
                    : `Your request (${id}) was declined. Please contact support for details.`,
                ACKNOWLEDGED: `Admin is reviewing your request (${id}). We'll update you once we have an answer.`,
            };
            await db.insert(clientNotifications).values({
                id: `CNT-${nanoid(10)}`,
                userId: existing.userId,
                type: status === "FULFILLED" ? "BOOKING_APPROVED" : status === "DECLINED" ? "BOOKING_REJECTED" : "GENERAL",
                title: titleMap[status as keyof typeof titleMap],
                message: messageMap[status as keyof typeof messageMap],
                allocationId: null,
                isRead: false,
            });
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to update request";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
