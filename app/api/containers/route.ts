import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { containers } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

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

        // Get all OPEN containers for this route + service type with remaining capacity >= 5
        const openContainers = await db
            .select()
            .from(containers)
            .where(
                and(
                    eq(containers.route, route),
                    eq(containers.status, "OPEN"),
                    eq(containers.salesRateTypeId, salesRateTypeId),
                    sql`${containers.maxCapacity} - ${containers.totalPallets} >= 1`
                )
            );

        // Map to ContainerSlot shape expected by the client booking UI
        const slots = openContainers.map((c) => ({
            id: c.id,
            vessel: c.vessel,
            preFilled: c.totalPallets,
            maxCapacity: c.maxCapacity,
            date: c.etd
                ? new Date(c.etd).toLocaleDateString("en-US", { month: "short", day: "2-digit" })
                : "TBD",
            type: c.type as "20FT" | "40FT",
        }));

        return NextResponse.json(slots);
    } catch (error: unknown) {
        console.error("Get containers error:", error);
        const message =
            error instanceof Error ? error.message : "Failed to fetch containers";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
