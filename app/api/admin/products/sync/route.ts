import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { metaShipGet } from "@/lib/metaship";
import { eq } from "drizzle-orm";

/**
 * Sync products from MetaShip.
 * Pulls /public/v2/product and upserts each into our `products` table.
 */
export async function POST() {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const raw = await metaShipGet<Record<string, unknown>>("/public/v2/product", {
            limit: "1000",
        });

        const items: Record<string, unknown>[] = Array.isArray(raw)
            ? raw
            : Array.isArray(raw.data)
                ? (raw.data as Record<string, unknown>[])
                : [];

        let inserted = 0;
        let updated = 0;
        const now = new Date();

        for (const p of items) {
            const metashipId = typeof p.id === "number" ? p.id : parseInt(String(p.id), 10);
            if (!metashipId || Number.isNaN(metashipId)) continue;

            const id = `prd-${metashipId}`;
            const name = String(p.name || "Unknown");
            const hsCode = String(p.code || "");
            const description = String(p.type || "");

            // Check if exists
            const [existing] = await db
                .select()
                .from(products)
                .where(eq(products.id, id))
                .limit(1);

            if (existing) {
                await db
                    .update(products)
                    .set({
                        name,
                        hsCode,
                        description,
                        lastSyncedAt: now,
                        updatedAt: now,
                    })
                    .where(eq(products.id, id));
                updated++;
            } else {
                await db.insert(products).values({
                    id,
                    metashipId,
                    name,
                    hsCode,
                    description,
                    active: true,
                    lastSyncedAt: now,
                });
                inserted++;
            }
        }

        return NextResponse.json({
            success: true,
            total: items.length,
            inserted,
            updated,
        });
    } catch (err) {
        console.error("Products sync error:", err);
        const message = err instanceof Error ? err.message : "Failed to sync products";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
