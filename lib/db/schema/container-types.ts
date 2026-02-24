import { pgTable, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const containerTypes = pgTable("container_types", {
    id: text("id").primaryKey(),
    size: text("size").notNull(),
    type: text("type").notNull(),
    variant: text("variant"),
    code: text("code").notNull().unique(),
    displayName: text("display_name").notNull(),
    maxPallets: integer("max_pallets").notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
