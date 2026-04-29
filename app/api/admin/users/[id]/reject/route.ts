import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { user, clientNotifications } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { sendRejectionEmail } from "@/lib/email";

/**
 * Reject a pending client. Final state — user sees the rejection screen
 * with the reason and a support email CTA.
 */
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const { session, error } = await requireAdmin();
        if (error) return error;

        const { id } = await params;
        const body = await req.json().catch(() => ({}));
        const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
        if (!reason) return NextResponse.json({ error: "A rejection reason is required" }, { status: 400 });

        const [target] = await db.select().from(user).where(eq(user.id, id)).limit(1);
        if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
        if (target.role !== "client") return NextResponse.json({ error: "Only client accounts are vetted" }, { status: 400 });

        await db
            .update(user)
            .set({
                isVetted: false,
                vettingStatus: "REJECTED",
                vettingRejectionReason: reason,
                vettingAdminNote: null,
                vettingReviewedAt: new Date(),
                vettingReviewedBy: session.user.id,
                updatedAt: new Date(),
            })
            .where(eq(user.id, id));

        await db.insert(clientNotifications).values({
            id: `CNT-${nanoid(10)}`,
            userId: id,
            type: "GENERAL",
            title: "Application not approved",
            message: reason,
            isRead: false,
        });

        try {
            await sendRejectionEmail(target.email, reason, target.companyName ?? target.name);
        } catch (mailErr) {
            console.warn("[vetting:reject] email failed", mailErr);
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to reject user";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
