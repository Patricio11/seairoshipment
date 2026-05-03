import { pgTable, text, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { palletAllocations } from "./pallet-allocations";
import { user } from "./users";
import { containers } from "./containers";

export const documentTypeEnum = pgEnum("document_type", [
    "INVOICE",
    "BOL",
    "COA",
    "PACKING_LIST",
    "OTHER",
]);

export const documentStatusEnum = pgEnum("document_status", [
    "PENDING",
    "APPROVED",
    "REJECTED",
]);

/**
 * Where this document came from:
 *  - CLIENT_UPLOAD: client uploaded in step-3 of booking
 *  - METASHIP_CLIENT: pulled from MetaShip, matched to a specific allocation by account-number prefix in the doc name
 *  - METASHIP_SHARED: pulled from MetaShip, applies to the whole container (no account-number match)
 */
export const documentSourceEnum = pgEnum("document_source", [
    "CLIENT_UPLOAD",
    "METASHIP_CLIENT",
    "METASHIP_SHARED",
]);

export const documents = pgTable("documents", {
    id: text("id").primaryKey(),
    allocationId: text("allocation_id").references(() => palletAllocations.id),
    containerId: text("container_id").references(() => containers.id),
    userId: text("user_id").notNull().references(() => user.id),
    originalName: text("original_name").notNull(),
    storedName: text("stored_name").notNull(),
    type: documentTypeEnum("type").notNull(),
    documentCode: text("document_code"),
    url: text("url"),
    mimeType: text("mime_type"),
    sizeBytes: integer("size_bytes"),

    // MetaShip sync metadata
    source: documentSourceEnum("source").default("CLIENT_UPLOAD").notNull(),
    metashipDocumentId: integer("metaship_document_id"),
    metashipReference: text("metaship_reference"),
    metashipDownloadUrl: text("metaship_download_url"),
    metashipUrlExpiresAt: timestamp("metaship_url_expires_at"),

    status: documentStatusEnum("status").default("PENDING").notNull(),
    uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});
