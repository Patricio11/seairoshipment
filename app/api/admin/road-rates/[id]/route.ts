import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { roadRates } from "@/lib/db/schema";
import { and, eq, isNull, ne } from "drizzle-orm";

/**
 * Update a road rate line. Customer + route are fixed after creation (delete
 * and recreate to move a line) - the band, fees, drops included, and active
 * flag can change. Band edits are overlap-checked against sibling lines.
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

        // Band change - validate + overlap-check against siblings
        if (body.minPallets !== undefined || body.maxPallets !== undefined) {
            const minPallets = body.minPallets !== undefined ? Math.floor(Number(body.minPallets)) : existing.minPallets;
            const maxPallets = body.maxPallets !== undefined ? Math.floor(Number(body.maxPallets)) : existing.maxPallets;
            if (!(minPallets >= 1) || maxPallets < minPallets) {
                return NextResponse.json({ error: "Pallet band is invalid - max must be ≥ min and min ≥ 1" }, { status: 400 });
            }
            const siblings = await db
                .select({ id: roadRates.id, minPallets: roadRates.minPallets, maxPallets: roadRates.maxPallets })
                .from(roadRates)
                .where(and(
                    eq(roadRates.route, existing.route),
                    existing.userId ? eq(roadRates.userId, existing.userId) : isNull(roadRates.userId),
                    ne(roadRates.id, id),
                ));
            const clash = siblings.find(s => minPallets <= s.maxPallets && maxPallets >= s.minPallets);
            if (clash) {
                return NextResponse.json(
                    { error: `This band overlaps an existing line (${clash.minPallets}-${clash.maxPallets} pallets)` },
                    { status: 400 }
                );
            }
            updates.minPallets = minPallets;
            updates.maxPallets = maxPallets;
        }

        if (body.transportCostPerPallet !== undefined) {
            const v = Number(body.transportCostPerPallet);
            if (!(v > 0)) return NextResponse.json({ error: "Transport cost per pallet must be greater than 0" }, { status: 400 });
            updates.transportCostPerPallet = v.toFixed(2);
        }
        if (body.dropsIncluded !== undefined) {
            updates.dropsIncluded = Math.max(1, Math.floor(Number(body.dropsIncluded)) || 1);
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
