import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { containers, palletAllocations, documents, user as userTable } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getMetaShipShipmentDocuments } from "@/lib/metaship";

/**
 * Admin-triggered sync of finalised MetaShip documents for a container.
 *
 * Flow:
 *  1. Look up the container's metashipReference (= shipment systemReference).
 *  2. GET /public/v2/shipments/{ref}/documents
 *  3. For each returned doc, try to match one of this container's allocations
 *     by looking for the user's accountNumber as a substring of the doc name
 *     or reference. Matched → METASHIP_CLIENT, attached to that allocation.
 *     Unmatched → METASHIP_SHARED, attached to the container.
 *  4. Upsert by (container_id, metaship_document_id) so repeated syncs just
 *     refresh URLs + pull in any new docs — no duplicates.
 */
export async function POST(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const { id: containerId } = await params;

        const [container] = await db
            .select()
            .from(containers)
            .where(eq(containers.id, containerId))
            .limit(1);

        if (!container) {
            return NextResponse.json({ error: "Container not found" }, { status: 404 });
        }
        if (!container.metashipReference) {
            return NextResponse.json(
                { error: "Container has no MetaShip reference yet. Create the MetaShip order first." },
                { status: 400 }
            );
        }

        // Load CONFIRMED allocations on this container with their user's account number
        const allocRows = await db
            .select({
                allocation: palletAllocations,
                userId: userTable.id,
                accountNumber: userTable.accountNumber,
            })
            .from(palletAllocations)
            .leftJoin(userTable, eq(palletAllocations.userId, userTable.id))
            .where(
                and(
                    eq(palletAllocations.containerId, containerId),
                    eq(palletAllocations.status, "CONFIRMED"),
                )
            );

        // Match helper: is any account number a substring of the doc's name or reference?
        const matchAllocation = (docName: string, docReference: string) => {
            const haystack = `${docName} ${docReference}`.toUpperCase();
            for (const r of allocRows) {
                const acc = r.accountNumber?.toUpperCase();
                if (acc && haystack.includes(acc)) {
                    return r;
                }
            }
            return null;
        };

        // Fetch the documents from MetaShip
        let msResp;
        try {
            msResp = await getMetaShipShipmentDocuments(container.metashipReference);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return NextResponse.json(
                { error: `MetaShip request failed: ${msg}` },
                { status: 502 }
            );
        }

        const msDocs = Array.isArray(msResp?.documents) ? msResp.documents : [];

        let inserted = 0;
        let updated = 0;
        let matched = 0;
        let shared = 0;

        for (const msDoc of msDocs) {
            const docName = msDoc.name || "";
            const docReference = msDoc.reference || "";

            // Find existing row for this metashipDocumentId within this container
            const [existing] = await db
                .select()
                .from(documents)
                .where(
                    and(
                        eq(documents.containerId, containerId),
                        eq(documents.metashipDocumentId, msDoc.id),
                    )
                )
                .limit(1);

            // Determine classification
            const matchRow = matchAllocation(docName, docReference);
            const source = matchRow ? "METASHIP_CLIENT" : "METASHIP_SHARED";
            if (matchRow) matched++; else shared++;

            const payload = {
                containerId,
                allocationId: matchRow?.allocation.id || null,
                userId: matchRow?.userId || (allocRows[0]?.userId ?? ""),
                originalName: docName,
                storedName: docName,
                type: "OTHER" as const,
                documentCode: null,
                url: msDoc.downloadUrl,
                source: source as "METASHIP_CLIENT" | "METASHIP_SHARED",
                metashipDocumentId: msDoc.id,
                metashipReference: docReference,
                metashipDownloadUrl: msDoc.downloadUrl,
                metashipUrlExpiresAt: msDoc.expiresAt ? new Date(msDoc.expiresAt) : null,
                status: "APPROVED" as const,
            };

            if (existing) {
                await db
                    .update(documents)
                    .set({
                        ...payload,
                        // keep the original row's userId if the match result wouldn't resolve one
                        userId: payload.userId || existing.userId,
                    })
                    .where(eq(documents.id, existing.id));
                updated++;
            } else {
                await db.insert(documents).values({
                    id: `DOC-${nanoid(10)}`,
                    ...payload,
                });
                inserted++;
            }
        }

        return NextResponse.json({
            success: true,
            shipmentReference: container.metashipReference,
            total: msDocs.length,
            matched,
            shared,
            inserted,
            updated,
        });
    } catch (err) {
        console.error("Sync documents error:", err);
        const message = err instanceof Error ? err.message : "Failed to sync documents";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
