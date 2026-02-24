import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { createMetaShipBooking } from "@/lib/metaship";

export async function POST(request: NextRequest) {
    try {
        // Admin-only
        const session = await getSession();
        if (!session || session.user.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const body = await request.json();
        const {
            originPort,
            destinationPort,
            finalDestinationCity,
            etd,
            eta,
            voyageNumber,
            containers,
        } = body;

        if (!originPort || !destinationPort || !etd || !containers?.length) {
            return NextResponse.json(
                { error: "Missing required booking fields" },
                { status: 400 }
            );
        }

        const result = await createMetaShipBooking({
            originPort,
            destinationPort,
            finalDestinationCity: finalDestinationCity || "",
            etd,
            eta: eta || "",
            voyageNumber: voyageNumber || "",
            containers,
        });

        return NextResponse.json(result);
    } catch (error: unknown) {
        console.error("MetaShip create booking error:", error);
        const message =
            error instanceof Error ? error.message : "Failed to create MetaShip booking";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
