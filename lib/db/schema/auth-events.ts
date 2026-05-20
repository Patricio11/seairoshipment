import { pgTable, text, timestamp, pgEnum, index } from "drizzle-orm/pg-core";
import { user } from "./users";

/**
 * Append-only audit trail for security-sensitive auth actions. Single source
 * of truth for who-did-what-when on 2FA. Used by the Settings → Security
 * activity panel and by a future security-team review surface.
 *
 * `event` enum is closed - adding a new event type requires schema + code
 * changes, which keeps the audit table from drifting into "log anything"
 * mush.
 */
export const authEventTypeEnum = pgEnum("auth_event_type", [
    "TWO_FACTOR_ENABLED",                // user successfully enrolled
    "TWO_FACTOR_DISABLED",               // user disabled (from Settings)
    "TWO_FACTOR_VERIFY_SUCCESS",         // sign-in challenge passed
    "TWO_FACTOR_VERIFY_FAILED",          // sign-in challenge failed
    "TWO_FACTOR_BACKUP_CODES_REGENERATED", // user clicked Regenerate
    "TWO_FACTOR_BACKUP_CODE_USED",       // sign-in via a backup code (compromise signal)
    "TWO_FACTOR_ADMIN_RESET",            // admin used the break-glass disable on another user
]);

export const authEvents = pgTable(
    "auth_events",
    {
        id: text("id").primaryKey(),
        userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
        event: authEventTypeEnum("event").notNull(),
        // For ADMIN_RESET: the admin who performed the action. For everything
        // else: null (the event is about the userId above, performed by them).
        actorId: text("actor_id").references(() => user.id, { onDelete: "set null" }),
        ip: text("ip"),                // captured from x-forwarded-for / req
        userAgent: text("user_agent"), // truncated to 500 chars at insert time
        createdAt: timestamp("created_at").defaultNow().notNull(),
    },
    (t) => ({
        userIdx: index("auth_events_user_idx").on(t.userId),
        createdAtIdx: index("auth_events_created_idx").on(t.createdAt),
    }),
);

export type AuthEvent = typeof authEvents.$inferSelect;
export type AuthEventType = (typeof authEventTypeEnum.enumValues)[number];
