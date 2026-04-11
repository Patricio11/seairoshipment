import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { containers, palletAllocations, containerTypes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const { id } = await params;
        const body = await request.json();

        const [existing] = await db
            .select()
            .from(containers)
            .where(eq(containers.id, id))
            .limit(1);

        if (!existing) {
            return NextResponse.json({ error: "Container not found" }, { status: 404 });
        }

        const updates: Record<string, unknown> = { updatedAt: new Date() };

        if (body.route !== undefined) updates.route = body.route;
        if (body.vessel !== undefined) updates.vessel = body.vessel;
        if (body.voyageNumber !== undefined) updates.voyageNumber = body.voyageNumber || null;
        if (body.sailingScheduleId !== undefined) updates.sailingScheduleId = body.sailingScheduleId || null;
        if (body.etd !== undefined) updates.etd = body.etd ? new Date(body.etd) : null;
        if (body.eta !== undefined) updates.eta = body.eta ? new Date(body.eta) : null;
        if (body.containerTypeId !== undefined) {
            const [ct] = await db.select().from(containerTypes).where(eq(containerTypes.id, body.containerTypeId)).limit(1);
            if (!ct) return NextResponse.json({ error: "Invalid container type" }, { status: 400 });
            updates.containerTypeId = ct.id;
            updates.type = ct.size;
            updates.maxCapacity = ct.maxPallets;
            updates.salesRateTypeId = ct.type === "DRY" ? "scs" : "srs";
        }
        if (body.maxCapacity !== undefined && body.containerTypeId === undefined) updates.maxCapacity = body.maxCapacity;

        const [updated] = await db
            .update(containers)
            .set(updates)
            .where(eq(containers.id, id))
            .returning();

        return NextResponse.json(updated);
    } catch (error: unknown) {
        console.error("Update container error:", error);
        const message = error instanceof Error ? error.message : "Failed to update container";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const { id } = await params;

        const [existing] = await db
            .select()
            .from(containers)
            .where(eq(containers.id, id))
            .limit(1);

        if (!existing) {
            return NextResponse.json({ error: "Container not found" }, { status: 404 });
        }

        if (existing.totalPallets > 0) {
            return NextResponse.json(
                { error: "Cannot delete container with pallet allocations. Remove allocations first." },
                { status: 400 }
            );
        }

        if (existing.status !== "OPEN") {
            return NextResponse.json(
                { error: "Can only delete containers with OPEN status" },
                { status: 400 }
            );
        }

        // Clean up any allocations (should be 0 but just in case)
        await db.delete(palletAllocations).where(eq(palletAllocations.containerId, id));
        await db.delete(containers).where(eq(containers.id, id));

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error("Delete container error:", error);
        const message = error instanceof Error ? error.message : "Failed to delete container";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
