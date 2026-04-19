import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { containers, palletAllocations, user, containerTypes, sailings, productCategories } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { nanoid } from "nanoid";

type Temperature = "frozen" | "chilled" | "ambient";

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
        } = body;

        if (!route || !containerTypeId || !sailingId || !categoryId || !temperature) {
            return NextResponse.json(
                { error: "Route, container type, sailing, category, and temperature are all required" },
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

        // Validate temperature matches container type (reefer → frozen|chilled, dry → ambient)
        const containerTypeTemps: Record<string, Temperature[]> = {
            REEFER: ["frozen", "chilled"],
            DRY: ["ambient"],
        };
        const containerTypeAllowed = containerTypeTemps[ct.type] || [];
        if (!containerTypeAllowed.includes(temperature as Temperature)) {
            return NextResponse.json(
                { error: `Temperature "${temperature}" is not valid for a ${ct.type} container. Allowed: ${containerTypeAllowed.join(", ")}` },
                { status: 400 }
            );
        }

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
        if (category.salesRateTypeId !== derivedSalesRateTypeId) {
            return NextResponse.json(
                { error: `Category is for ${category.salesRateTypeId.toUpperCase()} but this container type is ${derivedSalesRateTypeId.toUpperCase()}` },
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
                temperature: temperature as Temperature,
                etd: sailing.etd,
                eta: sailing.eta,
                totalPallets: 0,
                maxCapacity: ct.maxPallets,
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
