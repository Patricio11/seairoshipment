import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { documents, containers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getMetaShipShipmentDocument } from "@/lib/metaship";

/**
 * Refresh the signed download URL for a MetaShip-sourced document.
 * The URL we cache has a 15-minute TTL; if it's expired or about to expire,
 * call MetaShip's single-doc endpoint to get a fresh one.
 *
 * Returns: { downloadUrl, expiresAt }
 */
export async function POST(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const { id } = await params;

        const [doc] = await db
            .select()
            .from(documents)
            .where(eq(documents.id, id))
            .limit(1);

        if (!doc) {
            return NextResponse.json({ error: "Document not found" }, { status: 404 });
        }
        if (!doc.metashipDocumentId || !doc.containerId) {
            return NextResponse.json(
                { error: "This document is not a MetaShip-sourced document" },
                { status: 400 }
            );
        }

        // Look up the container's systemReference
        const [container] = await db
            .select({ metashipReference: containers.metashipReference })
            .from(containers)
            .where(eq(containers.id, doc.containerId))
            .limit(1);

        if (!container?.metashipReference) {
            return NextResponse.json(
                { error: "Container has no MetaShip reference" },
                { status: 400 }
            );
        }

        // Fetch a fresh signed URL
        let fresh;
        try {
            fresh = await getMetaShipShipmentDocument(container.metashipReference, doc.metashipDocumentId);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return NextResponse.json({ error: `MetaShip request failed: ${msg}` }, { status: 502 });
        }

        const expiresAt = fresh.expiresAt ? new Date(fresh.expiresAt) : null;

        await db
            .update(documents)
            .set({
                metashipDownloadUrl: fresh.downloadUrl,
                metashipUrlExpiresAt: expiresAt,
                url: fresh.downloadUrl,
            })
            .where(eq(documents.id, id));

        return NextResponse.json({
            downloadUrl: fresh.downloadUrl,
            expiresAt: fresh.expiresAt,
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to refresh URL";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
