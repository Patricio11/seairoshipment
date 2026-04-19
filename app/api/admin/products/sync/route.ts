import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { metaShipGet } from "@/lib/metaship";
import { sql } from "drizzle-orm";

// Route config — syncing 1000s of products with many DB writes can exceed the
// default 10s serverless limit on Vercel.
export const maxDuration = 300; // 5 min

/**
 * Sync products from MetaShip.
 * - Paginates at 100 per page (MetaShip's max limit).
 * - Uses a single batched INSERT ... ON CONFLICT DO UPDATE so the total
 *   number of DB round-trips is O(pages) not O(products).
 */
export async function POST() {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const PAGE_SIZE = 100;
        const allItems: Record<string, unknown>[] = [];
        let offset = 0;
        let total: number | null = null;
        const maxPages = 100; // safety cap → 10,000 products max

        console.log("[products/sync] Starting MetaShip product pull…");

        for (let page = 0; page < maxPages; page++) {
            const raw = await metaShipGet<Record<string, unknown>>("/public/v2/product", {
                limit: String(PAGE_SIZE),
                offset: String(offset),
            });

            const pageItems: Record<string, unknown>[] = Array.isArray(raw)
                ? raw
                : Array.isArray(raw.data)
                    ? (raw.data as Record<string, unknown>[])
                    : [];

            if (pageItems.length === 0) break;
            allItems.push(...pageItems);

            if (total === null && typeof raw.total === "number") {
                total = raw.total as number;
                console.log(`[products/sync] MetaShip reports total=${total}`);
            }

            console.log(`[products/sync] page=${page} offset=${offset} got=${pageItems.length} accumulated=${allItems.length}`);

            if (total !== null && allItems.length >= total) break;
            if (pageItems.length < PAGE_SIZE) break;

            offset += PAGE_SIZE;
        }

        console.log(`[products/sync] Pulled ${allItems.length} products. Writing to DB…`);

        // Pre-fetch existing IDs so we can report inserted vs updated counts
        const existingRows = await db.select({ id: products.id }).from(products);
        const existingIds = new Set(existingRows.map(r => r.id));

        const now = new Date();
        const rows = allItems
            .map(p => {
                const metashipId = typeof p.id === "number" ? p.id : parseInt(String(p.id), 10);
                if (!metashipId || Number.isNaN(metashipId)) return null;
                return {
                    id: `prd-${metashipId}`,
                    metashipId,
                    name: String(p.name || "Unknown"),
                    hsCode: String(p.code || ""),
                    description: String(p.type || ""),
                    active: true,
                    lastSyncedAt: now,
                };
            })
            .filter((r): r is NonNullable<typeof r> => r !== null);

        let inserted = 0;
        let updated = 0;

        // Batch upsert — Postgres has a ~65k parameter limit, so chunk at 500 rows
        // (each row uses ~6 parameters → 3000 params per batch, safely within limits).
        const BATCH_SIZE = 500;
        for (let i = 0; i < rows.length; i += BATCH_SIZE) {
            const batch = rows.slice(i, i + BATCH_SIZE);
            await db
                .insert(products)
                .values(batch)
                .onConflictDoUpdate({
                    target: products.id,
                    set: {
                        name: sql`excluded.name`,
                        hsCode: sql`excluded.hs_code`,
                        description: sql`excluded.description`,
                        lastSyncedAt: sql`excluded.last_synced_at`,
                        updatedAt: now,
                    },
                });

            for (const r of batch) {
                if (existingIds.has(r.id)) updated++; else inserted++;
            }
            console.log(`[products/sync] wrote batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(rows.length / BATCH_SIZE)}`);
        }

        console.log(`[products/sync] Done. inserted=${inserted} updated=${updated}`);

        return NextResponse.json({
            success: true,
            total: rows.length,
            inserted,
            updated,
        });
    } catch (err) {
        console.error("Products sync error:", err);
        const message = err instanceof Error ? err.message : "Failed to sync products";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
