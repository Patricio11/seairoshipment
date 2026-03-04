import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { invoices, palletAllocations, user } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const isAdmin = (session.user as { role?: string }).role === "admin";

        if (isAdmin) {
            const results = await db
                .select({
                    id: invoices.id,
                    type: invoices.type,
                    status: invoices.status,
                    bookingRef: invoices.bookingRef,
                    route: invoices.route,
                    palletCount: invoices.palletCount,
                    originChargesZAR: invoices.originChargesZAR,
                    oceanFreightZAR: invoices.oceanFreightZAR,
                    destinationChargesZAR: invoices.destinationChargesZAR,
                    subtotalZAR: invoices.subtotalZAR,
                    percentage: invoices.percentage,
                    amountZAR: invoices.amountZAR,
                    poNumber: invoices.poNumber,
                    reminderSentAt: invoices.reminderSentAt,
                    dueDate: invoices.dueDate,
                    paidAt: invoices.paidAt,
                    createdAt: invoices.createdAt,
                    userId: invoices.userId,
                    companyName: user.companyName,
                    clientName: user.name,
                })
                .from(invoices)
                .leftJoin(user, eq(invoices.userId, user.id))
                .orderBy(desc(invoices.createdAt))
                .limit(200);

            return NextResponse.json(results);
        } else {
            const results = await db
                .select({
                    id: invoices.id,
                    type: invoices.type,
                    status: invoices.status,
                    bookingRef: invoices.bookingRef,
                    route: invoices.route,
                    palletCount: invoices.palletCount,
                    originChargesZAR: invoices.originChargesZAR,
                    oceanFreightZAR: invoices.oceanFreightZAR,
                    destinationChargesZAR: invoices.destinationChargesZAR,
                    subtotalZAR: invoices.subtotalZAR,
                    percentage: invoices.percentage,
                    amountZAR: invoices.amountZAR,
                    poNumber: invoices.poNumber,
                    reminderSentAt: invoices.reminderSentAt,
                    dueDate: invoices.dueDate,
                    paidAt: invoices.paidAt,
                    createdAt: invoices.createdAt,
                    userId: invoices.userId,
                })
                .from(invoices)
                .where(eq(invoices.userId, session.user.id))
                .orderBy(desc(invoices.createdAt))
                .limit(50);

            return NextResponse.json(results);
        }
    } catch (error: unknown) {
        console.error("Invoice fetch error:", error);
        const message =
            error instanceof Error ? error.message : "Failed to fetch invoices";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const isAdmin = (session.user as { role?: string }).role === "admin";
        if (!isAdmin) {
            return NextResponse.json({ error: "Admin access required" }, { status: 403 });
        }

        const body = await request.json();
        const { id, status, paidAt, action } = body;

        if (!id) {
            return NextResponse.json({ error: "id is required" }, { status: 400 });
        }

        // Handle send reminder action
        if (action === "SEND_REMINDER") {
            const [updated] = await db
                .update(invoices)
                .set({ reminderSentAt: new Date(), updatedAt: new Date() })
                .where(eq(invoices.id, id))
                .returning();

            if (!updated) {
                return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
            }
            return NextResponse.json(updated);
        }

        // Handle status updates
        if (!status) {
            return NextResponse.json(
                { error: "status is required for status updates" },
                { status: 400 }
            );
        }

        const updateData: Record<string, unknown> = {
            status,
            updatedAt: new Date(),
        };
        if (paidAt) {
            updateData.paidAt = new Date(paidAt);
        } else if (status === "PAID") {
            updateData.paidAt = new Date();
        }

        const [updated] = await db
            .update(invoices)
            .set(updateData)
            .where(eq(invoices.id, id))
            .returning();

        if (!updated) {
            return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
        }

        // When deposit is marked as PAID, update the pallet allocation to CONFIRMED
        if (status === "PAID" && updated.type === "DEPOSIT" && updated.allocationId) {
            await db
                .update(palletAllocations)
                .set({ status: "CONFIRMED", updatedAt: new Date() })
                .where(eq(palletAllocations.id, updated.allocationId));
        }

        return NextResponse.json(updated);
    } catch (error: unknown) {
        console.error("Invoice update error:", error);
        const message =
            error instanceof Error ? error.message : "Failed to update invoice";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
