import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { containers, products, sailings, productCategories } from "@/lib/db/schema";
import { eq, and, inArray, sql } from "drizzle-orm";

/**
 * Returns cascading options for a booking.
 * Only values that have at least one OPEN / THRESHOLD_REACHED container
 * matching all prior selections are returned.
 *
 * Query params:
 *   - route (required)            e.g. "ZACPT-NLRTM"
 *   - salesRateTypeId (required)  e.g. "srs" | "scs"
 *   - productId (optional)        narrows temperatures + sailings (via category)
 *   - temperature (optional)      narrows sailings
 *
 * Response:
 *   {
 *     products: [{ id, name, hsCode, category, categoryId, categoryName }],
 *     temperatures: ["frozen" | "chilled" | "ambient"],
 *     sailings: [{ id, vesselName, voyageNumber, etd, eta, transitTime, serviceType }],
 *     totalContainers
 *   }
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
            sql`${containers.maxCapacity} - ${containers.totalPallets} >= 1`,
        );

        const matching = await db.select().from(containers).where(openFilter);

        // Gather distinct categoryIds present in matching containers
        const categoryIds = Array.from(new Set(matching.map(c => c.categoryId).filter(Boolean))) as string[];

        // Look up the categories + all active products assigned to them
        const categoryRows = categoryIds.length > 0
            ? await db.select().from(productCategories).where(inArray(productCategories.id, categoryIds))
            : [];
        const categoryMap = new Map(categoryRows.map(c => [c.id, c]));

        const productRows = categoryIds.length > 0
            ? await db.select().from(products).where(
                and(
                    inArray(products.categoryId, categoryIds),
                    eq(products.active, true),
                )
            )
            : [];

        const productList = productRows
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(p => ({
                id: p.id,
                name: p.name,
                hsCode: p.hsCode,
                category: p.category,
                categoryId: p.categoryId,
                categoryName: p.categoryId ? categoryMap.get(p.categoryId)?.name || null : null,
            }));

        // Narrow containers by product's category if productId provided
        let productCategoryId: string | null = null;
        if (productId) {
            const [p] = await db
                .select({ categoryId: products.categoryId })
                .from(products)
                .where(eq(products.id, productId))
                .limit(1);
            productCategoryId = p?.categoryId || null;
        }

        const afterProduct = productCategoryId
            ? matching.filter(c => c.categoryId === productCategoryId)
            : matching;

        const tempSet = new Set(afterProduct.map(c => c.temperature).filter(Boolean));
        const temperatureList = Array.from(tempSet) as Array<"frozen" | "chilled" | "ambient">;

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
