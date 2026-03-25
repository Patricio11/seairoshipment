import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { containers, palletAllocations, adminNotifications, invoices } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { calculateQuote } from "@/lib/rates";

function deriveBookingStatus(
    allocationStatus: string,
    containerStatus: string,
    depositInvoiceStatus: string | null
): "PENDING" | "DEPOSIT_PAID" | "CONFIRMED" | "SAILING" | "DELIVERED" | "CANCELLED" {
    if (allocationStatus === "CANCELLED") return "CANCELLED";
    if (containerStatus === "DELIVERED") return "DELIVERED";
    if (containerStatus === "SAILING") return "SAILING";
    if (allocationStatus === "CONFIRMED") return "CONFIRMED";
    if (depositInvoiceStatus === "PAID") return "DEPOSIT_PAID";
    return "PENDING";
}

export async function GET() {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get all allocations for this user with container data
        const allocations = await db
            .select({
                allocation: palletAllocations,
                container: containers,
            })
            .from(palletAllocations)
            .innerJoin(containers, eq(palletAllocations.containerId, containers.id))
            .where(eq(palletAllocations.userId, session.user.id))
            .orderBy(desc(palletAllocations.createdAt));

        // Get all invoices for this user
        const userInvoices = await db
            .select()
            .from(invoices)
            .where(eq(invoices.userId, session.user.id));

        // Group invoices by allocationId
        const invoicesByAllocation = new Map<string, {
            bookingRef: string;
            routeLabel: string;
            deposit: typeof userInvoices[0] | null;
            balance: typeof userInvoices[0] | null;
        }>();

        for (const inv of userInvoices) {
            if (!inv.allocationId) continue;
            if (!invoicesByAllocation.has(inv.allocationId)) {
                invoicesByAllocation.set(inv.allocationId, {
                    bookingRef: inv.bookingRef,
                    routeLabel: inv.route,
                    deposit: null,
                    balance: null,
                });
            }
            const group = invoicesByAllocation.get(inv.allocationId)!;
            if (inv.type === "DEPOSIT") group.deposit = inv;
            else group.balance = inv;
        }

        // Shape the response
        const bookings = allocations.map(({ allocation, container }) => {
            const invGroup = invoicesByAllocation.get(allocation.id);
            return {
                id: allocation.id,
                bookingRef: invGroup?.bookingRef || "N/A",
                status: deriveBookingStatus(
                    allocation.status,
                    container.status,
                    invGroup?.deposit?.status || null
                ),
                palletCount: allocation.palletCount,
                commodityName: allocation.commodityName,
                temperature: allocation.temperature,
                consigneeName: allocation.consigneeName,
                consigneeAddress: allocation.consigneeAddress,
                vessel: container.vessel,
                voyageNumber: container.voyageNumber,
                route: container.route,
                routeLabel: invGroup?.routeLabel || container.route,
                containerType: container.type,
                etd: container.etd,
                eta: container.eta,
                containerStatus: container.status,
                depositStatus: invGroup?.deposit?.status || null,
                balanceStatus: invGroup?.balance?.status || null,
                depositAmount: invGroup?.deposit?.amountZAR || null,
                balanceAmount: invGroup?.balance?.amountZAR || null,
                totalAmount: invGroup?.deposit?.subtotalZAR || null,
                createdAt: allocation.createdAt,
            };
        });

        return NextResponse.json(bookings);
    } catch (error: unknown) {
        console.error("Fetch bookings error:", error);
        const message =
            error instanceof Error ? error.message : "Failed to fetch bookings";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const {
            origin,
            destination,
            sailingScheduleId,
            vessel,
            voyageNumber,
            etd,
            eta,
            palletCount,
            productId,
            commodityName,
            hsCode,
            nettWeight,
            grossWeight,
            temperature,
            consigneeName,
            consigneeAddress,
            containerId: requestedContainerId,
            poNumber,
            salesRateTypeId,
        } = body;

        if (!origin || !destination || !palletCount || palletCount < 5) {
            return NextResponse.json(
                { error: "Origin, destination, and minimum 5 pallets required" },
                { status: 400 }
            );
        }

        const route = `${origin}-${destination}`;

        // Find an existing OPEN container — only admins can create containers
        let containerId = requestedContainerId;
        let container;

        if (containerId) {
            const existing = await db
                .select()
                .from(containers)
                .where(eq(containers.id, containerId))
                .limit(1);
            container = existing[0];
        }

        if (!container) {
            // Find open container for same route, service type, and sailing
            const openContainers = await db
                .select()
                .from(containers)
                .where(
                    and(
                        eq(containers.route, route),
                        eq(containers.status, "OPEN"),
                        eq(containers.salesRateTypeId, salesRateTypeId || "srs"),
                        sailingScheduleId
                            ? eq(containers.sailingScheduleId, sailingScheduleId)
                            : undefined
                    )
                )
                .limit(1);

            if (openContainers.length > 0) {
                container = openContainers[0];
                containerId = container.id;
            } else {
                return NextResponse.json(
                    { error: "No containers are currently available for this route. Please contact us or check back later." },
                    { status: 404 }
                );
            }
        }

        // Check capacity
        const newTotal = container.totalPallets + palletCount;
        if (newTotal > container.maxCapacity) {
            return NextResponse.json(
                {
                    error: `Container only has ${container.maxCapacity - container.totalPallets} pallet spaces remaining`,
                },
                { status: 400 }
            );
        }

        // Create pallet allocation
        const allocationId = `ALC-${nanoid(10)}`;
        await db.insert(palletAllocations).values({
            id: allocationId,
            containerId: containerId!,
            userId: session.user.id,
            palletCount,
            productId: productId || null,
            commodityName: commodityName || null,
            hsCode: hsCode || null,
            nettWeight: nettWeight?.toString() || null,
            grossWeight: grossWeight?.toString() || null,
            temperature: temperature || null,
            consigneeName: consigneeName || null,
            consigneeAddress: consigneeAddress || null,
            salesRateTypeId: salesRateTypeId || "srs",
            status: "PENDING",
        });

        // Update container total pallets
        await db
            .update(containers)
            .set({
                totalPallets: newTotal,
                updatedAt: new Date(),
                status: newTotal >= 15 ? "THRESHOLD_REACHED" : "OPEN",
            })
            .where(eq(containers.id, containerId!));

        // If threshold reached (15 pallets), create admin notification
        if (newTotal >= 15 && container.totalPallets < 15) {
            await db.insert(adminNotifications).values({
                id: `NTF-${nanoid(10)}`,
                type: "CONTAINER_THRESHOLD",
                title: "Container Ready for Booking",
                message: `Container on route ${route} (${container.vessel}) has reached ${newTotal} pallets. Ready to create MetaShip booking.`,
                containerId: containerId!,
                isRead: false,
            });
        }

        // Generate booking reference
        const bookingRef = `SRS-${nanoid(6).toUpperCase()}`;

        // Generate invoices (60% deposit + 40% balance)
        const quote = await calculateQuote(origin, destination, palletCount, body.salesRateTypeId || "srs");
        const year = new Date().getFullYear();
        const routeLabel = `${quote.originName} → ${quote.destinationName}`;

        const depositId = `INV-${year}-${nanoid(6).toUpperCase()}`;
        const balanceId = `INV-${year}-${nanoid(6).toUpperCase()}`;

        const depositDue = new Date();
        depositDue.setDate(depositDue.getDate() + 7);

        const balanceDue = etd
            ? new Date(new Date(etd).getTime() - 7 * 24 * 60 * 60 * 1000)
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        await db.insert(invoices).values([
            {
                id: depositId,
                allocationId,
                userId: session.user.id,
                type: "DEPOSIT",
                status: "PENDING",
                bookingRef,
                route: routeLabel,
                palletCount,
                originChargesZAR: (quote.originPerPallet * palletCount).toFixed(2),
                oceanFreightZAR: (quote.oceanPerPallet * palletCount).toFixed(2),
                destinationChargesZAR: (quote.destinationPerPallet * palletCount).toFixed(2),
                subtotalZAR: quote.totalCost.toFixed(2),
                percentage: 60,
                amountZAR: quote.depositAmount.toFixed(2),
                poNumber: poNumber || null,
                dueDate: depositDue,
            },
            {
                id: balanceId,
                allocationId,
                userId: session.user.id,
                type: "BALANCE",
                status: "PENDING",
                bookingRef,
                route: routeLabel,
                palletCount,
                originChargesZAR: (quote.originPerPallet * palletCount).toFixed(2),
                oceanFreightZAR: (quote.oceanPerPallet * palletCount).toFixed(2),
                destinationChargesZAR: (quote.destinationPerPallet * palletCount).toFixed(2),
                subtotalZAR: quote.totalCost.toFixed(2),
                percentage: 40,
                amountZAR: quote.balanceAmount.toFixed(2),
                poNumber: poNumber || null,
                dueDate: balanceDue,
            },
        ]);

        return NextResponse.json({
            success: true,
            bookingReference: bookingRef,
            allocationId,
            containerId,
            totalPallets: newTotal,
            invoices: {
                deposit: { id: depositId, amount: quote.depositAmount },
                balance: { id: balanceId, amount: quote.balanceAmount },
            },
        });
    } catch (error: unknown) {
        console.error("Create booking error:", error);
        const message =
            error instanceof Error ? error.message : "Failed to create booking";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
