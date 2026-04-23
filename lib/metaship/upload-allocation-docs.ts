import { db } from "@/lib/db";
import { documents, palletAllocations } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { uploadMetaShipDocument, type MetaShipDocumentType } from "@/lib/metaship";

export interface DocUploadResult {
    name: string;
    success: boolean;
    error?: string;
    metashipDocId?: string;
}

export interface UploadSummary {
    total: number;
    uploaded: number;
    failed: number;
    results: DocUploadResult[];
}

/**
 * Push every CLIENT_UPLOAD document tied to the container's confirmed allocations
 * to an existing MetaShip order. Idempotent at the MetaShip layer (each call
 * creates a fresh MetaShip-side document); use only when the admin explicitly
 * asks for a retry.
 *
 * METASHIP_CLIENT / METASHIP_SHARED docs are skipped — those originated from
 * MetaShip via the docs-sync pipeline, re-uploading them would duplicate.
 */
export async function uploadAllocationDocsToMetaShip(params: {
    containerId: string;
    metashipOrderId: number;
}): Promise<UploadSummary> {
    const { containerId, metashipOrderId } = params;

    // Which allocations are CONFIRMED on this container
    const allocations = await db
        .select({ id: palletAllocations.id })
        .from(palletAllocations)
        .where(and(
            eq(palletAllocations.containerId, containerId),
            eq(palletAllocations.status, "CONFIRMED"),
        ));

    const allocIds = allocations.map(a => a.id);
    if (allocIds.length === 0) {
        console.log(`[metaship upload] container ${containerId} has 0 confirmed allocations — nothing to upload`);
        return { total: 0, uploaded: 0, failed: 0, results: [] };
    }

    const allDocs = await db
        .select()
        .from(documents)
        .where(and(
            inArray(documents.allocationId, allocIds),
            eq(documents.source, "CLIENT_UPLOAD"),
        ));

    console.log(`[metaship upload] container ${containerId} order ${metashipOrderId}: ${allDocs.length} CLIENT_UPLOAD doc(s) across ${allocIds.length} confirmed allocation(s)`);
    if (allDocs.length === 0) {
        console.log("[metaship upload] nothing to push — confirm allocations have client-uploaded documents before retrying");
    }

    const results: DocUploadResult[] = [];

    for (const doc of allDocs) {
        try {
            if (!doc.url) {
                results.push({ name: doc.originalName, success: false, error: "No storage URL" });
                console.warn(`[metaship upload] doc ${doc.id} "${doc.originalName}" has no storage URL — skipping`);
                continue;
            }
            const fileRes = await fetch(doc.url);
            if (!fileRes.ok) {
                results.push({ name: doc.originalName, success: false, error: `Failed to fetch from storage (${fileRes.status})` });
                console.warn(`[metaship upload] doc ${doc.id} fetch failed (${fileRes.status})`);
                continue;
            }

            const arrayBuffer = await fileRes.arrayBuffer();
            const base64 = Buffer.from(arrayBuffer).toString("base64");
            const mimeType = fileRes.headers.get("content-type") || guessMimeType(doc.originalName);
            const metashipType = mapDocType(doc.type);

            const uploadResult = await uploadMetaShipDocument({
                file: base64,
                name: doc.originalName,
                mimeType,
                type: metashipType,
                orderId: metashipOrderId,
            });

            results.push({
                name: doc.originalName,
                success: true,
                metashipDocId: uploadResult.result?.id,
            });
            console.log(`[metaship upload] uploaded "${doc.originalName}" → MetaShip id ${uploadResult.result?.id}`);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Upload failed";
            results.push({ name: doc.originalName, success: false, error: message });
            console.warn(`[metaship upload] doc ${doc.id} "${doc.originalName}" upload failed: ${message}`);
        }
    }

    const uploaded = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return { total: results.length, uploaded, failed, results };
}

export function mapDocType(ourType: string): MetaShipDocumentType {
    switch (ourType) {
        case "INVOICE": return "COMMERCIAL_INVOICE";
        case "BOL": return "SHIPMENT_DOCUMENT";
        case "COA": return "SHIPMENT_DOCUMENT";
        case "PACKING_LIST": return "PACKING_LIST";
        default: return "SHIPMENT_DOCUMENT";
    }
}

export function guessMimeType(filename: string): string {
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
