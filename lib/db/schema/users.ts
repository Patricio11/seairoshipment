import { pgTable, text, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["admin", "client"]);

export const vettingStatusEnum = pgEnum("vetting_status", [
    "EMAIL_PENDING",       // signed up, awaiting email verification
    "ONBOARDING_PENDING",  // email verified, hasn't completed onboarding (or admin reopened it)
    "PENDING_REVIEW",      // onboarding submitted, waiting on admin
    "APPROVED",            // admin approved → dashboard unlocked
    "REJECTED",            // admin rejected with a reason
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
