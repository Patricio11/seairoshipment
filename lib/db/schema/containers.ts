import { pgTable, text, timestamp, integer, numeric, doublePrecision, pgEnum } from "drizzle-orm/pg-core";
import { containerTypes } from "./container-types";
import { sailings } from "./sailings";
import { productCategories } from "./product-categories";

export const containerStatusEnum = pgEnum("container_status", [
    "OPEN",
    "THRESHOLD_REACHED",
    "BOOKED",
    "SAILING",
    "DELIVERED",
]);

export const trackingSubscriptionStatusEnum = pgEnum("tracking_subscription_status", [
    "NONE",
    "SUBSCRIBED",
    "FAILED",
    "UNSUBSCRIBED",
]);

export const containerTypeEnum = pgEnum("container_type", ["20FT", "40FT"]);

export const temperatureEnum = pgEnum("temperature", [
    "frozen",   // -18°C
    "chilled",  // +5°C
    "ambient",  // +18°C
]);

/**
 * Cargo type — distinguishes pallet-based bookings (the existing model) from
 * CBM-based bookings (new). Lives on the container at creation time and is
 * inherited by every allocation that books into it. Locked after creation.
 *
 * Imported by pallet_allocations, rate cards and invoices so the same enum
 * value flows end-to-end without conversion noise.
 */
export const cargoTypeEnum = pgEnum("cargo_type", ["PALLET", "CUBE"]);

export const containers = pgTable("containers", {
    id: text("id").primaryKey(),
    route: text("route").notNull(), // e.g. "ZACPT-NLRTM"
    vessel: text("vessel").notNull(),
    voyageNumber: text("voyage_number"),
    sailingScheduleId: text("sailing_schedule_id"),
    sailingId: text("sailing_id").references(() => sailings.id), // new: link to our sailings table
    type: containerTypeEnum("type").default("40FT").notNull(),
    containerTypeId: text("container_type_id").references(() => containerTypes.id),
    categoryId: text("category_id").references(() => productCategories.id), // product category locked in at creation
    temperature: temperatureEnum("temperature"), // cargo temperature regime for this container
    etd: timestamp("etd"),
    eta: timestamp("eta"),
    totalPallets: integer("total_pallets").default(0).notNull(),
    maxCapacity: integer("max_capacity").default(20).notNull(),
    // Cargo type is set once at creation. PALLET containers track totalPallets +
    // maxCapacity; CUBE containers track totalCBM + maxCapacityCBM. Both columns
    // exist on every row to keep queries simple; nulls are fine on the dimension
    // that doesn't apply.
    cargoType: cargoTypeEnum("cargo_type").default("PALLET").notNull(),
    totalCBM: numeric("total_cbm").default("0").notNull(),
    maxCapacityCBM: numeric("max_capacity_cbm"),
    status: containerStatusEnum("status").default("OPEN").notNull(),
    salesRateTypeId: text("sales_rate_type_id").default("srs").notNull(),
    metashipOrderNo: text("metaship_order_no"),
    metashipReference: text("metaship_reference"),
    metashipOrderId: integer("metaship_order_id"),  // numeric id used for document upload
    metashipTrackingSubscriptionId: text("metaship_tracking_subscription_id"),
    metashipContainerNo: text("metaship_container_no"), // ISO 6346 — populated from first tracking event
    trackingStatus: trackingSubscriptionStatusEnum("tracking_status").default("NONE").notNull(),
    lastPositionLat: doublePrecision("last_position_lat"),
    lastPositionLng: doublePrecision("last_position_lng"),
    lastPositionType: text("last_position_type"), // VESSEL | AIS | TRUCK
    lastPositionAt: timestamp("last_position_at"),
    lastEventType: text("last_event_type"),
    lastEventAt: timestamp("last_event_at"),
    lastEventDescription: text("last_event_description"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
