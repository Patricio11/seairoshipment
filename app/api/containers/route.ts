import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { containers, products, productCategories, sailings } from "@/lib/db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";

/**
 * Client-facing list of bookable containers.
 *
 * When a productId is supplied, we resolve its category server-side and match
 * containers on `categoryId` (the consolidation unit).
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
        if (productId) {
            const [p] = await db
                .select({ categoryId: products.categoryId })
                .from(products)
                .where(eq(products.id, productId))
                .limit(1);
            resolvedCategoryId = p?.categoryId || null;
            // If the product has no category → no containers match it
            if (!resolvedCategoryId) return NextResponse.json([]);
        }

        const conditions = [
            eq(containers.route, route),
            eq(containers.salesRateTypeId, salesRateTypeId),
            inArray(containers.status, ["OPEN", "THRESHOLD_REACHED"]),
            sql`${containers.maxCapacity} - ${containers.totalPallets} >= 1`,
        ];
        if (resolvedCategoryId) conditions.push(eq(containers.categoryId, resolvedCategoryId));
        if (temperature) conditions.push(eq(containers.temperature, temperature as "frozen" | "chilled" | "ambient"));
        if (sailingId) conditions.push(eq(containers.sailingId, sailingId));

        const rows = await db
            .select({
                container: containers,
                categoryName: productCategories.name,
                sailingVessel: sailings.vesselName,
                sailingVoyage: sailings.voyageNumber,
            })
            .from(containers)
            .leftJoin(productCategories, eq(containers.categoryId, productCategories.id))
            .leftJoin(sailings, eq(containers.sailingId, sailings.id))
            .where(and(...conditions));

        const slots = rows.map(({ container: c, categoryName, sailingVessel, sailingVoyage }) => ({
            id: c.id,
            vessel: sailingVessel || c.vessel,
            voyageNumber: sailingVoyage || c.voyageNumber,
            preFilled: c.totalPallets,
            maxCapacity: c.maxCapacity,
            date: c.etd
                ? new Date(c.etd).toLocaleDateString("en-US", { month: "short", day: "2-digit" })
                : "TBD",
            type: c.type as "20FT" | "40FT",
            temperature: c.temperature,
            categoryName,
            // Keep productName in the shape for backwards compat with existing UI;
            // will be replaced by categoryName on the frontend next.
            productName: categoryName,
        }));

        return NextResponse.json(slots);
    } catch (error: unknown) {
        console.error("Get containers error:", error);
        const message = error instanceof Error ? error.message : "Failed to fetch containers";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
