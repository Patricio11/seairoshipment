import { pgTable, text, timestamp, integer, numeric, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { containers, cargoTypeEnum } from "./containers";
import { user } from "./users";

export interface CollectionAddress {
    label?: string;
    address: string;
}

/**
 * One line of measured cargo on a Cube allocation - snapshotted from a
 * saved `cargo_calculations` row at booking time. Stored as JSONB on the
 * allocation so future edits to the source calculation never mutate
 * historical bookings.
 */
export interface CargoItem {
    id: string;        // local nanoid for editing UI
    label?: string;    // optional friendly name e.g. "Wine 12-bottle case"
    lengthMm: number;
    widthMm: number;
    heightMm: number;
    weightKg: number;  // per single unit
    quantity: number;
}

export const allocationStatusEnum = pgEnum("allocation_status", [
    "PENDING",
    "CONFIRMED",
    "CANCELLED",
]);

export const palletAllocations = pgTable("pallet_allocations", {
    id: text("id").primaryKey(),
    containerId: text("container_id").notNull().references(() => containers.id),
    userId: text("user_id").notNull().references(() => user.id),
    palletCount: integer("pallet_count").notNull(),
    productId: text("product_id"), // MetaShip product ID
    commodityName: text("commodity_name"),
    hsCode: text("hs_code"),
    nettWeight: numeric("nett_weight"), // kg
    grossWeight: numeric("gross_weight"), // kg
    temperature: text("temperature"),
    consigneeName: text("consignee_name"),
    consigneeAddress: text("consignee_address"),
    collectionAddresses: jsonb("collection_addresses").$type<CollectionAddress[]>(),
    salesRateTypeId: text("sales_rate_type_id").default("srs"),
    // Cargo type - PALLET keeps `palletCount` meaningful; CUBE uses the three
    // cube fields below and `palletCount` is left at 0 (the column is NOT NULL
    // so we can't make it null; 0 acts as the sentinel for "doesn't apply").
    cargoType: cargoTypeEnum("cargo_type").default("PALLET").notNull(),
    cbmVolume: numeric("cbm_volume"),
    volumetricWeightKg: numeric("volumetric_weight_kg"),
    cargoItems: jsonb("cargo_items").$type<CargoItem[]>(),
    // Soft reference to the source calculation - for navigation only. The
    // items above are an immutable snapshot taken at booking time. We use
    // a plain text column instead of a strict FK here because the cargo
    // calculations table is defined in another file (circular import risk)
    // and ON DELETE SET NULL is handled at the API layer.
    calculationId: text("calculation_id"),
    status: allocationStatusEnum("status").default("PENDING").notNull(),
    rejectionReason: text("rejection_reason"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
