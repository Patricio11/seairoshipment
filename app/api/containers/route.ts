import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { containers, products, productCategories, sailings } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

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

        const matches: Slot[] = [];
        const excluded: Excluded[] = [];

        for (const row of baseRows) {
            const c = row.container;
            const reasons: string[] = [];

            if (c.status !== "OPEN" && c.status !== "THRESHOLD_REACHED") {
                reasons.push(c.status === "BOOKED" ? "Already booked with MetaShip" : `Status is ${c.status}`);
            }
            if (c.maxCapacity - c.totalPallets < 1) {
                reasons.push("Container is full");
            }
            if (productMissingCategory) {
                reasons.push("Selected product has no category — ask admin to assign one");
            } else if (resolvedCategoryId && c.categoryId !== resolvedCategoryId) {
                reasons.push(`Category mismatch — container accepts ${row.categoryName || "a different category"}`);
            }
            if (temperature && c.temperature !== temperature) {
                reasons.push(`Temperature mismatch — container runs ${c.temperature || "unset"}, you picked ${temperature}`);
            }
            if (sailingId && c.sailingId !== sailingId) {
                reasons.push("Sailing mismatch");
            }

            const slot: Slot = {
                id: c.id,
                vessel: row.sailingVessel || c.vessel,
                voyageNumber: row.sailingVoyage || c.voyageNumber,
                preFilled: c.totalPallets,
                maxCapacity: c.maxCapacity,
                date: c.etd
                    ? new Date(c.etd).toLocaleDateString("en-US", { month: "short", day: "2-digit" })
                    : "TBD",
                type: c.type as "20FT" | "40FT",
                temperature: c.temperature,
                categoryName: row.categoryName,
                productName: row.categoryName,
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
}

interface Excluded extends Slot {
    status: string;
    reasons: string[];
}
