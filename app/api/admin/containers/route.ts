import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { containers, palletAllocations, user } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function GET() {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        // Get all containers with their allocations
        const allContainers = await db
            .select()
            .from(containers)
            .orderBy(desc(containers.createdAt));

        // For each container, get allocations with user info
        const containersWithAllocations = await Promise.all(
            allContainers.map(async (container) => {
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
        const { route, vessel, voyageNumber, sailingScheduleId, type, etd, eta, maxCapacity, salesRateTypeId } = body;

        if (!route || !vessel || !type) {
            return NextResponse.json(
                { error: "Route, vessel, and container type are required" },
                { status: 400 }
            );
        }

        if (!["20FT", "40FT"].includes(type)) {
            return NextResponse.json(
                { error: "Container type must be 20FT or 40FT" },
                { status: 400 }
            );
        }

        const id = `CNT-${nanoid(10)}`;
        const capacity = maxCapacity || (type === "20FT" ? 10 : 20);

        const [newContainer] = await db
            .insert(containers)
            .values({
                id,
                route,
                vessel,
                voyageNumber: voyageNumber || null,
                sailingScheduleId: sailingScheduleId || null,
                type,
                etd: etd ? new Date(etd) : null,
                eta: eta ? new Date(eta) : null,
                totalPallets: 0,
                maxCapacity: capacity,
                status: "OPEN",
                salesRateTypeId: salesRateTypeId || "srs",
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
