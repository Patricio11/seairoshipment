import { pgTable, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { user } from "./users";
import { products } from "./products";
import { sailings } from "./sailings";

export const containerRequestStatusEnum = pgEnum("container_request_status", [
    "PENDING",      // awaiting admin review
    "ACKNOWLEDGED", // admin has seen it / is working on it
    "FULFILLED",    // admin created a matching container; client can now book
    "DECLINED",     // admin can't fulfill this one
]);

/**
 * A request from a client when no existing container matches their desired
 * route + product + temperature + sailing combination. Admin reviews these
 * and either creates a matching container (FULFILLED) or declines.
 */
export const containerRequests = pgTable("container_requests", {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id),

    // Desired route
    originCode: text("origin_code").notNull(),
    destinationCode: text("destination_code").notNull(),

    // Desired spec
    salesRateTypeId: text("sales_rate_type_id").default("srs").notNull(),
    productId: text("product_id").references(() => products.id),
    temperature: text("temperature"),
    sailingId: text("sailing_id").references(() => sailings.id),

    // Volume
    palletCount: integer("pallet_count").notNull(),

    // Desired sailing date (if no specific sailing chosen but client has a target)
    desiredEtd: timestamp("desired_etd"),

    // Additional freeform details
    commodityNotes: text("commodity_notes"),  // client can describe if product isn't in list
    notes: text("notes"),                     // any other info

    status: containerRequestStatusEnum("status").default("PENDING").notNull(),
    adminResponse: text("admin_response"),    // admin can leave a message on fulfill/decline
    fulfilledContainerId: text("fulfilled_container_id"),  // if admin creates a container, link it

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
