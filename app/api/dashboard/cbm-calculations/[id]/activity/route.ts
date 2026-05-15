import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { db } from "@/lib/db";
import {
    cargoCalculations,
    cargoCalculationShareActions,
} from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";

/**
 * Returns the share-action audit log for a calculation, owner-only.
 * Most recent first. Used by the calc detail page to render the Activity
 * timeline (approvals + edits with revert affordance).
 */
export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const { id } = await params;

        // Verify ownership before exposing the audit log.
        const [owned] = await db
            .select({ id: cargoCalculations.id })
            .from(cargoCalculations)
            .where(and(
                eq(cargoCalculations.id, id),
                eq(cargoCalculations.userId, session.user.id),
            ))
            .limit(1);
        if (!owned) return NextResponse.json({ error: "Calculation not found" }, { status: 404 });

        const rows = await db
            .select()
            .from(cargoCalculationShareActions)
            .where(eq(cargoCalculationShareActions.calculationId, id))
            .orderBy(desc(cargoCalculationShareActions.createdAt));

        return NextResponse.json({ actions: rows });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load activity";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
