import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { containers, palletAllocations, user, containerTypes, sailings, productCategories } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { isRoadRoute, ROAD_TRUCK_MAX_PALLETS } from "@/lib/road";

type Temperature = "frozen" | "cool" | "chilled" | "ambient";
const ALL_TEMPS: Temperature[] = ["frozen", "cool", "chilled", "ambient"];

export async function GET() {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        // Get all containers with joined container type / category / sailing for display
        const allContainers = await db
            .select({
                container: containers,
                containerTypeName: containerTypes.displayName,
                categoryName: productCategories.name,
                sailingVessel: sailings.vesselName,
                sailingVoyage: sailings.voyageNumber,
            })
            .from(containers)
            .leftJoin(containerTypes, eq(containers.containerTypeId, containerTypes.id))
            .leftJoin(productCategories, eq(containers.categoryId, productCategories.id))
            .leftJoin(sailings, eq(containers.sailingId, sailings.id))
            .orderBy(desc(containers.createdAt));

        const containersWithAllocations = await Promise.all(
            allContainers.map(async ({ container, containerTypeName, categoryName, sailingVessel, sailingVoyage }) => {
                const allocations = await db
                    .select({
                        allocation: palletAllocations,
                        userName: user.name,
                        userEmail: user.email,
                        accountNumber: user.accountNumber,
                    })
                    .from(palletAllocations)
                    .leftJoin(user, eq(palletAllocations.userId, user.id))
                    .where(eq(palletAllocations.containerId, container.id));

                return {
                    ...container,
                    containerTypeName,
                    categoryName,
                    sailingVessel,
                    sailingVoyage,
                    allocations,
                };
            })
        );

        return NextResponse.json(containersWithAllocations);
    } catch (error: unknown) {
        console.error("Get containers error:", error);
        const message = error instanceof Error ? error.message : "Failed to fetch containers";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const body = await request.json();
        const {
            route,
            containerTypeId,
            sailingId,
            categoryId,
            temperature,
            salesRateTypeId,
            cargoType: cargoTypeRaw,
            transportMode,
            truckName,
            fileNumber,
            departureDate,
            arrivalDate,
            maxCapacity: maxCapacityRaw,
        } = body;

        // ── ROAD branch: a refrigerated truck. No container type, no sailing —
        // route is one of the fixed road corridors, `vessel` holds the
        // transporter/truck name, etd/eta are the departure/arrival dates.
        if (transportMode === "ROAD") {
            if (!route || !isRoadRoute(route)) {
                return NextResponse.json({ error: "Pick a valid road route corridor" }, { status: 400 });
            }
            if (!truckName?.trim()) {
                return NextResponse.json({ error: "Transporter / truck name is required" }, { status: 400 });
            }
            if (!categoryId) {
                return NextResponse.json({ error: "Select a category" }, { status: 400 });
            }
            // Trucks are always refrigerated — a temperature regime is required.
            if (!temperature || !ALL_TEMPS.includes(temperature as Temperature)) {
                return NextResponse.json(
                    { error: `Pick a temperature for this truck (${ALL_TEMPS.join(", ")}).` },
                    { status: 400 }
                );
            }

            const [category] = await db
                .select()
                .from(productCategories)
                .where(eq(productCategories.id, categoryId))
                .limit(1);
            if (!category) return NextResponse.json({ error: "Invalid category" }, { status: 400 });
            if (!category.active) return NextResponse.json({ error: "Category is inactive" }, { status: 400 });
            if (category.salesRateTypeId !== "srs") {
                return NextResponse.json(
                    { error: "Road trucks are refrigerated — pick an SRS (reefer) category" },
                    { status: 400 }
                );
            }
            const categoryAllowed = (category.allowedTemperatures as Temperature[]) || [];
            if (!categoryAllowed.includes(temperature as Temperature)) {
                return NextResponse.json(
                    { error: `Temperature "${temperature}" is not allowed for this category. Allowed: ${categoryAllowed.join(", ")}` },
                    { status: 400 }
                );
            }

            const maxCapacity = Number(maxCapacityRaw) > 0 ? Math.floor(Number(maxCapacityRaw)) : ROAD_TRUCK_MAX_PALLETS;

            const [newTruck] = await db
                .insert(containers)
                .values({
                    id: `TRK-${nanoid(10)}`,
                    transportMode: "ROAD",
                    fileNumber: fileNumber?.trim() || null,
                    route,
                    vessel: truckName.trim(),
                    voyageNumber: null,
                    type: "40FT", // trailer size — column is NOT NULL; not used by road flows
                    categoryId: category.id,
                    temperature: temperature as Temperature,
                    etd: departureDate ? new Date(departureDate) : null,
                    eta: arrivalDate ? new Date(arrivalDate) : null,
                    totalPallets: 0,
                    maxCapacity,
                    cargoType: "PALLET",
                    totalCBM: "0",
                    status: "OPEN",
                    salesRateTypeId: "srs",
                })
                .returning();

            return NextResponse.json(newTruck, { status: 201 });
        }

        // ── SEA branch (existing behaviour, unchanged) ──
        // Temperature is required for REEFER containers but must be null for
        // DRY (SCS) - see SCS_SRS_RULES.md. Validate after we've looked up the
        // container type below, since the rule depends on it.
        if (!route || !containerTypeId || !sailingId || !categoryId) {
            return NextResponse.json(
                { error: "Route, container type, sailing, and category are all required" },
                { status: 400 }
            );
        }

        // Validate container type
        const [ct] = await db
            .select()
            .from(containerTypes)
            .where(eq(containerTypes.id, containerTypeId))
            .limit(1);
        if (!ct) {
            return NextResponse.json({ error: "Invalid container type" }, { status: 400 });
        }

        // Temperature regime is tied to container type:
        //   - REEFER: must pick one of frozen / chilled / ambient
        //   - DRY:    must be null (the "Dry - no temperature regime" sentinel)
        const effectiveTemperature: Temperature | null = ct.type === "DRY"
            ? null
            : (temperature as Temperature | null);

        if (ct.type === "REEFER") {
            const allowed: Temperature[] = ["frozen", "cool", "chilled", "ambient"];
            if (!effectiveTemperature || !allowed.includes(effectiveTemperature)) {
                return NextResponse.json(
                    { error: `Pick a temperature for this reefer container (${allowed.join(", ")}).` },
                    { status: 400 }
                );
            }
        }
        // DRY containers ignore any client-supplied temperature value; we
        // overwrite to null below regardless.

        // Validate category exists, is active, and matches service type + allowed temps
        const [category] = await db
            .select()
            .from(productCategories)
            .where(eq(productCategories.id, categoryId))
            .limit(1);
        if (!category) {
            return NextResponse.json({ error: "Invalid category" }, { status: 400 });
        }
        if (!category.active) {
            return NextResponse.json({ error: "Category is inactive" }, { status: 400 });
        }

        const derivedSalesRateTypeId = salesRateTypeId || (ct.type === "DRY" ? "scs" : "srs");

        // Cargo type lock: SRS (reefer) is always PALLET. SCS (dry) honours the request.
        const cargoType: "PALLET" | "CUBE" = derivedSalesRateTypeId === "srs"
            ? "PALLET"
            : (cargoTypeRaw === "CUBE" ? "CUBE" : "PALLET");

        if (category.salesRateTypeId !== derivedSalesRateTypeId) {
            return NextResponse.json(
                { error: `Category is for ${category.salesRateTypeId.toUpperCase()} but this container type is ${derivedSalesRateTypeId.toUpperCase()}` },
                { status: 400 }
            );
        }

        // SCS categories carry allowedTemperatures: [] - nothing to check
        // (the container is DRY with null temperature). REEFER categories
        // must list the chosen temperature.
        const categoryAllowed = (category.allowedTemperatures as Temperature[]) || [];
        if (ct.type === "REEFER" && effectiveTemperature && !categoryAllowed.includes(effectiveTemperature)) {
            return NextResponse.json(
                { error: `Temperature "${effectiveTemperature}" is not allowed for this category. Allowed: ${categoryAllowed.join(", ")}` },
                { status: 400 }
            );
        }

        // Validate sailing exists and matches the route
        const [sailing] = await db
            .select()
            .from(sailings)
            .where(eq(sailings.id, sailingId))
            .limit(1);
        if (!sailing) {
            return NextResponse.json({ error: "Invalid sailing" }, { status: 400 });
        }
        const [originCode, destCode] = route.split("-");
        if (sailing.portOfLoadValue !== originCode || sailing.portOfDischargeValue !== destCode) {
            return NextResponse.json(
                { error: `Sailing route (${sailing.portOfLoadValue}→${sailing.portOfDischargeValue}) does not match container route (${originCode}→${destCode})` },
                { status: 400 }
            );
        }

        const sizeEnum = ct.size as "20FT" | "40FT";
        const id = `CNT-${nanoid(10)}`;

        const [newContainer] = await db
            .insert(containers)
            .values({
                id,
                route,
                vessel: sailing.vesselName,
                voyageNumber: sailing.voyageNumber || null,
                sailingScheduleId: sailing.metashipId,
                sailingId: sailing.id,
                type: sizeEnum,
                containerTypeId,
                categoryId: category.id,
                temperature: effectiveTemperature,
                etd: sailing.etd,
                eta: sailing.eta,
                totalPallets: 0,
                maxCapacity: ct.maxPallets,
                cargoType,
                totalCBM: "0",
                maxCapacityCBM: ct.volumeCBM ?? null,
                status: "OPEN",
                salesRateTypeId: derivedSalesRateTypeId,
            })
            .returning();

        return NextResponse.json(newContainer, { status: 201 });
    } catch (error: unknown) {
        console.error("Create container error:", error);
        const message = error instanceof Error ? error.message : "Failed to create container";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
