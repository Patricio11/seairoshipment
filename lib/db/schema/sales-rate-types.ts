import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const salesRateTypes = pgTable("sales_rate_types", {
    id: text("id").primaryKey(),
    code: text("code").notNull().unique(),
    name: text("name").notNull(),
    description: text("description"),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
