import { pgTable, text, timestamp, integer, numeric, pgEnum } from "drizzle-orm/pg-core";
import { containers } from "./containers";
import { user } from "./users";

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
    salesRateTypeId: text("sales_rate_type_id").default("srs"),
    status: allocationStatusEnum("status").default("PENDING").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
