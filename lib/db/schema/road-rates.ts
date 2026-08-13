import { pgTable, text, timestamp, numeric, integer, boolean, unique, index } from "drizzle-orm/pg-core";
import { user } from "./users";

/**
 * Road freight rate lines - tiered per pallet-count band, per route corridor,
 * per customer (amendments round 1, modelled on the Britos rate card):
 *
 *   route      band        p/p price   drops incl   extra drop
 *   CPT-JHB    1-1         R 3 100     1            R 850
 *   CPT-JHB    2-3         R 2 950     2            R 750
 *   CPT-JHB    4-6         R 2 650     2            R 750
 *   ...
 *
 * Resolution order at quote time (band = minPallets <= count <= maxPallets):
 *   1. The customer's own active line matching (route, band).
 *   2. The default line (userId IS NULL) matching (route, band).
 *   3. No line → route/count not quotable, booking blocked with a message.
 *
 * Drop fee = max(0, deliveryPoints - dropsIncluded) × additionalDropFee.
 * Overhang fee = overhang ? palletCount × overhangFeePerPallet : 0.
 * All amounts in ZAR.
 */
export const roadRates = pgTable("road_rates", {
    id: text("id").primaryKey(),
    // null = default rate line for the route (applies to every customer
    // without their own).
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    route: text("route").notNull(), // corridor code, e.g. "CPT-JNB"
    // Pallet-count band this line prices. Existing rows default to 1-28
    // (the whole trailer) so pre-amendment cards keep working.
    minPallets: integer("min_pallets").default(1).notNull(),
    maxPallets: integer("max_pallets").default(28).notNull(),
    transportCostPerPallet: numeric("transport_cost_per_pallet").notNull(),
    // Number of delivery points included in the band price.
    dropsIncluded: integer("drops_included").default(1).notNull(),
    // Charged per delivery point beyond dropsIncluded.
    additionalDropFee: numeric("additional_drop_fee").default("0").notNull(),
    // Charged per pallet when the customer flags overhang = YES.
    overhangFeePerPallet: numeric("overhang_fee_per_pallet").default("0").notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
    // One line per (customer, route, band start). Postgres treats NULLs as
    // distinct in unique constraints, so duplicate default lines are possible
    // at the DB level - the API guards against overlap on create/update.
    userRouteBandUnique: unique("road_rates_user_route_band_unique").on(t.userId, t.route, t.minPallets),
    routeIdx: index("road_rates_route_idx").on(t.route),
}));

export type RoadRate = typeof roadRates.$inferSelect;
export type NewRoadRate = typeof roadRates.$inferInsert;
