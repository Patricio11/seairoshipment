import { pgTable, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { palletAllocations } from "./pallet-allocations";
import { user } from "./users";

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

export const documents = pgTable("documents", {
    id: text("id").primaryKey(),
    allocationId: text("allocation_id").references(() => palletAllocations.id),
    userId: text("user_id").notNull().references(() => user.id),
    originalName: text("original_name").notNull(),
    storedName: text("stored_name").notNull(), // e.g. "ACC-1001_Invoice_SRS-9921.pdf"
    type: documentTypeEnum("type").notNull(),
    url: text("url"),
    status: documentStatusEnum("status").default("PENDING").notNull(),
    uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});
