import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { containers, products, productCategories, sailings, palletAllocations } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";

/**
 * Client-facing list of bookable containers.
 *
 * Returns both:
 *  - `containers`: full-match containers the user can book right away
 *  - `excluded`: near-match containers on the same route + rate type that failed
 *    one of the other filters, each tagged with a human reason so the UI can
 *    tell the client *why* their pick isn't available.
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const route = request.nextUrl.searchParams.get("route");
        if (!route) {
            return NextResponse.json(
                { error: "Route parameter is required (e.g. ?route=ZACPT-NLRTM)" },
                { status: 400 }
            );
        }

        const salesRateTypeId = request.nextUrl.searchParams.get("salesRateTypeId") || "srs";
        const productId = request.nextUrl.searchParams.get("productId");
        const temperature = request.nextUrl.searchParams.get("temperature");
        const sailingId = request.nextUrl.searchParams.get("sailingId");
        const cargoTypeRaw = request.nextUrl.searchParams.get("cargoType");
        const cargoType = cargoTypeRaw === "CUBE" || cargoTypeRaw === "PALLET" ? cargoTypeRaw : null;

        // Resolve productId → categoryId so we can filter on the consolidation unit
        let resolvedCategoryId: string | null = null;
        let productMissingCategory = false;
        if (productId) {
            const [p] = await db
                .select({ categoryId: products.categoryId })
                .from(products)
                .where(eq(products.id, productId))
                .limit(1);
            resolvedCategoryId = p?.categoryId || null;
            if (!resolvedCategoryId) productMissingCategory = true;
        }

        // Pull every candidate on the route + rate type, then filter in-memory so
        // we can describe exactly which rule each exclusion tripped.
        const baseRows = await db
            .select({
                container: containers,
                categoryName: productCategories.name,
                sailingVessel: sailings.vesselName,
                sailingVoyage: sailings.voyageNumber,
            })
            .from(containers)
            .leftJoin(productCategories, eq(containers.categoryId, productCategories.id))
            .leftJoin(sailings, eq(containers.sailingId, sailings.id))
            .where(and(
                eq(containers.route, route),
                eq(containers.salesRateTypeId, salesRateTypeId),
            ));

        // Aggregate pending allocations per container so the slider's "remaining"
        // figure matches what the booking POST endpoint will actually enforce.
        // container.totalPallets / totalCBM only count CONFIRMED allocations -
        // pending requests reserve space too, and the server check rejects
        // bookings that would push over (confirmed + pending + new).
        const containerIds = baseRows.map(r => r.container.id);
        const pendingByContainer = new Map<string, { pallets: number; cbm: number }>();
        if (containerIds.length > 0) {
            const pendings = await db
                .select({
                    containerId: palletAllocations.containerId,
                    palletCount: palletAllocations.palletCount,
                    cbmVolume: palletAllocations.cbmVolume,
                })
                .from(palletAllocations)
                .where(and(
                    inArray(palletAllocations.containerId, containerIds),
                    eq(palletAllocations.status, "PENDING"),
                ));
            for (const p of pendings) {
                const slot = pendingByContainer.get(p.containerId) || { pallets: 0, cbm: 0 };
                slot.pallets += p.palletCount || 0;
                slot.cbm += Number(p.cbmVolume ?? 0);
                pendingByContainer.set(p.containerId, slot);
            }
        }

        const matches: Slot[] = [];
        const excluded: Excluded[] = [];

        for (const row of baseRows) {
            const c = row.container;
            const reasons: string[] = [];

            const pending = pendingByContainer.get(c.id) || { pallets: 0, cbm: 0 };
            const reservedPallets = c.totalPallets + pending.pallets;
            const reservedCBM = Number(c.totalCBM ?? 0) + pending.cbm;

            if (c.status !== "OPEN" && c.status !== "THRESHOLD_REACHED") {
                reasons.push(c.status === "BOOKED" ? "Already booked with MetaShip" : `Status is ${c.status}`);
            }
            // Capacity check varies by cargo type. Compare against the
            // *reserved* total (confirmed + pending) so a full-but-not-yet-
            // approved container shows as full to the booking UI.
            if (c.cargoType === "CUBE") {
                const maxCBM = c.maxCapacityCBM ? Number(c.maxCapacityCBM) : 0;
                if (maxCBM <= 0) reasons.push("CBM capacity not configured");
                else if (maxCBM - reservedCBM < 0.01) reasons.push("Container is full");
            } else {
                if (c.maxCapacity - reservedPallets < 1) {
                    reasons.push("Container is full");
                }
            }
            if (cargoType && c.cargoType !== cargoType) {
                reasons.push(`Cargo-type mismatch - container is ${c.cargoType.toLowerCase()}-only`);
            }
            if (productMissingCategory) {
                reasons.push("Selected product has no category - ask admin to assign one");
            } else if (resolvedCategoryId && c.categoryId !== resolvedCategoryId) {
                reasons.push(`Category mismatch - container accepts ${row.categoryName || "a different category"}`);
            }
            if (temperature && c.temperature !== temperature) {
                reasons.push(`Temperature mismatch - container runs ${c.temperature || "unset"}, you picked ${temperature}`);
            }
            if (sailingId && c.sailingId !== sailingId) {
                reasons.push("Sailing mismatch");
            }

            const slot: Slot = {
                id: c.id,
                vessel: row.sailingVessel || c.vessel,
                voyageNumber: row.sailingVoyage || c.voyageNumber,
                // preFilled includes pending allocations so the wizard's slider
                // can't offer space the server will reject.
                preFilled: reservedPallets,
                maxCapacity: c.maxCapacity,
                date: c.etd
                    ? new Date(c.etd).toLocaleDateString("en-US", { month: "short", day: "2-digit" })
                    : "TBD",
                type: c.type as "20FT" | "40FT",
                temperature: c.temperature,
                categoryName: row.categoryName,
                productName: row.categoryName,
                cargoType: c.cargoType,
                // Same convention for CUBE - reservedCBM, not raw totalCBM.
                totalCBM: reservedCBM,
                maxCapacityCBM: c.maxCapacityCBM ? Number(c.maxCapacityCBM) : null,
            };

            if (reasons.length === 0) {
                matches.push(slot);
            } else {
                excluded.push({ ...slot, status: c.status, reasons });
            }
        }

        return NextResponse.json({ containers: matches, excluded });
    } catch (error: unknown) {
        console.error("Get containers error:", error);
        const message = error instanceof Error ? error.message : "Failed to fetch containers";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

interface Slot {
    id: string;
    vessel: string;
    voyageNumber: string | null;
    preFilled: number;
    maxCapacity: number;
    date: string;
    type: "20FT" | "40FT";
    temperature: string | null;
    categoryName: string | null;
    productName: string | null;
    cargoType: "PALLET" | "CUBE";
    totalCBM: number;
    maxCapacityCBM: number | null;
}

interface Excluded extends Slot {
    status: string;
    reasons: string[];
}
