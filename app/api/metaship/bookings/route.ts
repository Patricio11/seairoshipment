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
            portOfLoadValue,
            portOfLoadCity,
            portOfDischargeValue,
            portOfDischargeCity,
            finalDestinationValue,
            finalDestinationCity,
            originCountry,
            destinationCountry,
            etd,
            eta,
            voyageNumber,
            containers,
        } = body;

        if (!portOfLoadValue || !portOfDischargeValue || !etd || !containers?.length) {
            return NextResponse.json(
                { error: "Missing required booking fields" },
                { status: 400 }
            );
        }

        const result = await createMetaShipBooking({
            portOfLoadValue,
            portOfLoadCity: portOfLoadCity || "",
            portOfDischargeValue,
            portOfDischargeCity: portOfDischargeCity || "",
            finalDestinationValue: finalDestinationValue || portOfDischargeValue,
            finalDestinationCity: finalDestinationCity || portOfDischargeCity || "",
            originCountry: originCountry || portOfLoadValue.slice(0, 2),
            destinationCountry: destinationCountry || portOfDischargeValue.slice(0, 2),
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
