import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { products, productCategories } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";

/**
 * Assign (or reassign) products to this category.
 * Body: { productIds: string[] }
 * A product can belong to only one category — assigning it here overrides any previous assignment.
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const { id } = await params;
        const body = await request.json();
        const ids: string[] = Array.isArray(body.productIds) ? body.productIds : [];

        if (ids.length === 0) {
            return NextResponse.json({ error: "productIds array is required" }, { status: 400 });
        }

        const [cat] = await db.select().from(productCategories).where(eq(productCategories.id, id)).limit(1);
        if (!cat) return NextResponse.json({ error: "Category not found" }, { status: 404 });

        await db
            .update(products)
            .set({ categoryId: id, updatedAt: new Date() })
            .where(inArray(products.id, ids));

        return NextResponse.json({ success: true, assigned: ids.length });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to assign products";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

/**
 * Unassign products from this category (sets categoryId to null).
 * Body: { productIds: string[] }
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const { id } = await params;
        const body = await request.json().catch(() => ({}));
        const ids: string[] = Array.isArray(body.productIds) ? body.productIds : [];

        if (ids.length === 0) {
            return NextResponse.json({ error: "productIds array is required" }, { status: 400 });
        }

        await db
            .update(products)
            .set({ categoryId: null, updatedAt: new Date() })
            .where(inArray(products.id, ids));

        // No-op if those products weren't in this category; simpler than validating each
        return NextResponse.json({ success: true, unassigned: ids.length });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to unassign products";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
