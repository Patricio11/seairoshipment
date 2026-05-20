import { pgTable, text, timestamp, numeric, boolean, jsonb, index } from "drizzle-orm/pg-core";
import { user } from "./users";
import { cargoTypeEnum } from "./containers";
import type { CargoItem } from "./pallet-allocations";

/**
 * User-saved CBM (cubic-metre) calculations. The Tools section reads + writes
 * here; the booking wizard *consumes* calculations by snapshotting their items
 * into a `pallet_allocations.cargoItems` array at booking time.
 *
 * `cargoType` stays as an enum field even though v1 only writes CUBE - keeps
 * the door open for future calculator types (chargeable weight, palletisation
 * etc.) that may want a different model but share this list endpoint.
 *
 * `totals` are stored alongside the items for fast list rendering. The server
 * recomputes them on every save from the items themselves so we don't trust
 * client-supplied totals.
 */
export const cargoCalculations = pgTable("cargo_calculations", {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    cargoType: cargoTypeEnum("cargo_type").default("CUBE").notNull(),
    cargoItems: jsonb("cargo_items").$type<CargoItem[]>().notNull(),
    totalCBM: numeric("total_cbm").notNull(),
    volumetricWeightKg: numeric("volumetric_weight_kg"),
    totalWeightKg: numeric("total_weight_kg"),
    notes: text("notes"),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
    userIdx: index("cargo_calculations_user_idx").on(t.userId),
    activeIdx: index("cargo_calculations_active_idx").on(t.active),
}));

export type CargoCalculation = typeof cargoCalculations.$inferSelect;
export type NewCargoCalculation = typeof cargoCalculations.$inferInsert;
