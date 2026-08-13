import { pgTable, text, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";

// Staff roles beyond admin (road freight amendments):
//   road_manager - road side only, full control there (trucks, rates, approvals)
//   road_ops     - road side only, operational: confirm loads, PODs, WhatsApp;
//                  no rates, no invoicing, no truck amendments
export const roleEnum = pgEnum("role", ["admin", "client", "road_manager", "road_ops"]);

export const vettingStatusEnum = pgEnum("vetting_status", [
    "EMAIL_PENDING",       // signed up, awaiting email verification
    "ONBOARDING_PENDING",  // email verified, hasn't completed onboarding (or admin reopened it)
    "PENDING_REVIEW",      // onboarding submitted, waiting on admin
    "APPROVED",            // admin approved → dashboard unlocked
    "REJECTED",            // admin rejected with a reason
]);

/**
 * Per-customer payment terms (road freight amendments round 1). Selected by
 * the admin at vetting approval and editable afterwards; drives how road
 * booking invoices are generated:
 *   SPLIT_60_40      - 60% deposit on confirmation, 40% balance (default)
 *   NET_30_STATEMENT - single 100% invoice, 30 days from statement
 *   NET_7_DELIVERY   - single 100% invoice, 7 days from delivery
 */
export const paymentTermsEnum = pgEnum("payment_terms", [
    "SPLIT_60_40",
    "NET_30_STATEMENT",
    "NET_7_DELIVERY",
]);

export const user = pgTable("user", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("emailVerified").notNull(),
    image: text("image"),
    createdAt: timestamp("createdAt").notNull(),
    updatedAt: timestamp("updatedAt").notNull(),

    // SRS Operational Fields
    role: roleEnum("role").default("client").notNull(),
    isVetted: boolean("isVetted").default(false).notNull(),
    accountNumber: text("accountNumber").unique(),
    companyName: text("companyName"),
    companyReg: text("companyReg"),

    // Onboarding & vetting
    vettingStatus: vettingStatusEnum("vetting_status").default("EMAIL_PENDING").notNull(),
    vettingRejectionReason: text("vetting_rejection_reason"),
    vettingAdminNote: text("vetting_admin_note"), // shown to user when admin requests changes
    vettingReviewedAt: timestamp("vetting_reviewed_at"),
    vettingReviewedBy: text("vetting_reviewed_by"),
    companyAddress: text("company_address"),
    companyCountry: text("company_country"), // 2-letter ISO code
    vatNumber: text("vat_number"),

    // Payment terms - set by admin at approval, drives road invoice generation
    paymentTerms: paymentTermsEnum("payment_terms").default("SPLIT_60_40").notNull(),

    // Two-factor auth (Better Auth twoFactor plugin).
    // input: false → never settable from client; only the plugin's enable/disable flows flip it.
    twoFactorEnabled: boolean("twoFactorEnabled").default(false),
});

// Better Auth twoFactor plugin storage: one row per user with an enrolled TOTP.
// Created/deleted by the plugin itself - we just declare the table shape so Drizzle/Postgres
// has the right columns. `secret` and `backupCodes` are stored as plaintext-from-the-plugin
// (Better Auth signs them internally); `returned: false` in the plugin schema means they're
// never echoed in API responses.
export const twoFactor = pgTable("twoFactor", {
    id: text("id").primaryKey(),
    userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
    secret: text("secret").notNull(),
    backupCodes: text("backupCodes").notNull(),
});

export const session = pgTable("session", {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expiresAt").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("createdAt").notNull(),
    updatedAt: timestamp("updatedAt").notNull(),
    ipAddress: text("ipAddress"),
    userAgent: text("userAgent"),
    userId: text("userId").notNull().references(() => user.id),
});

export const account = pgTable("account", {
    id: text("id").primaryKey(),
    accountId: text("accountId").notNull(),
    providerId: text("providerId").notNull(),
    userId: text("userId").notNull().references(() => user.id),
    accessToken: text("accessToken"),
    refreshToken: text("refreshToken"),
    idToken: text("idToken"),
    accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
    refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("createdAt").notNull(),
    updatedAt: timestamp("updatedAt").notNull(),
});

export const verification = pgTable("verification", {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    createdAt: timestamp("createdAt"),
    updatedAt: timestamp("updatedAt"),
});
