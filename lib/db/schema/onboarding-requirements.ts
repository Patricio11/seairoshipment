import { pgTable, text, timestamp, integer, boolean, index } from "drizzle-orm/pg-core";
import { user } from "./users";

/**
 * Admin-managed list of documents a client must provide during onboarding.
 *
 * Two flavours share the same row:
 *   - "Fillable template" — admin uploads a file, presence of `templateUrl`
 *     flips this row into a download-and-fill flow. The verification email
 *     links to the file; on the onboarding form the user gets a "Download
 *     original" link plus an upload slot for their filled version.
 *   - "User document" — `templateUrl` is null. The card is just a labelled
 *     upload slot (e.g. "Tax Clearance Certificate"); the user uploads
 *     their own file.
 *
 * `active = false` soft-deletes a row without losing history. The form
 * only renders active rows; the admin reviewer can still see uploads
 * that answered an inactive requirement.
 */
export const onboardingRequirements = pgTable("onboarding_requirements", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),

    // If set, this requirement is a fillable template the user must download
    templateUrl: text("template_url"),
    templateOriginalName: text("template_original_name"),
    templateMimeType: text("template_mime_type"),
    templateSizeBytes: integer("template_size_bytes"),

    required: boolean("required").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    active: boolean("active").default(true).notNull(),

    uploadedBy: text("uploaded_by").references(() => user.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
    sortIdx: index("onboarding_requirements_sort_idx").on(t.sortOrder),
    activeIdx: index("onboarding_requirements_active_idx").on(t.active),
}));

export type OnboardingRequirement = typeof onboardingRequirements.$inferSelect;
export type NewOnboardingRequirement = typeof onboardingRequirements.$inferInsert;
