import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { productCategories, products, containers } from "@/lib/db/schema";
import { asc, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

type Temperature = "frozen" | "chilled" | "ambient";

/**
 * List all product categories with:
 *   - productCount: how many products are assigned
 *   - containerCount: how many OPEN/THRESHOLD containers currently use it
 */
export async function GET() {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const cats = await db
            .select()
            .from(productCategories)
            .orderBy(asc(productCategories.salesRateTypeId), asc(productCategories.name));

        // Count products per category (single query, grouped)
        const productCountsRows = await db
            .select({
                categoryId: products.categoryId,
                count: sql<number>`COUNT(*)::int`.as("count"),
            })
            .from(products)
            .groupBy(products.categoryId);
        const productCounts = new Map<string, number>();
        for (const r of productCountsRows) {
            if (r.categoryId) productCounts.set(r.categoryId, Number(r.count) || 0);
        }

        // Count open/threshold containers per category
        const containerCountsRows = await db
            .select({
                categoryId: containers.categoryId,
                count: sql<number>`COUNT(*)::int`.as("count"),
            })
            .from(containers)
            .where(sql`${containers.status} IN ('OPEN','THRESHOLD_REACHED')`)
            .groupBy(containers.categoryId);
        const containerCounts = new Map<string, number>();
        for (const r of containerCountsRows) {
            if (r.categoryId) containerCounts.set(r.categoryId, Number(r.count) || 0);
        }

        const rows = cats.map(c => ({
            ...c,
            productCount: productCounts.get(c.id) || 0,
            containerCount: containerCounts.get(c.id) || 0,
        }));

        return NextResponse.json(rows);
    } catch (err) {
        console.error("List categories error:", err);
        const message = err instanceof Error ? err.message : "Failed to fetch categories";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const body = await request.json();
        const { name, description, salesRateTypeId, allowedTemperatures, requiredDocuments, active } = body;

        if (!name || !salesRateTypeId) {
            return NextResponse.json({ error: "name and salesRateTypeId are required" }, { status: 400 });
        }
        if (!["srs", "scs"].includes(salesRateTypeId)) {
            return NextResponse.json({ error: "salesRateTypeId must be 'srs' or 'scs'" }, { status: 400 });
        }

        const temps = (Array.isArray(allowedTemperatures) ? allowedTemperatures : []) as Temperature[];
        if (temps.length === 0) {
            return NextResponse.json({ error: "At least one allowed temperature is required" }, { status: 400 });
        }
        const validTemps: Temperature[] = ["frozen", "chilled", "ambient"];
        if (!temps.every(t => validTemps.includes(t))) {
            return NextResponse.json({ error: "Invalid temperature value" }, { status: 400 });
        }
        // SCS must only be ambient; SRS must NOT include ambient
        if (salesRateTypeId === "scs" && temps.some(t => t !== "ambient")) {
            return NextResponse.json({ error: "SCS (dry) categories can only allow ambient temperature" }, { status: 400 });
        }
        if (salesRateTypeId === "srs" && temps.includes("ambient")) {
            return NextResponse.json({ error: "SRS (reefer) categories cannot allow ambient temperature" }, { status: 400 });
        }

        const docs = Array.isArray(requiredDocuments) ? (requiredDocuments as string[]) : [];

        const id = `cat-${nanoid(8)}`;
        const [created] = await db
            .insert(productCategories)
            .values({
                id,
                name: name.trim(),
                description: description?.trim() || null,
                salesRateTypeId,
                allowedTemperatures: temps,
                requiredDocuments: docs,
                active: active !== false,
            })
            .returning();

        return NextResponse.json(created, { status: 201 });
    } catch (err) {
        console.error("Create category error:", err);
        const message = err instanceof Error ? err.message : "Failed to create category";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
