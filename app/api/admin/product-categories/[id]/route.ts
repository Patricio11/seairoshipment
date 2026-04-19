import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { productCategories, products, containers } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

type Temperature = "frozen" | "chilled" | "ambient";

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const { id } = await params;

        const [cat] = await db
            .select()
            .from(productCategories)
            .where(eq(productCategories.id, id))
            .limit(1);

        if (!cat) return NextResponse.json({ error: "Category not found" }, { status: 404 });

        const assignedProducts = await db
            .select({
                id: products.id,
                name: products.name,
                hsCode: products.hsCode,
                description: products.description,
                active: products.active,
            })
            .from(products)
            .where(eq(products.categoryId, id))
            .orderBy(asc(products.name));

        return NextResponse.json({ ...cat, products: assignedProducts });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fetch category";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const { id } = await params;
        const body = await request.json();

        const [existing] = await db
            .select()
            .from(productCategories)
            .where(eq(productCategories.id, id))
            .limit(1);
        if (!existing) return NextResponse.json({ error: "Category not found" }, { status: 404 });

        const updates: Record<string, unknown> = { updatedAt: new Date() };
        if (body.name !== undefined) updates.name = String(body.name).trim();
        if (body.description !== undefined) updates.description = body.description?.trim() || null;
        if (body.active !== undefined) updates.active = Boolean(body.active);
        if (body.requiredDocuments !== undefined) {
            updates.requiredDocuments = Array.isArray(body.requiredDocuments) ? body.requiredDocuments : [];
        }
        if (body.allowedTemperatures !== undefined) {
            const temps = (Array.isArray(body.allowedTemperatures) ? body.allowedTemperatures : []) as Temperature[];
            if (temps.length === 0) return NextResponse.json({ error: "At least one allowed temperature is required" }, { status: 400 });
            const validTemps: Temperature[] = ["frozen", "chilled", "ambient"];
            if (!temps.every(t => validTemps.includes(t))) {
                return NextResponse.json({ error: "Invalid temperature" }, { status: 400 });
            }
            if (existing.salesRateTypeId === "scs" && temps.some(t => t !== "ambient")) {
                return NextResponse.json({ error: "SCS categories must only allow ambient" }, { status: 400 });
            }
            if (existing.salesRateTypeId === "srs" && temps.includes("ambient")) {
                return NextResponse.json({ error: "SRS categories cannot allow ambient" }, { status: 400 });
            }
            updates.allowedTemperatures = temps;
        }
        // salesRateTypeId is deliberately NOT editable — create a new category instead

        const [updated] = await db
            .update(productCategories)
            .set(updates)
            .where(eq(productCategories.id, id))
            .returning();

        return NextResponse.json(updated);
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to update category";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const { id } = await params;

        // Block delete if any container still references this category
        const usingContainers = await db
            .select({ id: containers.id })
            .from(containers)
            .where(eq(containers.categoryId, id));

        if (usingContainers.length > 0) {
            return NextResponse.json(
                { error: `Cannot delete — ${usingContainers.length} container(s) still reference this category` },
                { status: 400 }
            );
        }

        // Unassign products first (set categoryId to null)
        await db.update(products).set({ categoryId: null }).where(eq(products.categoryId, id));

        const [deleted] = await db
            .delete(productCategories)
            .where(eq(productCategories.id, id))
            .returning();

        if (!deleted) return NextResponse.json({ error: "Category not found" }, { status: 404 });

        return NextResponse.json({ success: true });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to delete category";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
