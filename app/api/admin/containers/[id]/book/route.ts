import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { containers, palletAllocations, adminNotifications, locations, documents } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { createMetaShipOrder, uploadMetaShipDocument, type MetaShipDocumentType } from "@/lib/metaship";
import { nanoid } from "nanoid";

/**
 * Create a MetaShip ORDER (not booking) for all allocations on this container,
 * then upload every client-submitted document to that order.
 *
 * Flow:
 *  1. POST /public/v2/order — returns { id, orderNo, systemReference }
 *  2. For each document on each allocation: fetch from Supabase public URL,
 *     convert to base64, POST /public/v2/order/document with orderId
 */
export async function POST(
    _request: NextRequest,
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
                { error: "Container already has a MetaShip order" },
                { status: 400 }
            );
        }

        // Get all CONFIRMED allocations for this container (never send PENDING/CANCELLED)
        const allocations = await db
            .select()
            .from(palletAllocations)
            .where(eq(palletAllocations.containerId, containerId));

        const confirmedAllocations = allocations.filter(a => a.status === "CONFIRMED");

        if (confirmedAllocations.length === 0) {
            return NextResponse.json(
                { error: "No confirmed allocations on this container. Approve pending requests first." },
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

        const originCountry = originCode.slice(0, 2);
        const destinationCountry = destinationCode.slice(0, 2);

        // Map each confirmed allocation to a product entry
        const products = confirmedAllocations.map((alloc) => ({
            productId: alloc.productId ? parseInt(alloc.productId, 10) : 0,
            nettWeight: alloc.nettWeight ? parseFloat(alloc.nettWeight) : 0,
            grossWeight: alloc.grossWeight ? parseFloat(alloc.grossWeight) : 0,
            pallets: alloc.palletCount,
            quantity: alloc.palletCount,
        }));

        // Container type code for MetaShip
        const containerTypeCode = container.type === "20FT" ? "20RE" : "40RE";

        // 1. CREATE ORDER
        const orderResult = await createMetaShipOrder({
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

        const { id: orderId, orderNo, systemReference } = orderResult.data;

        // Save MetaShip references immediately so we don't lose them if doc upload fails
        await db
            .update(containers)
            .set({
                metashipOrderNo: orderNo,
                metashipReference: systemReference,
                metashipOrderId: orderId,
                status: "BOOKED",
                updatedAt: new Date(),
            })
            .where(eq(containers.id, containerId));

        // 2. UPLOAD DOCUMENTS — collect documents from all confirmed allocations
        const allocIds = confirmedAllocations.map(a => a.id);
        const allDocs = allocIds.length > 0
            ? await db.select().from(documents).where(inArray(documents.allocationId, allocIds))
            : [];

        const docResults: Array<{ name: string; success: boolean; error?: string; metashipDocId?: string }> = [];

        for (const doc of allDocs) {
            try {
                if (!doc.url) {
                    docResults.push({ name: doc.originalName, success: false, error: "No storage URL" });
                    continue;
                }
                // Fetch file from Supabase (public URL)
                const fileRes = await fetch(doc.url);
                if (!fileRes.ok) {
                    docResults.push({ name: doc.originalName, success: false, error: `Failed to fetch from storage (${fileRes.status})` });
                    continue;
                }

                // Convert to base64
                const arrayBuffer = await fileRes.arrayBuffer();
                const base64 = Buffer.from(arrayBuffer).toString("base64");
                const mimeType = fileRes.headers.get("content-type") || guessMimeType(doc.originalName);

                // Map our document type to MetaShip's type
                const metashipType = mapDocType(doc.type);

                const uploadResult = await uploadMetaShipDocument({
                    file: base64,
                    name: doc.originalName,
                    mimeType,
                    type: metashipType,
                    orderId,
                });

                docResults.push({
                    name: doc.originalName,
                    success: true,
                    metashipDocId: uploadResult.result?.id,
                });
            } catch (err) {
                docResults.push({
                    name: doc.originalName,
                    success: false,
                    error: err instanceof Error ? err.message : "Upload failed",
                });
            }
        }

        const uploadedCount = docResults.filter(r => r.success).length;
        const failedCount = docResults.filter(r => !r.success).length;

        // Create admin notification
        await db.insert(adminNotifications).values({
            id: `NTF-${nanoid(10)}`,
            type: "BOOKING_CREATED",
            title: "MetaShip Order Created",
            message: `Order #${orderNo} created for ${container.route}. ${uploadedCount}/${allDocs.length} documents uploaded${failedCount > 0 ? ` (${failedCount} failed)` : ""}.`,
            containerId,
            isRead: false,
        });

        return NextResponse.json({
            success: true,
            orderId,
            orderNo,
            systemReference,
            documents: {
                total: allDocs.length,
                uploaded: uploadedCount,
                failed: failedCount,
                results: docResults,
            },
        });
    } catch (error: unknown) {
        console.error("Admin create MetaShip order error:", error);
        const message =
            error instanceof Error
                ? error.message
                : "Failed to create MetaShip order";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

function mapDocType(ourType: string): MetaShipDocumentType {
    switch (ourType) {
        case "INVOICE": return "COMMERCIAL_INVOICE";
        case "BOL": return "SHIPMENT_DOCUMENT";
        case "COA": return "SHIPMENT_DOCUMENT";
        case "PACKING_LIST": return "PACKING_LIST";
        default: return "SHIPMENT_DOCUMENT";
    }
}

function guessMimeType(filename: string): string {
    const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
    switch (ext) {
        case ".pdf": return "application/pdf";
        case ".jpg":
        case ".jpeg": return "image/jpeg";
        case ".png": return "image/png";
        case ".webp": return "image/webp";
        case ".doc": return "application/msword";
        case ".docx": return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        case ".xls": return "application/vnd.ms-excel";
        case ".xlsx": return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        default: return "application/octet-stream";
    }
}
