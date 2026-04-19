import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { products, containers, productCategories } from "@/lib/db/schema";
import { eq, sql, asc } from "drizzle-orm";

/**
 * List all products in our DB (synced from MetaShip).
 * Each row includes:
 *   - categoryName: display label for the assigned category (null if unassigned)
 *   - containerCount: how many open/threshold containers use this product's category
 */
export async function GET() {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const results = await db
            .select({
                id: products.id,
                metashipId: products.metashipId,
                name: products.name,
                hsCode: products.hsCode,
                description: products.description,
                categoryId: products.categoryId,
                categoryName: productCategories.name,
                active: products.active,
                lastSyncedAt: products.lastSyncedAt,
                updatedAt: products.updatedAt,
                containerCount: sql<number>`
                    (SELECT COUNT(*)::int FROM ${containers}
                     WHERE ${containers.categoryId} = ${products.categoryId}
                     AND ${containers.status} IN ('OPEN','THRESHOLD_REACHED'))
                `.as("container_count"),
            })
            .from(products)
            .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
            .orderBy(asc(products.name));

        return NextResponse.json(results);
    } catch (err) {
        console.error("List products error:", err);
        const message = err instanceof Error ? err.message : "Failed to fetch products";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

/**
 * Toggle active/inactive for a product.
 * (Category assignment is done via /api/admin/product-categories/[id]/products.)
 */
export async function PUT(request: Request) {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const body = await request.json();
        const { id, active } = body;

        if (!id) {
            return NextResponse.json({ error: "Product id is required" }, { status: 400 });
        }

        const updates: Record<string, unknown> = { updatedAt: new Date() };
        if (active !== undefined) updates.active = active;

        const [updated] = await db
            .update(products)
            .set(updates)
            .where(eq(products.id, id))
            .returning();

        if (!updated) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        return NextResponse.json(updated);
    } catch (err) {
        console.error("Update product error:", err);
        const message = err instanceof Error ? err.message : "Failed to update product";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
