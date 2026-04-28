import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { palletAllocations, containers, adminNotifications, clientNotifications } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

/**
 * Resubmit a previously cancelled booking.
 * - Only the owner can resubmit.
 * - Only CANCELLED allocations can be resubmitted.
 * - Sets status back to PENDING and clears rejectionReason.
 * - Accepts updated fields from the client.
 * - Notifies admin of the resubmission.
 */
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ allocationId: string }> }
) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { allocationId: id } = await params;
        const body = await request.json();

        const [alloc] = await db
            .select()
            .from(palletAllocations)
            .where(eq(palletAllocations.id, id))
            .limit(1);

        if (!alloc) {
            return NextResponse.json({ error: "Booking not found" }, { status: 404 });
        }
        if (alloc.userId !== session.user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }
        if (alloc.status !== "CANCELLED") {
            return NextResponse.json(
                { error: `Only cancelled bookings can be resubmitted (current: ${alloc.status})` },
                { status: 400 }
            );
        }

        // Fetch the container to check capacity
        const [container] = await db
            .select()
            .from(containers)
            .where(eq(containers.id, alloc.containerId))
            .limit(1);

        if (!container) {
            return NextResponse.json({ error: "Original container not found" }, { status: 404 });
        }

        // Check container is still OPEN for resubmission
        if (!["OPEN", "THRESHOLD_REACHED"].includes(container.status)) {
            return NextResponse.json(
                { error: `Container is ${container.status} — cannot resubmit. Please create a new booking.` },
                { status: 400 }
            );
        }

        const newPalletCount = body.palletCount ?? alloc.palletCount;

        // Check capacity including other pending allocations
        const otherAllocs = await db
            .select()
            .from(palletAllocations)
            .where(eq(palletAllocations.containerId, container.id));
        const otherReserved = otherAllocs
            .filter(a => a.id !== alloc.id && a.status === "PENDING")
            .reduce((sum, a) => sum + a.palletCount, 0);
        const reserved = container.totalPallets + otherReserved;
        if (reserved + newPalletCount > container.maxCapacity) {
            return NextResponse.json(
                { error: `Container has only ${container.maxCapacity - reserved} pallet spaces left` },
                { status: 400 }
            );
        }

        // Build update object — only update fields that are provided
        const updates: Record<string, unknown> = {
            status: "PENDING",
            rejectionReason: null,
            updatedAt: new Date(),
        };
        if (body.palletCount !== undefined) updates.palletCount = body.palletCount;
        if (body.commodityName !== undefined) updates.commodityName = body.commodityName;
        if (body.hsCode !== undefined) updates.hsCode = body.hsCode;
        if (body.nettWeight !== undefined) updates.nettWeight = body.nettWeight?.toString() || null;
        if (body.grossWeight !== undefined) updates.grossWeight = body.grossWeight?.toString() || null;
        if (body.temperature !== undefined) updates.temperature = body.temperature;
        if (body.consigneeName !== undefined) updates.consigneeName = body.consigneeName;
        if (body.consigneeAddress !== undefined) updates.consigneeAddress = body.consigneeAddress;
        if (Array.isArray(body.collectionAddresses)) {
            const cleaned = body.collectionAddresses
                .map((a: unknown) => {
                    if (!a || typeof a !== "object") return null;
                    const row = a as { label?: unknown; address?: unknown };
                    const address = typeof row.address === "string" ? row.address.trim() : "";
                    if (!address) return null;
                    const label = typeof row.label === "string" && row.label.trim() ? row.label.trim() : undefined;
                    return label ? { label, address } : { address };
                })
                .filter((a: unknown): a is { label?: string; address: string } => a !== null)
                .slice(0, 5);
            if (cleaned.length === 0) {
                return NextResponse.json(
                    { error: "At least one collection / loading address is required" },
                    { status: 400 }
                );
            }
            updates.collectionAddresses = cleaned;
        }

        await db
            .update(palletAllocations)
            .set(updates)
            .where(eq(palletAllocations.id, id));

        // Notify admin
        await db.insert(adminNotifications).values({
            id: `NTF-${nanoid(10)}`,
            type: "BOOKING_CREATED",
            title: "Booking Resubmitted",
            message: `A cancelled booking (${id}) has been resubmitted by the client. Please review.`,
            containerId: container.id,
            isRead: false,
        });

        // Also notify the client (confirmation of their action)
        await db.insert(clientNotifications).values({
            id: `CNT-${nanoid(10)}`,
            userId: session.user.id,
            type: "GENERAL",
            title: "Booking Resubmitted",
            message: `Your booking (${id}) was resubmitted for review. You'll be notified when it's approved.`,
            allocationId: id,
            isRead: false,
        });

        return NextResponse.json({ success: true, id });
    } catch (err) {
        console.error("Resubmit booking error:", err);
        const message = err instanceof Error ? err.message : "Failed to resubmit booking";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
