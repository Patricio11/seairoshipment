import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { documents, palletAllocations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";

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

        const docs = await db
            .select()
            .from(documents)
            .where(eq(documents.allocationId, allocationId));

        return NextResponse.json(docs);
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
        const { originalName, storedName, url, type } = body;

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
            url,
            status: "PENDING",
        });

        return NextResponse.json({ id: docId }, { status: 201 });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to save document";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
