import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { palletAllocations, clientNotifications } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const { id } = await params;
        const body = await request.json().catch(() => ({}));
        const reason: string | undefined = body.reason;

        const [alloc] = await db
            .select()
            .from(palletAllocations)
            .where(eq(palletAllocations.id, id))
            .limit(1);

        if (!alloc) {
            return NextResponse.json({ error: "Allocation not found" }, { status: 404 });
        }

        if (alloc.status === "CANCELLED") {
            return NextResponse.json({ error: "Allocation is already cancelled" }, { status: 400 });
        }

        await db
            .update(palletAllocations)
            .set({
                status: "CANCELLED",
                rejectionReason: reason || null,
                updatedAt: new Date(),
            })
            .where(eq(palletAllocations.id, id));

        // Create notification for the client
        await db.insert(clientNotifications).values({
            id: `CNT-${nanoid(10)}`,
            userId: alloc.userId,
            type: "BOOKING_REJECTED",
            title: "Booking Request Rejected",
            message: reason
                ? `Your booking request (${id}) was rejected. Reason: ${reason}`
                : `Your booking request (${id}) was rejected. Please contact support for details.`,
            allocationId: id,
            isRead: false,
        });

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Reject allocation error:", err);
        const message = err instanceof Error ? err.message : "Failed to reject allocation";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
