import { pgTable, text, timestamp, integer, numeric, pgEnum } from "drizzle-orm/pg-core";
import { palletAllocations } from "./pallet-allocations";
import { user } from "./users";
import { cargoTypeEnum } from "./containers";

export const invoiceStatusEnum = pgEnum("invoice_status", [
    "PENDING",
    "PAID",
    "OVERDUE",
    "CANCELLED",
]);

export const invoiceTypeEnum = pgEnum("invoice_type", [
    "DEPOSIT",
    "BALANCE",
]);

export const invoices = pgTable("invoices", {
    id: text("id").primaryKey(),
    allocationId: text("allocation_id").references(() => palletAllocations.id),
    userId: text("user_id")
        .notNull()
        .references(() => user.id),
    type: invoiceTypeEnum("type").notNull(),
    status: invoiceStatusEnum("status").default("PENDING").notNull(),
    bookingRef: text("booking_ref").notNull(),
    route: text("route").notNull(),
    // Polymorphic billable unit: PALLET invoices use `palletCount`; CUBE
    // invoices use `cbmVolume`. `palletCount` stays NOT NULL (default 0 on
    // Cube rows) because too many existing queries reference it directly.
    cargoType: cargoTypeEnum("cargo_type").default("PALLET").notNull(),
    palletCount: integer("pallet_count").notNull(),
    cbmVolume: numeric("cbm_volume"),
    originChargesZAR: numeric("origin_charges_zar").notNull(),
    oceanFreightZAR: numeric("ocean_freight_zar").notNull(),
    destinationChargesZAR: numeric("destination_charges_zar").notNull(),
    subtotalZAR: numeric("subtotal_zar").notNull(),
    percentage: integer("percentage").notNull(),
    amountZAR: numeric("amount_zar").notNull(),
    poNumber: text("po_number"),
    reminderSentAt: timestamp("reminder_sent_at"),
    dueDate: timestamp("due_date").notNull(),
    paidAt: timestamp("paid_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
