import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { containers, palletAllocations, adminNotifications, invoices } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { calculateQuote } from "@/lib/rates";

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
        } = body;

        if (!origin || !destination || !palletCount || palletCount < 5) {
            return NextResponse.json(
                { error: "Origin, destination, and minimum 5 pallets required" },
                { status: 400 }
            );
        }

        const route = `${origin}-${destination}`;

        // Find an existing OPEN container for this route + sailing, or create one
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
            // Find open container for same route and sailing
            const openContainers = await db
                .select()
                .from(containers)
                .where(
                    and(
                        eq(containers.route, route),
                        eq(containers.status, "OPEN"),
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
                // Create new container
                containerId = `CNT-${nanoid(10)}`;
                const [newContainer] = await db
                    .insert(containers)
                    .values({
                        id: containerId,
                        route,
                        vessel: vessel || "TBD",
                        voyageNumber: voyageNumber || null,
                        sailingScheduleId: sailingScheduleId || null,
                        type: "40FT",
                        etd: etd ? new Date(etd) : null,
                        eta: eta ? new Date(eta) : null,
                        totalPallets: 0,
                        maxCapacity: 20,
                        status: "OPEN",
                    })
                    .returning();
                container = newContainer;
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
