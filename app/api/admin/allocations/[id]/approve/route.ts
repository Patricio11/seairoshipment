import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { palletAllocations, containers, adminNotifications, clientNotifications } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function POST(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const { id } = await params;

        // Fetch the allocation
        const [alloc] = await db
            .select()
            .from(palletAllocations)
            .where(eq(palletAllocations.id, id))
            .limit(1);

        if (!alloc) {
            return NextResponse.json({ error: "Allocation not found" }, { status: 404 });
        }

        if (alloc.status !== "PENDING") {
            return NextResponse.json(
                { error: `Allocation is already ${alloc.status}` },
                { status: 400 }
            );
        }

        // Fetch the container
        const [container] = await db
            .select()
            .from(containers)
            .where(eq(containers.id, alloc.containerId))
            .limit(1);

        if (!container) {
            return NextResponse.json({ error: "Container not found" }, { status: 404 });
        }

        const newTotal = container.totalPallets + (alloc.palletCount || 0);
        if (newTotal > container.maxCapacity) {
            return NextResponse.json(
                { error: `Approving would exceed container capacity (${newTotal}/${container.maxCapacity})` },
                { status: 400 }
            );
        }

        // Confirm the allocation
        await db
            .update(palletAllocations)
            .set({ status: "CONFIRMED", updatedAt: new Date() })
            .where(eq(palletAllocations.id, id));

        // Add pallets to container total
        const newContainerStatus = newTotal >= 15 ? "THRESHOLD_REACHED" : "OPEN";
        await db
            .update(containers)
            .set({
                totalPallets: newTotal,
                status: newContainerStatus,
                updatedAt: new Date(),
            })
            .where(eq(containers.id, container.id));

        // Notify the client
        await db.insert(clientNotifications).values({
            id: `CNT-${nanoid(10)}`,
            userId: alloc.userId,
            type: "BOOKING_APPROVED",
            title: "Booking Request Approved",
            message: `Your booking request for ${alloc.palletCount} pallet${alloc.palletCount === 1 ? "" : "s"} on ${container.vessel} has been approved and is now confirmed.`,
            allocationId: id,
            isRead: false,
        });

        // Notify admin when threshold first crossed
        if (newTotal >= 15 && container.totalPallets < 15) {
            await db.insert(adminNotifications).values({
                id: `NTF-${nanoid(10)}`,
                type: "CONTAINER_THRESHOLD",
                title: "Container Ready for MetaShip Order",
                message: `Container ${container.id} on route ${container.route} (${container.vessel}) has reached ${newTotal} pallets. Ready to create MetaShip order.`,
                containerId: container.id,
                isRead: false,
            });
        }

        return NextResponse.json({ success: true, newTotalPallets: newTotal });
    } catch (err) {
        console.error("Approve allocation error:", err);
        const message = err instanceof Error ? err.message : "Failed to approve allocation";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
