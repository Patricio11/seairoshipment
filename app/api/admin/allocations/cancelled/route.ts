import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { palletAllocations, containers, user as userTable } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET() {
    try {
        const { error, roadOnly } = await requireStaff();
        if (error) return error;

        const results = await db
            .select({
                allocation: palletAllocations,
                container: {
                    id: containers.id,
                    route: containers.route,
                    vessel: containers.vessel,
                    etd: containers.etd,
                    status: containers.status,
                    salesRateTypeId: containers.salesRateTypeId,
                    transportMode: containers.transportMode,
                },
                user: {
                    id: userTable.id,
                    name: userTable.name,
                    email: userTable.email,
                    accountNumber: userTable.accountNumber,
                },
            })
            .from(palletAllocations)
            .leftJoin(containers, eq(palletAllocations.containerId, containers.id))
            .leftJoin(userTable, eq(palletAllocations.userId, userTable.id))
            .where(
                roadOnly
                    ? and(eq(palletAllocations.status, "CANCELLED"), eq(containers.transportMode, "ROAD"))
                    : eq(palletAllocations.status, "CANCELLED")
            )
            .orderBy(desc(palletAllocations.updatedAt));

        return NextResponse.json(results);
    } catch (err) {
        console.error("List cancelled allocations error:", err);
        const message = err instanceof Error ? err.message : "Failed to fetch cancelled allocations";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
