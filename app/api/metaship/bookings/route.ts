import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { createMetaShipOrder, uploadMetaShipDocument } from "@/lib/metaship";
import type { MetaShipDocumentType } from "@/lib/metaship";

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
            documents,
        } = body;

        if (!portOfLoadValue || !portOfDischargeValue || !etd || !containers?.length) {
            return NextResponse.json(
                { error: "Missing required order fields" },
                { status: 400 }
            );
        }

        // Create order in MetaShip (instead of booking)
        const result = await createMetaShipOrder({
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

        // Upload documents to the order if any were provided
        const uploadedDocs: Array<{ name: string; success: boolean; error?: string }> = [];
        if (documents?.length && result.data?.id) {
            for (const doc of documents as Array<{ file: string; name: string; mimeType: string; type?: string }>) {
                try {
                    await uploadMetaShipDocument({
                        file: doc.file,
                        name: doc.name,
                        mimeType: doc.mimeType,
                        type: (doc.type as MetaShipDocumentType) || "SHIPMENT_DOCUMENT",
                        orderId: result.data.id,
                    });
                    uploadedDocs.push({ name: doc.name, success: true });
                } catch (err) {
                    uploadedDocs.push({
                        name: doc.name,
                        success: false,
                        error: err instanceof Error ? err.message : "Upload failed",
                    });
                }
            }
        }

        return NextResponse.json({ ...result, uploadedDocs });
    } catch (error: unknown) {
        console.error("MetaShip create order error:", error);
        const message =
            error instanceof Error ? error.message : "Failed to create MetaShip order";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
