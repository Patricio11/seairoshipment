import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { containers, products, sailings } from "@/lib/db/schema";
import { eq, and, inArray, sql } from "drizzle-orm";

/**
 * Returns the cascading options a client can pick from for a booking.
 * Only values that have at least one OPEN or THRESHOLD_REACHED container
 * matching all prior selections are returned.
 *
 * Query params:
 *   - route (required)            e.g. "ZACPT-NLRTM"
 *   - salesRateTypeId (required)  e.g. "srs" | "scs"
 *   - productId (optional)        narrows temperatures + sailings
 *   - temperature (optional)      narrows sailings
 *
 * Response: { products, temperatures, sailings }
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const url = new URL(request.url);
        const route = url.searchParams.get("route");
        const salesRateTypeId = url.searchParams.get("salesRateTypeId") || "srs";
        const productId = url.searchParams.get("productId");
        const temperature = url.searchParams.get("temperature");

        if (!route) {
            return NextResponse.json({ error: "route is required" }, { status: 400 });
        }

        // Base filter: bookable containers on this route + service type
        const openFilter = and(
            eq(containers.route, route),
            eq(containers.salesRateTypeId, salesRateTypeId),
            inArray(containers.status, ["OPEN", "THRESHOLD_REACHED"]),
            // Must have remaining capacity
            sql`${containers.maxCapacity} - ${containers.totalPallets} >= 1`,
        );

        // Pull all matching containers once; everything below is in-memory filtering.
        const matching = await db.select().from(containers).where(openFilter);

        // Collect distinct productIds from matching containers
        const productIds = Array.from(new Set(matching.map(c => c.productId).filter(Boolean))) as string[];
        const productRows = productIds.length > 0
            ? await db.select().from(products).where(inArray(products.id, productIds))
            : [];
        const productMap = new Map(productRows.map(p => [p.id, p]));

        const productList = productIds
            .map(id => productMap.get(id))
            .filter((p): p is NonNullable<typeof p> => !!p && p.active)
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(p => ({
                id: p.id,
                name: p.name,
                hsCode: p.hsCode,
                category: p.category,
            }));

        // Temperatures narrowed by product if provided
        const afterProduct = productId
            ? matching.filter(c => c.productId === productId)
            : matching;
        const tempSet = new Set(afterProduct.map(c => c.temperature).filter(Boolean));
        const temperatureList = Array.from(tempSet) as Array<"frozen" | "chilled" | "ambient">;

        // Sailings narrowed by product + temperature if provided
        const afterTemp = temperature
            ? afterProduct.filter(c => c.temperature === temperature)
            : afterProduct;
        const sailingIds = Array.from(new Set(afterTemp.map(c => c.sailingId).filter(Boolean))) as string[];
        const sailingRows = sailingIds.length > 0
            ? await db.select().from(sailings).where(inArray(sailings.id, sailingIds))
            : [];
        const sailingList = sailingRows
            .sort((a, b) => a.etd.getTime() - b.etd.getTime())
            .map(s => ({
                id: s.id,
                vesselName: s.vesselName,
                voyageNumber: s.voyageNumber,
                etd: s.etd.toISOString(),
                eta: s.eta?.toISOString() || null,
                transitTime: s.transitTime,
                serviceType: s.serviceType,
            }));

        return NextResponse.json({
            products: productList,
            temperatures: temperatureList,
            sailings: sailingList,
            totalContainers: matching.length,
        });
    } catch (err) {
        console.error("Booking options error:", err);
        const message = err instanceof Error ? err.message : "Failed to fetch options";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
