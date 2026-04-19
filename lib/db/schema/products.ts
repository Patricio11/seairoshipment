import { pgTable, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { productCategories } from "./product-categories";

/**
 * Products synced from MetaShip. One row per MetaShip product.
 * We use MetaShip's numeric ID as metashipId but generate our own string id for consistency.
 *
 * Each product may be assigned to one product_category, which determines:
 *  - Which containers it can ship on (container.categoryId must match).
 *  - Which documents the client must upload (category.requiredDocuments).
 *
 * A product without a category is "uncategorised" and cannot be booked.
 */
export const products = pgTable("products", {
    id: text("id").primaryKey(), // e.g. "prd-161" (we prefix the metashipId)
    metashipId: integer("metaship_id").notNull().unique(), // original numeric id from MetaShip
    name: text("name").notNull(),
    hsCode: text("hs_code").default("").notNull(),
    description: text("description").default("").notNull(),
    category: text("category"), // LEGACY freeform tag — superseded by categoryId
    categoryId: text("category_id").references(() => productCategories.id),
    active: boolean("active").default(true).notNull(),
    lastSyncedAt: timestamp("last_synced_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
