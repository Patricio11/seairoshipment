import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const { id } = await params;

        const docs = await db
            .select()
            .from(documents)
            .where(eq(documents.allocationId, id));

        return NextResponse.json(docs);
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to fetch documents";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
