/**
 * Standalone seed for the admin-curated cargo-item presets surfaced inside
 * the CBM calculator's "preset picker" dropdown.
 *
 * Mirrors POST /api/admin/cargo-item-presets/seed but runs from the terminal
 * without an admin session. Idempotent: rows are matched on
 *   (name + is_admin=true + user_id=null)
 * so re-running just skips existing presets.
 *
 * Usage:
 *   npm run seed:cargo-presets
 */
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { pgTable, text, timestamp, integer, numeric, boolean } from "drizzle-orm/pg-core";
import { and, eq, isNull } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// Inline schema definitions — keeps the script standalone, matching the
// existing seed-standalone.ts pattern.
const cargoItemPresets = pgTable("cargo_item_presets", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    categoryId: text("category_id"),
    lengthMm: integer("length_mm").notNull(),
    widthMm: integer("width_mm").notNull(),
    heightMm: integer("height_mm").notNull(),
    weightKg: numeric("weight_kg"),
    isAdmin: boolean("is_admin").default(false).notNull(),
    userId: text("user_id"),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

const productCategories = pgTable("product_categories", {
    id: text("id").primaryKey(),
});

interface PresetSeed {
    name: string;
    categoryId: string | null;
    lengthMm: number;
    widthMm: number;
    heightMm: number;
    weightKg: number;
}

// Dimensions are industry-typical figures for South African exports.
// Same list as in app/api/admin/cargo-item-presets/seed/route.ts — kept in
// sync by hand.
const SEED: PresetSeed[] = [
    // Wine & Spirits
    { name: "Wine 12-bottle case (750ml)", categoryId: "cat-wine-spirits", lengthMm: 350, widthMm: 300, heightMm: 230, weightKg: 16 },
    { name: "Wine 6-bottle case", categoryId: "cat-wine-spirits", lengthMm: 350, widthMm: 160, heightMm: 230, weightKg: 8 },
    { name: "Spirits case (12 x 750ml)", categoryId: "cat-wine-spirits", lengthMm: 350, widthMm: 300, heightMm: 280, weightKg: 18 },

    // Fruit
    { name: "Citrus 15kg carton", categoryId: "cat-fruit", lengthMm: 400, widthMm: 300, heightMm: 270, weightKg: 15 },
    { name: "Grape 4.5kg punnet pack", categoryId: "cat-fruit", lengthMm: 400, widthMm: 300, heightMm: 100, weightKg: 4.5 },
    { name: "Apple / Pear 18kg bin liner", categoryId: "cat-fruit", lengthMm: 600, widthMm: 400, heightMm: 300, weightKg: 18 },

    // Hunting Trophies
    { name: "Standard trophy crate", categoryId: "cat-hunting-trophies", lengthMm: 1200, widthMm: 800, heightMm: 800, weightKg: 45 },
    { name: "Skull / horn export box", categoryId: "cat-hunting-trophies", lengthMm: 800, widthMm: 600, heightMm: 600, weightKg: 25 },

    // Confectionery
    { name: "Chocolate 24-bar carton", categoryId: "cat-confectionery", lengthMm: 400, widthMm: 300, heightMm: 200, weightKg: 6 },
    { name: "Confectionery bulk box", categoryId: "cat-confectionery", lengthMm: 500, widthMm: 400, heightMm: 300, weightKg: 12 },

    // Other dry mixed
    { name: "Standard double-wall carton", categoryId: "cat-dry-mixed", lengthMm: 400, widthMm: 400, heightMm: 400, weightKg: 10 },
    { name: "Industrial drum (200L)", categoryId: "cat-dry-mixed", lengthMm: 580, widthMm: 580, heightMm: 880, weightKg: 25 },

    // Category-agnostic pallet bases
    { name: "Euro pallet base (EUR 1)", categoryId: null, lengthMm: 1200, widthMm: 800, heightMm: 144, weightKg: 22 },
    { name: "ISO pallet base", categoryId: null, lengthMm: 1200, widthMm: 1000, heightMm: 144, weightKg: 25 },
];

async function main() {
    const url = process.env.DATABASE_URL;
    if (!url) {
        console.error("DATABASE_URL is not set. Check .env.local.");
        process.exit(1);
    }

    const db = drizzle(neon(url));

    // Pre-fetch existing product category IDs so we can detect missing ones
    // and fall back to null rather than failing a foreign-key constraint.
    // Without this the seed crashes on the first preset whose category
    // hasn't been seeded yet (cat-confectionery / cat-dry-mixed live behind
    // a separate product-categories seed).
    const existingCategoryRows = await db
        .select({ id: productCategories.id })
        .from(productCategories);
    const validCategoryIds = new Set(existingCategoryRows.map(r => r.id));

    let created = 0;
    let skipped = 0;
    let degraded = 0;

    for (const preset of SEED) {
        const [existing] = await db
            .select({ id: cargoItemPresets.id })
            .from(cargoItemPresets)
            .where(and(
                eq(cargoItemPresets.name, preset.name),
                eq(cargoItemPresets.isAdmin, true),
                isNull(cargoItemPresets.userId),
            ))
            .limit(1);

        if (existing) {
            skipped++;
            console.log(`  skip   ${preset.name}`);
            continue;
        }

        // Fall back to null category if the referenced one doesn't exist in
        // product_categories — the preset is still usable, it just won't
        // surface as a category-relevant suggestion until the category is
        // seeded.
        let effectiveCategoryId = preset.categoryId;
        if (effectiveCategoryId !== null && !validCategoryIds.has(effectiveCategoryId)) {
            console.log(`  warn   ${preset.name}: category "${effectiveCategoryId}" not found, inserting with no category`);
            effectiveCategoryId = null;
            degraded++;
        }

        await db.insert(cargoItemPresets).values({
            id: `cip-${preset.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}`,
            name: preset.name,
            categoryId: effectiveCategoryId,
            lengthMm: preset.lengthMm,
            widthMm: preset.widthMm,
            heightMm: preset.heightMm,
            weightKg: preset.weightKg.toString(),
            isAdmin: true,
            userId: null,
            active: true,
        });
        created++;
        console.log(`  create ${preset.name}`);
    }

    console.log(`\nDone. ${created} created, ${skipped} skipped${degraded > 0 ? `, ${degraded} inserted without category` : ""} (out of ${SEED.length} total).`);
    if (degraded > 0) {
        console.log("Note: some presets had their category cleared because it doesn't exist in product_categories yet.");
        console.log("Run the product-categories seed to link them, then re-run this script.");
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
