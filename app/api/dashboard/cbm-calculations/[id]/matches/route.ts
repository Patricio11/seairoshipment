import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { cargoCalculations, containers, palletAllocations } from "@/lib/db/schema";
import { and, asc, desc, eq, gt, inArray, isNotNull, ne, or, sql } from "drizzle-orm";

const CUTOFF_LEAD_HOURS = 48;

/**
 * Smart-match: returns active SCS Cube containers on the user's preferred
 * route (or all routes if none specified) whose remaining CBM is ≥ the
 * calculation's total volume, sorted by next cut-off (etd - 48h).
 *
 * Falls back to user's most-recent booked route if no `?route=` query.
 * If the user has no bookings yet, returns matches across all routes.
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = await params;

        // Fetch calc + verify ownership
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

        const cbmRequired = Number(calc.totalCBM);
        if (!Number.isFinite(cbmRequired) || cbmRequired <= 0) {
            return NextResponse.json({ matches: [], reason: "zero_volume" });
        }

        // Route filter: explicit > recent-booking > all
        let route = req.nextUrl.searchParams.get("route");
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

        const now = new Date();

        const conds = [
            eq(containers.salesRateTypeId, "scs"),
            eq(containers.cargoType, "CUBE"),
            isNotNull(containers.etd),
            gt(containers.etd, now),
            ne(containers.status, "SAILING"),
            ne(containers.status, "DELIVERED"),
            // remaining CBM ≥ required
            sql`COALESCE(${containers.maxCapacityCBM}, 0) - COALESCE(${containers.totalCBM}, 0) >= ${cbmRequired}`,
        ];
        if (route) conds.push(eq(containers.route, route));

        // Pull a few extra (up to 10) so the UI can show "X more on the route" or fall back
        const rows = await db
            .select()
            .from(containers)
            .where(and(...conds))
            .orderBy(asc(containers.etd))
            .limit(10);

        // If we filtered by route and got nothing, retry without the route filter
        // so the user at least sees what's open elsewhere.
        let fallbackUsed = false;
        let final = rows;
        if (rows.length === 0 && route) {
            const conds2 = conds.filter(c => c !== eq(containers.route, route));
            const widened = await db
                .select()
                .from(containers)
                .where(and(...conds2))
                .orderBy(asc(containers.etd))
                .limit(5);
            final = widened;
            fallbackUsed = widened.length > 0;
        }

        const matches = final.map(c => {
            const cutoffAt = c.etd ? new Date(c.etd.getTime() - CUTOFF_LEAD_HOURS * 60 * 60 * 1000) : null;
            const hoursToCutoff = cutoffAt ? (cutoffAt.getTime() - now.getTime()) / (1000 * 60 * 60) : null;
            const maxCbm = c.maxCapacityCBM ? Number(c.maxCapacityCBM) : 0;
            const usedCbm = c.totalCBM ? Number(c.totalCBM) : 0;
            return {
                containerId: c.id,
                route: c.route,
                vessel: c.vessel,
                voyageNumber: c.voyageNumber,
                etd: c.etd?.toISOString() ?? null,
                cutoffAt: cutoffAt?.toISOString() ?? null,
                hoursToCutoff,
                cbmTotal: maxCbm,
                cbmUsed: usedCbm,
                cbmRemaining: maxCbm - usedCbm,
                cbmRequired,
                cbmSpare: maxCbm - usedCbm - cbmRequired,
            };
        });

        return NextResponse.json({
            matches,
            route,
            fallbackUsed,
            reason: matches.length === 0 ? "no_capacity" : null,
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to compute matches";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
