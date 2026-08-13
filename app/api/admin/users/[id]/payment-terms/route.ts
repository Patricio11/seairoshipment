import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Update a customer's payment terms after approval. Terms drive how road
 * booking invoices are generated (60/40 split vs single invoice with a
 * terms-based due date). Existing invoices are untouched - only new bookings
 * pick up the change.
 */
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const { id } = await params;
        const body = await req.json().catch(() => ({}));

        const validTerms = ["SPLIT_60_40", "NET_30_STATEMENT", "NET_7_DELIVERY"] as const;
        if (!validTerms.includes(body.paymentTerms)) {
            return NextResponse.json({ error: "Invalid payment terms" }, { status: 400 });
        }

        const [target] = await db.select({ id: user.id, role: user.role }).from(user).where(eq(user.id, id)).limit(1);
        if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
        if (target.role !== "client") return NextResponse.json({ error: "Payment terms apply to client accounts" }, { status: 400 });

        await db.update(user)
            .set({ paymentTerms: body.paymentTerms, updatedAt: new Date() })
            .where(eq(user.id, id));

        return NextResponse.json({ success: true });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to update payment terms";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
