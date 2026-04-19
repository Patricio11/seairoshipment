import { pgTable, text, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { containerTypes } from "./container-types";

export const containerStatusEnum = pgEnum("container_status", [
    "OPEN",
    "THRESHOLD_REACHED",
    "BOOKED",
    "SAILING",
    "DELIVERED",
]);

export const containerTypeEnum = pgEnum("container_type", ["20FT", "40FT"]);

export const containers = pgTable("containers", {
    id: text("id").primaryKey(),
    route: text("route").notNull(), // e.g. "ZACPT-NLRTM"
    vessel: text("vessel").notNull(),
    voyageNumber: text("voyage_number"),
    sailingScheduleId: text("sailing_schedule_id"),
    type: containerTypeEnum("type").default("40FT").notNull(),
    containerTypeId: text("container_type_id").references(() => containerTypes.id),
    etd: timestamp("etd"),
    eta: timestamp("eta"),
    totalPallets: integer("total_pallets").default(0).notNull(),
    maxCapacity: integer("max_capacity").default(20).notNull(),
    status: containerStatusEnum("status").default("OPEN").notNull(),
    salesRateTypeId: text("sales_rate_type_id").default("srs").notNull(),
    metashipOrderNo: text("metaship_order_no"),
    metashipReference: text("metaship_reference"),
    metashipOrderId: integer("metaship_order_id"),  // numeric id used for document upload
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
