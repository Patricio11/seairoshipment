import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { containers, palletAllocations, products, productCategories } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { isRoadRoute } from "@/lib/road";

/**
 * Booking options for the Road Freight wizard - open trucks on a corridor
 * plus the products bookable on them (union of the trucks' categories).
 *
 * The wizard filters client-side: pick a product → temperature options narrow
 * to trucks in that product's category → pick the truck.
 *
 * Remaining capacity counts CONFIRMED pallets (container.totalPallets) plus
 * PENDING allocations so a live unapproved request can't be double-sold.
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const route = request.nextUrl.searchParams.get("route") || "";
        if (!isRoadRoute(route)) {
            return NextResponse.json({ error: "Pick a valid road route corridor" }, { status: 400 });
        }

        const trucks = await db
            .select({
                container: containers,
                categoryName: productCategories.name,
            })
            .from(containers)
            .leftJoin(productCategories, eq(containers.categoryId, productCategories.id))
            .where(and(
                eq(containers.transportMode, "ROAD"),
                eq(containers.route, route),
                eq(containers.status, "OPEN"),
            ));

        const truckIds = trucks.map(t => t.container.id);
        const pendingAllocs = truckIds.length > 0
            ? await db
                .select({ containerId: palletAllocations.containerId, palletCount: palletAllocations.palletCount })
                .from(palletAllocations)
                .where(and(
                    inArray(palletAllocations.containerId, truckIds),
                    eq(palletAllocations.status, "PENDING"),
                ))
            : [];
        const pendingByTruck = new Map<string, number>();
        for (const a of pendingAllocs) {
            pendingByTruck.set(a.containerId, (pendingByTruck.get(a.containerId) ?? 0) + (a.palletCount || 0));
        }

        const categoryIds = Array.from(new Set(trucks.map(t => t.container.categoryId).filter((c): c is string => !!c)));
        const productRows = categoryIds.length > 0
            ? await db
                .select({
                    id: products.id,
                    name: products.name,
                    hsCode: products.hsCode,
                    description: products.description,
                    categoryId: products.categoryId,
                })
                .from(products)
                .where(and(inArray(products.categoryId, categoryIds), eq(products.active, true)))
            : [];

        return NextResponse.json({
            trucks: trucks.map(({ container, categoryName }) => {
                const pending = pendingByTruck.get(container.id) ?? 0;
                const remaining = Math.max(0, container.maxCapacity - container.totalPallets - pending);
                return {
                    id: container.id,
                    name: container.vessel,
                    route: container.route,
                    temperature: container.temperature,
                    categoryId: container.categoryId,
                    categoryName,
                    departure: container.etd,
                    arrival: container.eta,
                    maxCapacity: container.maxCapacity,
                    remaining,
                };
            }).filter(t => t.remaining > 0),
            products: productRows,
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load road options";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
