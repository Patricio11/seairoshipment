import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { containerRequests, user as userTable, products, sailings } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

/**
 * Admin — list all container requests with user, product, sailing details.
 */
export async function GET() {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const rows = await db
            .select({
                request: containerRequests,
                user: {
                    id: userTable.id,
                    name: userTable.name,
                    email: userTable.email,
                    accountNumber: userTable.accountNumber,
                },
                product: {
                    id: products.id,
                    name: products.name,
                    hsCode: products.hsCode,
                },
                sailing: {
                    id: sailings.id,
                    vesselName: sailings.vesselName,
                    voyageNumber: sailings.voyageNumber,
                    etd: sailings.etd,
                    eta: sailings.eta,
                },
            })
            .from(containerRequests)
            .leftJoin(userTable, eq(containerRequests.userId, userTable.id))
            .leftJoin(products, eq(containerRequests.productId, products.id))
            .leftJoin(sailings, eq(containerRequests.sailingId, sailings.id))
            .orderBy(desc(containerRequests.createdAt));

        return NextResponse.json(rows);
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fetch container requests";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
