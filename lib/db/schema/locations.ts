import { pgTable, pgEnum, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const locationTypeEnum = pgEnum("location_type", [
    "ORIGIN",
    "DESTINATION",
    "HUB",
]);

export const locations = pgTable("locations", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    code: text("code").notNull().unique(),
    country: text("country").notNull(),
    type: locationTypeEnum("type").notNull(),
    active: boolean("active").default(true).notNull(),
    coordinates: text("coordinates"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
