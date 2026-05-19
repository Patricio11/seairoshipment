import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { productCategories, products, containers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { parseBulkIds, runBulkDelete } from "@/lib/bulk-delete";

/**
 * Bulk variant of /api/admin/product-categories/[id] DELETE.
 *  - Refuse if any container still references this category.
 *  - Unassign products (set categoryId to null) — products survive, the
 *    category goes.
 */
export async function POST(req: NextRequest) {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const parsed = parseBulkIds(await req.json().catch(() => ({})));
    if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const result = await runBulkDelete(parsed.ids, async (id) => {
        const using = await db.select({ id: containers.id }).from(containers).where(eq(containers.categoryId, id));
        if (using.length > 0) {
            return { ok: false, reason: `${using.length} container(s) still reference this category` };
        }
        await db.update(products).set({ categoryId: null }).where(eq(products.categoryId, id));
        const [deleted] = await db.delete(productCategories).where(eq(productCategories.id, id)).returning();
        return deleted ? { ok: true } : { ok: false, reason: "not found" };
    });

    return NextResponse.json(result);
}
