/**
 * One-off backfill for container_types.volume_cbm + containers.max_capacity_cbm.
 *
 * Why: the original seed (lib/db/seed.ts) didn't include volumeCBM, so every
 * container_types row has it as NULL. The admin POST /api/admin/containers
 * route then hydrates `maxCapacityCBM: ct.volumeCBM ?? null` — also NULL —
 * which makes the booking-options query reject SCS/Cube containers (the
 * capacity check `COALESCE(maxCapacityCBM, 0) - 0 > 0` evaluates false).
 *
 * Result: clients can't see any SCS/Cube containers when booking.
 *
 * This script:
 *  1. Updates each known container_types row to a realistic volumeCBM
 *     (interior CBM per ISO/ITC reference sheets).
 *  2. For every existing containers row, sets maxCapacityCBM to its
 *     container_type's new volumeCBM (so already-created containers
 *     become bookable without admin having to edit each one).
 *
 * Idempotent: re-running is a no-op (UPDATE always writes the same values).
 *
 * Usage:
 *   npm run backfill:container-volumes
 */
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { pgTable, text, integer, numeric, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { eq } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// Inline schema (standalone-script pattern matching the existing seed scripts).
const containerTypeSizeEnum = pgEnum("container_type_size", ["20FT", "40FT"]);
const containerTypeCategoryEnum = pgEnum("container_type_category", ["REEFER", "DRY"]);

const containerTypes = pgTable("container_types", {
    id: text("id").primaryKey(),
    size: containerTypeSizeEnum("size").notNull(),
    type: containerTypeCategoryEnum("type").notNull(),
    variant: text("variant"),
    code: text("code").notNull(),
    displayName: text("display_name").notNull(),
    maxPallets: integer("max_pallets").notNull(),
    volumeCBM: numeric("volume_cbm"),
    active: boolean("active").default(true).notNull(),
});

const containers = pgTable("containers", {
    id: text("id").primaryKey(),
    containerTypeId: text("container_type_id"),
    maxCapacityCBM: numeric("max_capacity_cbm"),
    updatedAt: timestamp("updated_at"),
});

interface TypeVolume {
    id: string;
    volumeCBM: string;
}

// Same realistic interior CBM values as in lib/db/seed.ts. Reefers lose
// ~5 m³ to insulation vs. equivalent dry.
const TYPE_VOLUMES: TypeVolume[] = [
    { id: "20ft-reefer-std", volumeCBM: "28.30" },
    { id: "20ft-dry-std",    volumeCBM: "33.20" },
    { id: "40ft-reefer-std", volumeCBM: "58.10" },
    { id: "40ft-reefer-hc",  volumeCBM: "67.00" },
    { id: "40ft-dry-std",    volumeCBM: "67.50" },
    { id: "40ft-dry-hc",     volumeCBM: "76.40" },
];

async function main() {
    const url = process.env.DATABASE_URL;
    if (!url) {
        console.error("DATABASE_URL is not set. Check .env.local.");
        process.exit(1);
    }

    const db = drizzle(neon(url));

    // 1. Update each known container_types row.
    console.log("Updating container_types.volume_cbm …");
    let typeUpdates = 0;
    for (const t of TYPE_VOLUMES) {
        const result = await db
            .update(containerTypes)
            .set({ volumeCBM: t.volumeCBM })
            .where(eq(containerTypes.id, t.id))
            .returning({ id: containerTypes.id });
        if (result.length > 0) {
            typeUpdates++;
            console.log(`  ✓ ${t.id} → ${t.volumeCBM} m³`);
        } else {
            console.log(`  skip ${t.id} (no such container_type row)`);
        }
    }

    // 2. For every container row, set maxCapacityCBM to its type's volumeCBM.
    // We fetch all containers + the relevant type volumes, then UPDATE each one.
    console.log("\nBackfilling containers.max_capacity_cbm from container_types …");
    const allTypes = await db
        .select({ id: containerTypes.id, volumeCBM: containerTypes.volumeCBM })
        .from(containerTypes);
    const volumeByTypeId = new Map<string, string>();
    for (const t of allTypes) {
        if (t.volumeCBM != null) volumeByTypeId.set(t.id, t.volumeCBM);
    }

    const allContainers = await db
        .select({ id: containers.id, containerTypeId: containers.containerTypeId, maxCapacityCBM: containers.maxCapacityCBM })
        .from(containers);

    let containerUpdates = 0;
    let containerSkips = 0;
    for (const c of allContainers) {
        if (!c.containerTypeId) {
            containerSkips++;
            continue;
        }
        const volume = volumeByTypeId.get(c.containerTypeId);
        if (!volume) {
            containerSkips++;
            continue;
        }
        // Skip if it's already correct — saves churn on updatedAt.
        if (c.maxCapacityCBM === volume) {
            continue;
        }
        await db
            .update(containers)
            .set({ maxCapacityCBM: volume, updatedAt: new Date() })
            .where(eq(containers.id, c.id));
        containerUpdates++;
    }

    console.log(`\nDone.`);
    console.log(`  container_types updated:   ${typeUpdates}/${TYPE_VOLUMES.length}`);
    console.log(`  containers updated:        ${containerUpdates}`);
    console.log(`  containers skipped:        ${containerSkips} (no container_type_id or unknown type)`);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
