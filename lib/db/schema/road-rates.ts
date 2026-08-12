import { pgTable, text, timestamp, numeric, boolean, unique, index } from "drizzle-orm/pg-core";
import { user } from "./users";

/**
 * Road freight rates - the 3 cost lines for a refrigerated road consolidation
 * booking, loaded per route corridor and optionally per customer.
 *
 * Resolution order at quote time:
 *   1. Row where (userId = customer, route) - customer-specific structure.
 *   2. Row where (userId IS NULL, route)    - the default rate card.
 *   3. No row → route not quotable, booking blocked with a clear message.
 *
 * Per the plan: "Rates will need to be loaded per customer as customers may
 * have different rate structures based on the volume that they send."
 *
 * All amounts in ZAR.
 */
export const roadRates = pgTable("road_rates", {
    id: text("id").primaryKey(),
    // null = default rate card for the route (applies to every customer
    // without their own row).
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    route: text("route").notNull(), // corridor code, e.g. "CPT-JNB"
    transportCostPerPallet: numeric("transport_cost_per_pallet").notNull(),
    // Charged once per booking when there is more than one delivery point.
    additionalDropFee: numeric("additional_drop_fee").default("0").notNull(),
    // Charged per pallet when the customer flags overhang = YES.
    overhangFeePerPallet: numeric("overhang_fee_per_pallet").default("0").notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
    // One rate card per (customer, route). Postgres treats NULLs as distinct
    // in unique constraints, so multiple default rows per route are possible
    // at the DB level - the API guards against that on create.
    userRouteUnique: unique("road_rates_user_route_unique").on(t.userId, t.route),
    routeIdx: index("road_rates_route_idx").on(t.route),
}));

export type RoadRate = typeof roadRates.$inferSelect;
export type NewRoadRate = typeof roadRates.$inferInsert;
