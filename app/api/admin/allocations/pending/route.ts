import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { palletAllocations, containers, user as userTable, invoices } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

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
                    maxCapacity: containers.maxCapacity,
                    totalPallets: containers.totalPallets,
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
            .where(eq(palletAllocations.status, "PENDING"))
            .orderBy(desc(palletAllocations.createdAt));

        // For each allocation, check if deposit invoice is paid
        const enriched = await Promise.all(
            results.map(async (r) => {
                const invoiceList = await db
                    .select()
                    .from(invoices)
                    .where(
                        and(
                            eq(invoices.allocationId, r.allocation.id),
                            eq(invoices.type, "DEPOSIT")
                        )
                    )
                    .limit(1);
                const depositInvoice = invoiceList[0];
                return {
                    ...r,
                    depositStatus: depositInvoice?.status || "PENDING",
                    depositInvoiceId: depositInvoice?.id || null,
                };
            })
        );

        return NextResponse.json(enriched);
    } catch (err) {
        console.error("List pending allocations error:", err);
        const message = err instanceof Error ? err.message : "Failed to fetch pending allocations";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
