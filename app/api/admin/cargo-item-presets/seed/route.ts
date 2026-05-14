import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { cargoItemPresets } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";

/**
 * Seed the admin-curated cargo item presets surfaced in the CBM calculator.
 *
 * Idempotent: rows are matched on (name + isAdmin=true + userId=null). If a
 * preset with the same name already exists at the admin scope, it's left
 * untouched. Adding a new preset to the SEED array and re-hitting the
 * endpoint is the supported way to grow the curated list.
 *
 * Dimensions are industry-typical figures for South African exports. Admin
 * can edit / add via the upcoming /admin/cargo-item-presets UI (Phase E or
 * F); the seed gives v1 immediate value without anyone clicking around.
 */
const SEED = [
    // Wine & Spirits — cat-wine-spirits
    { name: "Wine 12-bottle case (750ml)", categoryId: "cat-wine-spirits", lengthMm: 350, widthMm: 300, heightMm: 230, weightKg: 16 },
    { name: "Wine 6-bottle case", categoryId: "cat-wine-spirits", lengthMm: 350, widthMm: 160, heightMm: 230, weightKg: 8 },
    { name: "Spirits case (12 x 750ml)", categoryId: "cat-wine-spirits", lengthMm: 350, widthMm: 300, heightMm: 280, weightKg: 18 },

    // Fruit — cat-fruit
    { name: "Citrus 15kg carton", categoryId: "cat-fruit", lengthMm: 400, widthMm: 300, heightMm: 270, weightKg: 15 },
    { name: "Grape 4.5kg punnet pack", categoryId: "cat-fruit", lengthMm: 400, widthMm: 300, heightMm: 100, weightKg: 4.5 },
    { name: "Apple / Pear 18kg bin liner", categoryId: "cat-fruit", lengthMm: 600, widthMm: 400, heightMm: 300, weightKg: 18 },

    // Hunting Trophies — cat-hunting-trophies
    { name: "Standard trophy crate", categoryId: "cat-hunting-trophies", lengthMm: 1200, widthMm: 800, heightMm: 800, weightKg: 45 },
    { name: "Skull / horn export box", categoryId: "cat-hunting-trophies", lengthMm: 800, widthMm: 600, heightMm: 600, weightKg: 25 },

    // Confectionery (SRS-ambient, but the cargo dimensions still apply to dry packing) — cat-confectionery
    { name: "Chocolate 24-bar carton", categoryId: "cat-confectionery", lengthMm: 400, widthMm: 300, heightMm: 200, weightKg: 6 },
    { name: "Confectionery bulk box", categoryId: "cat-confectionery", lengthMm: 500, widthMm: 400, heightMm: 300, weightKg: 12 },

    // Other dry mixed — cat-dry-mixed
    { name: "Standard double-wall carton", categoryId: "cat-dry-mixed", lengthMm: 400, widthMm: 400, heightMm: 400, weightKg: 10 },
    { name: "Industrial drum (200L)", categoryId: "cat-dry-mixed", lengthMm: 580, widthMm: 580, heightMm: 880, weightKg: 25 },

    // Category-agnostic pallet bases
    { name: "Euro pallet base (EUR 1)", categoryId: null, lengthMm: 1200, widthMm: 800, heightMm: 144, weightKg: 22 },
    { name: "ISO pallet base", categoryId: null, lengthMm: 1200, widthMm: 1000, heightMm: 144, weightKg: 25 },
];

export async function POST() {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        let created = 0;
        let skipped = 0;

        for (const preset of SEED) {
            // Match on name within the admin scope (isAdmin=true + userId=null).
            // Two presets with the same name across different categories would
            // collide — by design, since the calculator displays the name.
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
                continue;
            }

            await db.insert(cargoItemPresets).values({
                id: `cip-${preset.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}`,
                name: preset.name,
                categoryId: preset.categoryId,
                lengthMm: preset.lengthMm,
                widthMm: preset.widthMm,
                heightMm: preset.heightMm,
                weightKg: preset.weightKg.toString(),
                isAdmin: true,
                userId: null,
                active: true,
            });
            created++;
        }

        return NextResponse.json({ created, skipped, totalSeeded: SEED.length });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to seed cargo item presets";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
