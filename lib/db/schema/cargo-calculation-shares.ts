import { pgTable, text, timestamp, integer, index } from "drizzle-orm/pg-core";
import { cargoCalculations } from "./cargo-calculations";

/**
 * Public share tokens for a saved cargo calculation. A token grants
 * unauthenticated read-only access to the items + totals + 3D view at
 * /share/cbm/[token]. Used by forwarders to confirm dimensions with a
 * consignee before booking.
 *
 * - `token` is the primary key and the URL slug; generated as a long random
 *   string (not sequential) so they're not guessable.
 * - `expiresAt` is optional — null means the link is open until revoked.
 * - `revokedAt` is set when the owner clicks "Revoke" on the calc page.
 *   Access is rejected when revokedAt IS NOT NULL or expiresAt < now().
 * - `accessCount` and `lastAccessedAt` give the owner basic visibility
 *   into who's actually opened the link (without identifying viewers).
 */
export const cargoCalculationShares = pgTable("cargo_calculation_shares", {
    token: text("token").primaryKey(),
    calculationId: text("calculation_id")
        .notNull()
        .references(() => cargoCalculations.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at"),
    revokedAt: timestamp("revoked_at"),
    accessCount: integer("access_count").default(0).notNull(),
    lastAccessedAt: timestamp("last_accessed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
    calculationIdx: index("cargo_calculation_shares_calc_idx").on(t.calculationId),
}));

export type CargoCalculationShare = typeof cargoCalculationShares.$inferSelect;
export type NewCargoCalculationShare = typeof cargoCalculationShares.$inferInsert;
