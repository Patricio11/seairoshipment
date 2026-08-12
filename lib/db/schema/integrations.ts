import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";

/**
 * Platform integrations - admin-managed external service credentials,
 * configured / tested / enabled from /admin/integrations (never env vars).
 *
 * Pattern mirrors the Philasa build: one row per provider key, credentials
 * stored as an AES-256-GCM-encrypted JSON blob (lib/crypto.ts), an `enabled`
 * switch, and per-provider save/test server actions.
 *
 * Provider keys in v1:
 *   - "google_maps"  → Maps/Places API key (address autocomplete + pins for road freight)
 *   - "resend"       → Resend email (upgrade path from SMTP; api key + from address)
 *   - "whatsapp"     → WhatsApp Business Cloud API (truck progress messages)
 *
 * Feature code asks `getIntegration(key)` and behaves gracefully when the
 * integration is missing or disabled - dormant by default.
 */
export const integrations = pgTable("integrations", {
    key: text("key").primaryKey(),
    credentialsEnc: text("credentials_enc"),
    enabled: boolean("enabled").default(false).notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Integration = typeof integrations.$inferSelect;
