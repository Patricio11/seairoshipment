import {
    pgTable,
    pgEnum,
    text,
    numeric,
    integer,
    boolean,
    timestamp,
} from "drizzle-orm/pg-core";
import { salesRateTypes } from "./sales-rate-types";
import { containerTypes } from "./container-types";

export const chargeTypeEnum = pgEnum("charge_type", [
    "PER_PALLET",
    "PER_CONTAINER",
    "FIXED",
]);

// ── Origin Charges (header) ──
export const originCharges = pgTable("origin_charges", {
    id: text("id").primaryKey(),
    salesRateTypeId: text("sales_rate_type_id").references(
        () => salesRateTypes.id
    ),
    originId: text("origin_id").notNull(),
    originName: text("origin_name").notNull(),
    containerId: text("container_id")
        .notNull()
        .references(() => containerTypes.id),
    effectiveFrom: text("effective_from").notNull(),
    effectiveTo: text("effective_to"),
    currency: text("currency").default("ZAR").notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Origin Charge Items ──
export const originChargeItems = pgTable("origin_charge_items", {
    id: text("id").primaryKey(),
    originChargeId: text("origin_charge_id")
        .notNull()
        .references(() => originCharges.id, { onDelete: "cascade" }),
    chargeCode: text("charge_code").default("").notNull(),
    chargeName: text("charge_name").notNull(),
    chargeType: chargeTypeEnum("charge_type").notNull(),
    category: text("category").default("OTHER").notNull(),
    unitCost: numeric("unit_cost"),
    containerCost: numeric("container_cost"),
    mandatory: boolean("mandatory").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Ocean Freight Rates ──
export const oceanFreightRates = pgTable("ocean_freight_rates", {
    id: text("id").primaryKey(),
    salesRateTypeId: text("sales_rate_type_id").references(
        () => salesRateTypes.id
    ),
    origin: text("origin").notNull(),
    destinationCountry: text("destination_country").notNull(),
    destinationPort: text("destination_port").notNull(),
    destinationPortCode: text("destination_port_code").notNull(),
    shippingLine: text("shipping_line").default("MSC").notNull(),
    containerId: text("container_id")
        .notNull()
        .references(() => containerTypes.id),
    effectiveFrom: text("effective_from").notNull(),
    effectiveTo: text("effective_to"),
    freightUSD: numeric("freight_usd").default("0").notNull(),
    bafUSD: numeric("baf_usd").default("0").notNull(),
    ispsUSD: numeric("isps_usd").default("0").notNull(),
    otherSurchargesUSD: numeric("other_surcharges_usd").default("0").notNull(),
    rcgUSD: numeric("rcg_usd").default("0").notNull(),
    totalUSD: numeric("total_usd").default("0").notNull(),
    exchangeRate: numeric("exchange_rate").default("0").notNull(),
    totalZAR: numeric("total_zar").default("0").notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Destination Charges (header) ──
export const destinationCharges = pgTable("destination_charges", {
    id: text("id").primaryKey(),
    salesRateTypeId: text("sales_rate_type_id").references(
        () => salesRateTypes.id
    ),
    destinationId: text("destination_id").notNull(),
    destinationName: text("destination_name").notNull(),
    destinationPortCode: text("destination_port_code").notNull(),
    containerId: text("container_id")
        .notNull()
        .references(() => containerTypes.id),
    currency: text("currency").notNull(),
    exchangeRateToZAR: numeric("exchange_rate_to_zar").notNull(),
    effectiveFrom: text("effective_from").notNull(),
    effectiveTo: text("effective_to"),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Destination Charge Items ──
export const destinationChargeItems = pgTable("destination_charge_items", {
    id: text("id").primaryKey(),
    destinationChargeId: text("destination_charge_id")
        .notNull()
        .references(() => destinationCharges.id, { onDelete: "cascade" }),
    chargeCode: text("charge_code").default("").notNull(),
    chargeName: text("charge_name").notNull(),
    chargeType: text("charge_type").default("PER_CONTAINER").notNull(),
    amountLocal: numeric("amount_local").notNull(),
    amountZAR: numeric("amount_zar").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
