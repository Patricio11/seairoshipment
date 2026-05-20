import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { cargoCalculations, containers, palletAllocations } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { calculateCubeQuote } from "@/lib/rates";

/**
 * Live SCS-Cube quote for a saved calculation.
 *
 * Inputs:
 *   - calc id (path)
 *   - route - required as ?route=ZACPT-NLRTM. If omitted we try to derive
 *     one from the user's most recently booked container so the quote is
 *     useful even on first calc load.
 *   - containerTypeId (optional) - defaults to a 40ft HC reefer; admin can
 *     widen this once container_types has a default for cube workloads.
 *
 * Always uses cargoType=CUBE and the SCS salesRateTypeId - the rates lib
 * filters rate cards accordingly.
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = await params;
        const sp = req.nextUrl.searchParams;

        // Verify ownership and fetch the calc's volume
        const [calc] = await db
            .select({
                id: cargoCalculations.id,
                userId: cargoCalculations.userId,
                totalCBM: cargoCalculations.totalCBM,
            })
            .from(cargoCalculations)
            .where(and(
                eq(cargoCalculations.id, id),
                eq(cargoCalculations.userId, session.user.id),
            ))
            .limit(1);
        if (!calc) return NextResponse.json({ error: "Calculation not found" }, { status: 404 });

        const cbmVolume = Number(calc.totalCBM);
        if (!Number.isFinite(cbmVolume) || cbmVolume <= 0) {
            return NextResponse.json({ error: "Calculation has zero volume - add cargo items first" }, { status: 400 });
        }

        // Route can come from the query or fall back to the user's most-recent
        // booked route. Saves the user from filling it in for typical flows.
        let route = sp.get("route");
        if (!route) {
            const [last] = await db
                .select({ route: containers.route })
                .from(palletAllocations)
                .innerJoin(containers, eq(palletAllocations.containerId, containers.id))
                .where(eq(palletAllocations.userId, session.user.id))
                .orderBy(desc(palletAllocations.createdAt))
                .limit(1);
            if (last?.route) route = last.route;
        }

        if (!route || !route.includes("-")) {
            return NextResponse.json({
                quote: null,
                reason: "no_route",
                message: "Pick a route to see a live quote - or book your first shipment so we know your typical lane.",
            });
        }

        const [originCode, destinationCode] = route.split("-");
        const containerTypeId = sp.get("containerTypeId") || "40ft-hc-reefer";
        const salesRateTypeId = "scs";

        try {
            const quote = await calculateCubeQuote(
                originCode,
                destinationCode,
                cbmVolume,
                salesRateTypeId,
                containerTypeId,
            );
            return NextResponse.json({ quote, route });
        } catch (err) {
            const message = err instanceof Error ? err.message : "Quote failed";
            // Graceful fallback so the calculator doesn't render an angry
            // error when no rate card exists for the route yet.
            return NextResponse.json({
                quote: null,
                reason: "rate_unavailable",
                message,
                route,
            });
        }
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to compute quote";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
