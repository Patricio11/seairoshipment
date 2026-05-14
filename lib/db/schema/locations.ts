import { pgTable, pgEnum, text, boolean, timestamp, unique } from "drizzle-orm/pg-core";

export const locationTypeEnum = pgEnum("location_type", [
    "ORIGIN",
    "DESTINATION",
    "HUB",
]);

/**
 * Each location row is the (code, type) pair — e.g. ZACPT can exist twice,
 * once as ORIGIN and once as DESTINATION, because Cape Town is both a place
 * we export from and a place we'll import into. The code alone is NOT
 * unique; the combination is.
 */
export const locations = pgTable("locations", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    code: text("code").notNull(),
    country: text("country").notNull(),
    type: locationTypeEnum("type").notNull(),
    active: boolean("active").default(true).notNull(),
    coordinates: text("coordinates"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
    codeTypeUnique: unique("locations_code_type_unique").on(t.code, t.type),
}));
