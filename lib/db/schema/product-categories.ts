import { pgTable, text, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";

/**
 * A consolidation-compatible grouping of products.
 * - Each category is tied to a single sales rate type (SRS or SCS).
 * - Each category declares which temperature regimes are valid for it.
 * - Each category has a list of required export document codes.
 * - Products are assigned to categories (see products.categoryId) so that
 *   booking a container for category X accepts any allocation carrying a
 *   product in X.
 */
export const productCategories = pgTable("product_categories", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    salesRateTypeId: text("sales_rate_type_id").notNull(),        // "srs" | "scs"
    allowedTemperatures: jsonb("allowed_temperatures").notNull(),  // string[] — ["frozen","chilled","ambient"]
    requiredDocuments: jsonb("required_documents").notNull(),      // string[] — doc codes e.g. ["COMMERCIAL_INVOICE","PACKING_LIST",...]
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
