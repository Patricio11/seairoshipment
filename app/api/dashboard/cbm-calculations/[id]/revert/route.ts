import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { db } from "@/lib/db";
import {
    cargoCalculations,
    cargoCalculationShareActions,
} from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { totalCbm, totalWeight, volumetricWeightSea } from "@/lib/cbm";
import type { CargoItem } from "@/lib/db/schema/pallet-allocations";

/**
 * Owner-only — revert the calculation's items to the snapshot stored on a
 * specific EDIT action. The snapshot was captured BEFORE that edit ran, so
 * reverting restores the calc to its state immediately before that guest
 * save. Totals are recomputed from the restored items.
 *
 * Body: { actionId: string }
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const { id } = await params;

        const body = await req.json().catch(() => ({}));
        const actionId = typeof body?.actionId === "string" ? body.actionId : "";
        if (!actionId) {
            return NextResponse.json({ error: "actionId is required" }, { status: 400 });
        }

        // Ownership check first.
        const [owned] = await db
            .select()
            .from(cargoCalculations)
            .where(and(
                eq(cargoCalculations.id, id),
                eq(cargoCalculations.userId, session.user.id),
            ))
            .limit(1);
        if (!owned) return NextResponse.json({ error: "Calculation not found" }, { status: 404 });

        // Find the action — must belong to this calc and be an EDIT.
        const [action] = await db
            .select()
            .from(cargoCalculationShareActions)
            .where(and(
                eq(cargoCalculationShareActions.id, actionId),
                eq(cargoCalculationShareActions.calculationId, id),
            ))
            .limit(1);

        if (!action) return NextResponse.json({ error: "Action not found" }, { status: 404 });
        if (action.action !== "EDITED") {
            return NextResponse.json({ error: "Only EDIT actions can be reverted." }, { status: 400 });
        }
        if (!action.itemsSnapshot) {
            return NextResponse.json({ error: "No snapshot available for this action." }, { status: 400 });
        }

        const restored = action.itemsSnapshot as CargoItem[];
        if (!Array.isArray(restored)) {
            return NextResponse.json({ error: "Snapshot is corrupted." }, { status: 500 });
        }

        const totalCbmValue = totalCbm(restored);
        const totalWeightKg = totalWeight(restored);
        const volumetric = volumetricWeightSea(totalCbmValue);

        await db
            .update(cargoCalculations)
            .set({
                cargoItems: restored,
                totalCBM: totalCbmValue.toFixed(4),
                totalWeightKg: totalWeightKg.toFixed(4),
                volumetricWeightKg: volumetric.toFixed(4),
                updatedAt: new Date(),
            })
            .where(eq(cargoCalculations.id, id));

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("[revert] error:", err);
        const message = err instanceof Error ? err.message : "Failed to revert";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
