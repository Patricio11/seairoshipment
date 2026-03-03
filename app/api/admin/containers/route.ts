import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { containers, palletAllocations, user } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

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
