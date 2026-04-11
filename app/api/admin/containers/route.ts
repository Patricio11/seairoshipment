import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { containers, palletAllocations, user, containerTypes } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function GET() {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        // Get all containers with their allocations + container type display name
        const allContainers = await db
            .select({
                container: containers,
                containerTypeName: containerTypes.displayName,
            })
            .from(containers)
            .leftJoin(containerTypes, eq(containers.containerTypeId, containerTypes.id))
            .orderBy(desc(containers.createdAt));

        // For each container, get allocations with user info
        const containersWithAllocations = await Promise.all(
            allContainers.map(async ({ container, containerTypeName }) => {
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
                    allocations,
                };
            })
        );

        return NextResponse.json(containersWithAllocations);
    } catch (error: unknown) {
        console.error("Get containers error:", error);
        const message =
            error instanceof Error ? error.message : "Failed to fetch containers";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const body = await request.json();
        const { route, vessel, voyageNumber, sailingScheduleId, containerTypeId, etd, eta, salesRateTypeId } = body;

        if (!route || !vessel || !containerTypeId) {
            return NextResponse.json(
                { error: "Route, vessel, and container type are required" },
                { status: 400 }
            );
        }

        // Look up the container type to get size + maxPallets + reefer/dry
        const [ct] = await db
            .select()
            .from(containerTypes)
            .where(eq(containerTypes.id, containerTypeId))
            .limit(1);

        if (!ct) {
            return NextResponse.json({ error: "Invalid container type" }, { status: 400 });
        }

        // Derive salesRateTypeId from container type: REEFER → srs, DRY → scs
        const derivedSalesRateTypeId = salesRateTypeId || (ct.type === "DRY" ? "scs" : "srs");
        const sizeEnum = ct.size as "20FT" | "40FT";

        const id = `CNT-${nanoid(10)}`;

        const [newContainer] = await db
            .insert(containers)
            .values({
                id,
                route,
                vessel,
                voyageNumber: voyageNumber || null,
                sailingScheduleId: sailingScheduleId || null,
                type: sizeEnum,
                containerTypeId,
                etd: etd ? new Date(etd) : null,
                eta: eta ? new Date(eta) : null,
                totalPallets: 0,
                maxCapacity: ct.maxPallets,
                status: "OPEN",
                salesRateTypeId: derivedSalesRateTypeId,
            })
            .returning();

        return NextResponse.json(newContainer, { status: 201 });
    } catch (error: unknown) {
        console.error("Create container error:", error);
        const message =
            error instanceof Error ? error.message : "Failed to create container";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
