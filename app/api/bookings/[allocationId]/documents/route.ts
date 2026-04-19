import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { documents, palletAllocations } from "@/lib/db/schema";
import { eq, and, or } from "drizzle-orm";
import { nanoid } from "nanoid";

/**
 * Returns the client's own documents for an allocation, plus any shared
 * container-level MetaShip documents. Structure matches the admin endpoint
 * so the same AllocationDocs component can render both.
 */
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ allocationId: string }> }
) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { allocationId } = await params;

        // Verify allocation ownership
        const [alloc] = await db
            .select()
            .from(palletAllocations)
            .where(eq(palletAllocations.id, allocationId))
            .limit(1);

        if (!alloc || alloc.userId !== session.user.id) {
            return NextResponse.json({ error: "Allocation not found" }, { status: 404 });
        }

        const rows = await db
            .select()
            .from(documents)
            .where(
                or(
                    eq(documents.allocationId, allocationId),
                    alloc.containerId ? and(
                        eq(documents.containerId, alloc.containerId),
                        eq(documents.source, "METASHIP_SHARED"),
                    ) : undefined,
                )
            );

        return NextResponse.json({
            flat: rows,
            clientUploads: rows.filter(d => d.source === "CLIENT_UPLOAD"),
            finalisedFromMetaShip: rows.filter(d => d.source === "METASHIP_CLIENT" && d.allocationId === allocationId),
            containerDocuments: rows.filter(d => d.source === "METASHIP_SHARED"),
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fetch documents";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ allocationId: string }> }
) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { allocationId } = await params;
        const { searchParams } = new URL(request.url);
        const docId = searchParams.get("docId");
        if (!docId) {
            return NextResponse.json({ error: "docId query param required" }, { status: 400 });
        }

        // Verify allocation ownership
        const [alloc] = await db
            .select()
            .from(palletAllocations)
            .where(eq(palletAllocations.id, allocationId))
            .limit(1);

        if (!alloc || alloc.userId !== session.user.id) {
            return NextResponse.json({ error: "Allocation not found" }, { status: 404 });
        }

        // Delete document record (file stays in Supabase — could be cleaned up separately)
        await db
            .delete(documents)
            .where(
                and(
                    eq(documents.id, docId),
                    eq(documents.allocationId, allocationId),
                    eq(documents.userId, session.user.id)
                )
            );

        return NextResponse.json({ success: true });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to delete document";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ allocationId: string }> }
) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { allocationId } = await params;

        // Verify the allocation belongs to this user
        const allocation = await db
            .select()
            .from(palletAllocations)
            .where(eq(palletAllocations.id, allocationId))
            .limit(1);

        if (!allocation[0] || allocation[0].userId !== session.user.id) {
            return NextResponse.json({ error: "Allocation not found" }, { status: 404 });
        }

        const body = await request.json();
        const { originalName, storedName, url, type, documentCode } = body;

        if (!originalName || !url) {
            return NextResponse.json({ error: "originalName and url are required" }, { status: 400 });
        }

        const docId = `DOC-${nanoid(10)}`;

        await db.insert(documents).values({
            id: docId,
            allocationId,
            userId: session.user.id,
            originalName,
            storedName: storedName || originalName,
            type: type || "OTHER",
            documentCode: documentCode || null,
            url,
            status: "PENDING",
        });

        return NextResponse.json({ id: docId }, { status: 201 });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to save document";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
