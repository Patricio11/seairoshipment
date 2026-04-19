import { pgTable, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

/**
 * Sailing schedules synced from MetaShip.
 * Each row represents one sailing (vessel + voyage on a route with ETD/ETA).
 */
export const sailings = pgTable("sailings", {
    id: text("id").primaryKey(), // e.g. "sail-{metashipId}"
    metashipId: text("metaship_id").notNull().unique(),
    vesselName: text("vessel_name").notNull(),
    voyageNumber: text("voyage_number").default("").notNull(),
    shippingLine: text("shipping_line").default("MSC").notNull(),
    portOfLoadValue: text("port_of_load_value").notNull(),     // UN/LOCODE
    portOfLoadCity: text("port_of_load_city").default("").notNull(),
    portOfDischargeValue: text("port_of_discharge_value").notNull(),
    portOfDischargeCity: text("port_of_discharge_city").default("").notNull(),
    originCountry: text("origin_country").default("").notNull(),
    destinationCountry: text("destination_country").default("").notNull(),
    etd: timestamp("etd").notNull(),
    eta: timestamp("eta"),
    transitTime: integer("transit_time"), // days
    serviceType: text("service_type"), // DIRECT | INDIRECT
    active: boolean("active").default(true).notNull(),
    lastSyncedAt: timestamp("last_synced_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
