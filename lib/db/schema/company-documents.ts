import { pgTable, text, timestamp, integer, pgEnum, index } from "drizzle-orm/pg-core";
import { user } from "./users";

export const companyDocumentTypeEnum = pgEnum("company_document_type", [
    "COMPANY_REG_CERT",   // CIPC / company registration certificate
    "PROOF_OF_ADDRESS",   // utility bill / lease etc.
    "VAT_CERT",           // optional VAT registration certificate
    "OTHER",              // catch-all for ad-hoc admin requests
]);

/**
 * Per-user onboarding documents — uploaded during /auth/onboarding,
 * reviewed by an admin before the user is approved.
 *
 * Distinct from `documents` which is per-allocation shipment paperwork.
 */
export const companyDocuments = pgTable("company_documents", {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    type: companyDocumentTypeEnum("type").notNull(),
    originalName: text("original_name").notNull(),
    storedName: text("stored_name"),
    url: text("url").notNull(),
    mimeType: text("mime_type"),
    sizeBytes: integer("size_bytes"),
    notes: text("notes"), // admin scratch
    uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
}, (t) => ({
    userIdx: index("company_documents_user_idx").on(t.userId),
}));

export type CompanyDocument = typeof companyDocuments.$inferSelect;
export type NewCompanyDocument = typeof companyDocuments.$inferInsert;
