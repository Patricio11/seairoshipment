import { pgTable, text, timestamp, integer, boolean, jsonb, index, pgEnum } from "drizzle-orm/pg-core";
import { cargoCalculations } from "./cargo-calculations";

/**
 * Public share tokens for a saved cargo calculation. A token grants
 * unauthenticated read-only access to the items + totals + 3D view at
 * /share/cbm/[token]. Used by forwarders to confirm dimensions with a
 * consignee before booking.
 *
 * Two toggles let the owner upgrade the link's permissions:
 *  - `allowApprove`: viewer can click an Approve button on the share page,
 *    enter their name + email, optionally leave a note. Triggers an
 *    in-app notification + email to the owner.
 *  - `allowEdit`: viewer can edit the cargo items inline on the share page
 *    and save changes. Same notification path; also captures a snapshot
 *    of the prior items for owner-side revert.
 *
 * Both default to false so existing shares stay strictly read-only.
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
    allowApprove: boolean("allow_approve").default(false).notNull(),
    allowEdit: boolean("allow_edit").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
    calculationIdx: index("cargo_calculation_shares_calc_idx").on(t.calculationId),
}));

export type CargoCalculationShare = typeof cargoCalculationShares.$inferSelect;
export type NewCargoCalculationShare = typeof cargoCalculationShares.$inferInsert;

/**
 * Audit log of every guest action against a share link. One row per
 * Approve or Edit event. `itemsSnapshot` is the calculation's items
 * **before** the action — for APPROVED rows it's a point-in-time record,
 * for EDITED rows it's the previous state that owner-side Revert restores.
 */
export const shareActionTypeEnum = pgEnum("share_action_type", ["APPROVED", "EDITED"]);

export const cargoCalculationShareActions = pgTable("cargo_calculation_share_actions", {
    id: text("id").primaryKey(),
    shareToken: text("share_token")
        .notNull()
        .references(() => cargoCalculationShares.token, { onDelete: "cascade" }),
    calculationId: text("calculation_id")
        .notNull()
        .references(() => cargoCalculations.id, { onDelete: "cascade" }),
    action: shareActionTypeEnum("action").notNull(),
    guestName: text("guest_name").notNull(),
    guestEmail: text("guest_email").notNull(),
    note: text("note"),
    itemsSnapshot: jsonb("items_snapshot"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
    calcIdx: index("cargo_calculation_share_actions_calc_idx").on(t.calculationId),
    tokenIdx: index("cargo_calculation_share_actions_token_idx").on(t.shareToken),
}));

export type CargoCalculationShareAction = typeof cargoCalculationShareActions.$inferSelect;
export type NewCargoCalculationShareAction = typeof cargoCalculationShareActions.$inferInsert;
