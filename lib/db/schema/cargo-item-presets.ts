import { pgTable, text, timestamp, integer, numeric, boolean, index } from "drizzle-orm/pg-core";
import { user } from "./users";
import { productCategories } from "./product-categories";

/**
 * Reusable cargo-item dimensions surfaced as a "preset picker" inside the
 * CBM calculator. Two flavours share the table:
 *
 *   - Admin-curated rows  (isAdmin=true, userId=null) — seeded with common
 *     items per product category (Wine 12-bottle case under Wine & Spirits,
 *     Citrus carton under Fruit, Trophy crate under Hunting Trophies, etc.).
 *     The container creation flow already binds a container to a product
 *     category, so the calculator can surface category-relevant presets
 *     first.
 *
 *   - User-saved rows  (isAdmin=false, userId set) — items the client adds
 *     themselves while using the calculator and chooses to keep around.
 *
 * `active=false` soft-deletes without dropping the row so the admin can
 * revive a preset later if a category comes back into rotation.
 */
export const cargoItemPresets = pgTable("cargo_item_presets", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    categoryId: text("category_id").references(() => productCategories.id),
    lengthMm: integer("length_mm").notNull(),
    widthMm: integer("width_mm").notNull(),
    heightMm: integer("height_mm").notNull(),
    weightKg: numeric("weight_kg"),
    isAdmin: boolean("is_admin").default(false).notNull(),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
    categoryIdx: index("cargo_item_presets_category_idx").on(t.categoryId),
    userIdx: index("cargo_item_presets_user_idx").on(t.userId),
    activeIdx: index("cargo_item_presets_active_idx").on(t.active),
}));

export type CargoItemPreset = typeof cargoItemPresets.$inferSelect;
export type NewCargoItemPreset = typeof cargoItemPresets.$inferInsert;
