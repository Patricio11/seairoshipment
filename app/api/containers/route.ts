import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { containers, products, sailings } from "@/lib/db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";

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

        const conditions = [
            eq(containers.route, route),
            eq(containers.salesRateTypeId, salesRateTypeId),
            inArray(containers.status, ["OPEN", "THRESHOLD_REACHED"]),
            sql`${containers.maxCapacity} - ${containers.totalPallets} >= 1`,
        ];
        if (productId) conditions.push(eq(containers.productId, productId));
        if (temperature) conditions.push(eq(containers.temperature, temperature as "frozen" | "chilled" | "ambient"));
        if (sailingId) conditions.push(eq(containers.sailingId, sailingId));

        // Join products + sailings so we can display their names on the client
        const rows = await db
            .select({
                container: containers,
                productName: products.name,
                sailingVessel: sailings.vesselName,
                sailingVoyage: sailings.voyageNumber,
            })
            .from(containers)
            .leftJoin(products, eq(containers.productId, products.id))
            .leftJoin(sailings, eq(containers.sailingId, sailings.id))
            .where(and(...conditions));

        // Map to ContainerSlot shape expected by the client booking UI
        const slots = rows.map(({ container: c, productName, sailingVessel, sailingVoyage }) => ({
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
            productName,
        }));

        return NextResponse.json(slots);
    } catch (error: unknown) {
        console.error("Get containers error:", error);
        const message =
            error instanceof Error ? error.message : "Failed to fetch containers";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
