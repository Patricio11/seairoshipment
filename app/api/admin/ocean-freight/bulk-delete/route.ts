import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { oceanFreightRates } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { parseBulkIds, runBulkDelete } from "@/lib/bulk-delete";

export async function POST(req: NextRequest) {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const parsed = parseBulkIds(await req.json().catch(() => ({})));
    if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const result = await runBulkDelete(parsed.ids, async (id) => {
        const [deleted] = await db.delete(oceanFreightRates).where(eq(oceanFreightRates.id, id)).returning();
        return deleted ? { ok: true } : { ok: false, reason: "not found" };
    });

    return NextResponse.json(result);
}
