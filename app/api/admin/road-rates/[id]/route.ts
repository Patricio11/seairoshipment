import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { roadRates } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Update a road rate card. Customer + route are fixed after creation (delete
 * and recreate to move a card) - only the 3 fee lines and active flag change.
 */
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const { id } = await params;
        const body = await request.json();

        const [existing] = await db.select().from(roadRates).where(eq(roadRates.id, id)).limit(1);
        if (!existing) return NextResponse.json({ error: "Rate card not found" }, { status: 404 });

        const updates: Record<string, unknown> = { updatedAt: new Date() };

        if (body.transportCostPerPallet !== undefined) {
            const v = Number(body.transportCostPerPallet);
            if (!(v > 0)) return NextResponse.json({ error: "Transport cost per pallet must be greater than 0" }, { status: 400 });
            updates.transportCostPerPallet = v.toFixed(2);
        }
        if (body.additionalDropFee !== undefined) {
            const v = Number(body.additionalDropFee);
            updates.additionalDropFee = (v >= 0 ? v : 0).toFixed(2);
        }
        if (body.overhangFeePerPallet !== undefined) {
            const v = Number(body.overhangFeePerPallet);
            updates.overhangFeePerPallet = (v >= 0 ? v : 0).toFixed(2);
        }
        if (body.active !== undefined) updates.active = Boolean(body.active);

        const [updated] = await db
            .update(roadRates)
            .set(updates)
            .where(eq(roadRates.id, id))
            .returning();

        return NextResponse.json(updated);
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to update road rate";
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
        const [deleted] = await db.delete(roadRates).where(eq(roadRates.id, id)).returning();
        if (!deleted) return NextResponse.json({ error: "Rate card not found" }, { status: 404 });

        return NextResponse.json({ success: true });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to delete road rate";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
