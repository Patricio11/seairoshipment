import { pgTable, text, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";

export const notificationTypeEnum = pgEnum("notification_type", [
    "CONTAINER_THRESHOLD",
    "BOOKING_CREATED",
    "DOCUMENT_UPLOADED",
    "PAYMENT_REMINDER",
]);

export const adminNotifications = pgTable("admin_notifications", {
    id: text("id").primaryKey(),
    type: notificationTypeEnum("type").notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    containerId: text("container_id"),
    isRead: boolean("is_read").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});
