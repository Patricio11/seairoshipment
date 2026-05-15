import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cargoCalculations, cargoCalculationShares } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

/**
 * Public read-only endpoint for a shared calculation. No auth.
 *
 * Returns the calculation payload sufficient to render the read-only view:
 * name, items, totals. We deliberately do NOT expose the owner's user id,
 * email, notes, or any other identifying field — the viewer should see
 * dimensions and that's it.
 *
 * Access checks:
 *  - token must exist
 *  - revokedAt must be null
 *  - expiresAt must be null or in the future
 *
 * Every successful access bumps accessCount + lastAccessedAt so the
 * owner can see basic engagement stats. Failed accesses (revoked /
 * expired) do not.
 */
export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ token: string }> },
) {
    try {
        const { token } = await params;
        if (!token) return NextResponse.json({ error: "Token required" }, { status: 400 });

        const [share] = await db
            .select()
            .from(cargoCalculationShares)
            .where(eq(cargoCalculationShares.token, token))
            .limit(1);

        if (!share) return NextResponse.json({ error: "Share link not found" }, { status: 404 });
        if (share.revokedAt) return NextResponse.json({ error: "Share link revoked" }, { status: 410 });
        if (share.expiresAt && share.expiresAt < new Date()) {
            return NextResponse.json({ error: "Share link expired" }, { status: 410 });
        }

        const [calc] = await db
            .select({
                id: cargoCalculations.id,
                name: cargoCalculations.name,
                cargoType: cargoCalculations.cargoType,
                cargoItems: cargoCalculations.cargoItems,
                totalCBM: cargoCalculations.totalCBM,
                volumetricWeightKg: cargoCalculations.volumetricWeightKg,
                totalWeightKg: cargoCalculations.totalWeightKg,
                createdAt: cargoCalculations.createdAt,
                updatedAt: cargoCalculations.updatedAt,
            })
            .from(cargoCalculations)
            .where(eq(cargoCalculations.id, share.calculationId))
            .limit(1);

        if (!calc) return NextResponse.json({ error: "Calculation no longer available" }, { status: 404 });

        // Bump access counters in the background; if it fails we still serve the read.
        await db
            .update(cargoCalculationShares)
            .set({
                accessCount: sql`${cargoCalculationShares.accessCount} + 1`,
                lastAccessedAt: new Date(),
            })
            .where(eq(cargoCalculationShares.token, token))
            .catch(() => { /* non-fatal */ });

        return NextResponse.json({
            calculation: calc,
            expiresAt: share.expiresAt,
            // Expose permission toggles so the public viewer can render the
            // Approve / Edit affordances when allowed.
            allowApprove: share.allowApprove,
            allowEdit: share.allowEdit,
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load shared calculation";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
