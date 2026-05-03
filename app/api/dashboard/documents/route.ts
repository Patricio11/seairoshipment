import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { palletAllocations, containers, invoices, documents } from "@/lib/db/schema";
import { and, desc, eq, inArray, or, sql } from "drizzle-orm";

function deriveBookingStatus(
    allocationStatus: string,
    containerStatus: string,
    depositInvoiceStatus: string | null,
): "PENDING" | "DEPOSIT_PAID" | "CONFIRMED" | "SAILING" | "DELIVERED" | "CANCELLED" {
    if (allocationStatus === "CANCELLED") return "CANCELLED";
    if (containerStatus === "DELIVERED") return "DELIVERED";
    if (containerStatus === "SAILING") return "SAILING";
    if (allocationStatus === "CONFIRMED") return "CONFIRMED";
    if (depositInvoiceStatus === "PAID") return "DEPOSIT_PAID";
    return "PENDING";
}

/**
 * Returns the user's allocations shaped as "shipments" for the documents
 * vault list, with a real document count per row. Doc count includes the
 * allocation's own uploads + any container-level shared MetaShip docs.
 */
export async function GET() {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const userId = session.user.id;

        const rows = await db
            .select({ allocation: palletAllocations, container: containers })
            .from(palletAllocations)
            .innerJoin(containers, eq(palletAllocations.containerId, containers.id))
            .where(eq(palletAllocations.userId, userId))
            .orderBy(desc(palletAllocations.createdAt));

        if (rows.length === 0) return NextResponse.json({ shipments: [] });

        // Bookings refs come off invoices; one query for all of them.
        const userInvoices = await db
            .select()
            .from(invoices)
            .where(eq(invoices.userId, userId));

        const invoiceByAllocation = new Map<string, { bookingRef: string; depositStatus: string | null }>();
        for (const inv of userInvoices) {
            if (!inv.allocationId) continue;
            const existing = invoiceByAllocation.get(inv.allocationId);
            if (!existing) {
                invoiceByAllocation.set(inv.allocationId, {
                    bookingRef: inv.bookingRef,
                    depositStatus: inv.type === "DEPOSIT" ? inv.status : null,
                });
            } else if (inv.type === "DEPOSIT") {
                existing.depositStatus = inv.status;
            }
        }

        // Count documents per allocation (own uploads + container-shared MetaShip docs).
        const allocationIds = rows.map(r => r.allocation.id);
        const containerIds = Array.from(new Set(rows.map(r => r.container.id)));

        const docRows = await db
            .select({
                id: documents.id,
                allocationId: documents.allocationId,
                containerId: documents.containerId,
                source: documents.source,
            })
            .from(documents)
            .where(
                or(
                    allocationIds.length > 0 ? inArray(documents.allocationId, allocationIds) : sql`false`,
                    containerIds.length > 0 ? and(
                        inArray(documents.containerId, containerIds),
                        eq(documents.source, "METASHIP_SHARED"),
                    ) : undefined,
                ),
            );

        const ownCountByAllocation = new Map<string, number>();
        const sharedCountByContainer = new Map<string, number>();
        for (const d of docRows) {
            if (d.allocationId) {
                ownCountByAllocation.set(d.allocationId, (ownCountByAllocation.get(d.allocationId) ?? 0) + 1);
            } else if (d.containerId && d.source === "METASHIP_SHARED") {
                sharedCountByContainer.set(d.containerId, (sharedCountByContainer.get(d.containerId) ?? 0) + 1);
            }
        }

        const shipments = rows.map(({ allocation, container }) => {
            const inv = invoiceByAllocation.get(allocation.id);
            const status = deriveBookingStatus(allocation.status, container.status, inv?.depositStatus ?? null);
            const ownCount = ownCountByAllocation.get(allocation.id) ?? 0;
            const sharedCount = sharedCountByContainer.get(container.id) ?? 0;
            return {
                allocationId: allocation.id,
                bookingRef: inv?.bookingRef ?? "—",
                status,
                route: container.route,
                vessel: container.vessel,
                voyageNumber: container.voyageNumber,
                etd: container.etd?.toISOString() ?? null,
                eta: container.eta?.toISOString() ?? null,
                createdAt: allocation.createdAt.toISOString(),
                docCount: ownCount + sharedCount,
            };
        });

        return NextResponse.json({ shipments });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load documents shipments";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
