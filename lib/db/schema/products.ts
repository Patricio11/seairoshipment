import { pgTable, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

/**
 * Products synced from MetaShip. One row per MetaShip product.
 * We use MetaShip's numeric ID as metashipId but generate our own string id for consistency.
 */
export const products = pgTable("products", {
    id: text("id").primaryKey(), // e.g. "prd-161" (we prefix the metashipId)
    metashipId: integer("metaship_id").notNull().unique(), // original numeric id from MetaShip
    name: text("name").notNull(),
    hsCode: text("hs_code").default("").notNull(),
    description: text("description").default("").notNull(),
    category: text("category"), // e.g. FISH, FRUIT, MEAT, DAIRY — derived or manual
    active: boolean("active").default(true).notNull(),
    lastSyncedAt: timestamp("last_synced_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
