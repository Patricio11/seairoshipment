import { pgTable, text, integer, numeric, boolean, timestamp } from "drizzle-orm/pg-core";

export const containerTypes = pgTable("container_types", {
    id: text("id").primaryKey(),
    size: text("size").notNull(),
    type: text("type").notNull(),
    variant: text("variant"),
    code: text("code").notNull().unique(),
    displayName: text("display_name").notNull(),
    maxPallets: integer("max_pallets").notNull(),
    // Volumetric capacity for CBM bookings + internal dimensions for the future
    // 3D loading planner. Industry-standard interior figures: 20ft ≈ 33.2 m³,
    // 40ft ≈ 67.7 m³, 40ft HC ≈ 76.4 m³. Nullable so existing rows survive the
    // migration; admin fills these in when seeding new types.
    volumeCBM: numeric("volume_cbm"),
    internalLengthMm: integer("internal_length_mm"),
    internalWidthMm: integer("internal_width_mm"),
    internalHeightMm: integer("internal_height_mm"),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
