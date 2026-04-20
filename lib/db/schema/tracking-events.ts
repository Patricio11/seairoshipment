import { pgTable, text, timestamp, boolean, doublePrecision, jsonb, pgEnum, uniqueIndex } from "drizzle-orm/pg-core";
import { containers } from "./containers";

export const trackingEventTypeEnum = pgEnum("tracking_event_type", [
    "EQUIPMENT",
    "TRANSPORT",
    "AIS",
    "HOLD",
    "OTHER",
]);

export const modeOfTransportEnum = pgEnum("mode_of_transport", [
    "TRUCK",
    "VESSEL",
    "RAIL",
    "BARGE",
]);

export const trackingEvents = pgTable("tracking_events", {
    id: text("id").primaryKey(),
    containerId: text("container_id").notNull().references(() => containers.id, { onDelete: "cascade" }),
    metashipEventId: text("metaship_event_id"),
    eventDate: timestamp("event_date").notNull(),
    eventType: trackingEventTypeEnum("event_type").notNull(),
    typeCode: text("type_code"),
    type: text("type"),
    description: text("description").notNull(),
    location: text("location"),
    facilityCode: text("facility_code"),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    modeOfTransport: modeOfTransportEnum("mode_of_transport"),
    isActual: boolean("is_actual").default(true).notNull(),
    isEmpty: boolean("is_empty"),
    vesselName: text("vessel_name"),
    vesselIMO: text("vessel_imo"),
    voyage: text("voyage"),
    registrationNo: text("registration_no"),
    payload: jsonb("payload"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
    uniqMetashipId: uniqueIndex("tracking_events_container_metaship_id_uniq").on(t.containerId, t.metashipEventId),
}));

export type TrackingEvent = typeof trackingEvents.$inferSelect;
export type NewTrackingEvent = typeof trackingEvents.$inferInsert;
