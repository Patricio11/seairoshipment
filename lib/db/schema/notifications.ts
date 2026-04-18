import { pgTable, text, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";
import { user } from "./users";

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

export const clientNotificationTypeEnum = pgEnum("client_notification_type", [
    "BOOKING_APPROVED",
    "BOOKING_REJECTED",
    "PAYMENT_REMINDER",
    "DOCUMENT_REQUEST",
    "SHIPMENT_UPDATE",
    "GENERAL",
]);

export const clientNotifications = pgTable("client_notifications", {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id),
    type: clientNotificationTypeEnum("type").notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    allocationId: text("allocation_id"),
    isRead: boolean("is_read").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});
