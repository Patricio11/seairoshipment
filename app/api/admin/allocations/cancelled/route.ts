import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { palletAllocations, containers, user as userTable } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
    try {
        const { error } = await requireAdmin();
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
            .where(eq(palletAllocations.status, "CANCELLED"))
            .orderBy(desc(palletAllocations.updatedAt));

        return NextResponse.json(results);
    } catch (err) {
        console.error("List cancelled allocations error:", err);
        const message = err instanceof Error ? err.message : "Failed to fetch cancelled allocations";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
