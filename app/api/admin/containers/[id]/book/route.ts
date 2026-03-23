import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { containers, palletAllocations, adminNotifications, locations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createMetaShipBooking } from "@/lib/metaship";
import { nanoid } from "nanoid";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const { id: containerId } = await params;

        // Get container
        const [container] = await db
            .select()
            .from(containers)
            .where(eq(containers.id, containerId))
            .limit(1);

        if (!container) {
            return NextResponse.json({ error: "Container not found" }, { status: 404 });
        }

        if (container.metashipOrderNo) {
            return NextResponse.json(
                { error: "Container already booked in MetaShip" },
                { status: 400 }
            );
        }

        // Get all allocations for this container
        const allocations = await db
            .select()
            .from(palletAllocations)
            .where(eq(palletAllocations.containerId, containerId));

        if (allocations.length === 0) {
            return NextResponse.json(
                { error: "No allocations found for this container" },
                { status: 400 }
            );
        }

        // Extract origin/destination UN/LOCODE from route (e.g. "ZACPT-NLRTM")
        const [originCode, destinationCode] = container.route.split("-");

        // Resolve location names from DB
        const [originLoc] = await db
            .select({ name: locations.name, country: locations.country })
            .from(locations)
            .where(eq(locations.code, originCode))
            .limit(1);

        const [destLoc] = await db
            .select({ name: locations.name, country: locations.country })
            .from(locations)
            .where(eq(locations.code, destinationCode))
            .limit(1);

        // Derive ISO 2-letter country codes from UN/LOCODE (first 2 chars)
        const originCountry = originCode.slice(0, 2);
        const destinationCountry = destinationCode.slice(0, 2);

        // Map each allocation to a product entry in the MetaShip container
        const products = allocations.map((alloc) => ({
            productId: alloc.productId ? parseInt(alloc.productId, 10) : 0,
            nettWeight: alloc.nettWeight ? parseFloat(alloc.nettWeight) : 0,
            grossWeight: alloc.grossWeight ? parseFloat(alloc.grossWeight) : 0,
            pallets: alloc.palletCount,
            quantity: alloc.palletCount,
        }));

        // Determine container type code for MetaShip
        const containerTypeCode = container.type === "20FT" ? "20RE" : "40RE";

        // Create MetaShip booking
        const result = await createMetaShipBooking({
            portOfLoadValue: originCode,
            portOfLoadCity: originLoc?.name || originCode,
            portOfDischargeValue: destinationCode,
            portOfDischargeCity: destLoc?.name || destinationCode,
            finalDestinationValue: destinationCode,
            finalDestinationCity: destLoc?.name || destinationCode,
            originCountry,
            destinationCountry,
            etd: container.etd?.toISOString() || new Date().toISOString(),
            eta: container.eta?.toISOString() || "",
            voyageNumber: container.voyageNumber || "",
            containers: [
                {
                    containerTypeCode,
                    products,
                },
            ],
        });

        // Update container with MetaShip reference
        await db
            .update(containers)
            .set({
                metashipOrderNo: result.data.orderNo,
                metashipReference: result.data.systemReference,
                status: "BOOKED",
                updatedAt: new Date(),
            })
            .where(eq(containers.id, containerId));

        // Update all allocations to CONFIRMED
        await db
            .update(palletAllocations)
            .set({ status: "CONFIRMED", updatedAt: new Date() })
            .where(eq(palletAllocations.containerId, containerId));

        // Create notification
        await db.insert(adminNotifications).values({
            id: `NTF-${nanoid(10)}`,
            type: "BOOKING_CREATED",
            title: "MetaShip Booking Created",
            message: `Booking created for ${container.route} — Order #${result.data.orderNo}. Log in to MetaShip to confirm.`,
            containerId,
            isRead: false,
        });

        return NextResponse.json({
            success: true,
            orderNo: result.data.orderNo,
            systemReference: result.data.systemReference,
        });
    } catch (error: unknown) {
        console.error("Admin create MetaShip booking error:", error);
        const message =
            error instanceof Error
                ? error.message
                : "Failed to create MetaShip booking";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
