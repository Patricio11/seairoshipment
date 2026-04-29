import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { user, clientNotifications } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { sendApprovalEmail } from "@/lib/email";

/**
 * Approve a pending client. Sets isVetted=true, vettingStatus=APPROVED,
 * stamps reviewer + reviewedAt, and (Phase F) fires the welcome email.
 */
export async function PATCH(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const { session, error } = await requireAdmin();
        if (error) return error;

        const { id } = await params;

        const [target] = await db.select().from(user).where(eq(user.id, id)).limit(1);
        if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
        if (target.role !== "client") return NextResponse.json({ error: "Only client accounts are vetted" }, { status: 400 });
        if (target.vettingStatus === "APPROVED") return NextResponse.json({ error: "User is already approved" }, { status: 400 });

        // Assign account number if missing
        let accountNumber = target.accountNumber;
        if (!accountNumber) {
            accountNumber = `SRS-${nanoid(8).toUpperCase()}`;
        }

        await db
            .update(user)
            .set({
                isVetted: true,
                vettingStatus: "APPROVED",
                vettingReviewedAt: new Date(),
                vettingReviewedBy: session.user.id,
                vettingRejectionReason: null,
                vettingAdminNote: null,
                accountNumber,
                updatedAt: new Date(),
            })
            .where(eq(user.id, id));

        // Notify the client in-app
        await db.insert(clientNotifications).values({
            id: `CNT-${nanoid(10)}`,
            userId: id,
            type: "GENERAL",
            title: "Your account is approved",
            message: `Welcome to Seairo. Your account number is ${accountNumber}. The dashboard is unlocked.`,
            isRead: false,
        });

        try {
            await sendApprovalEmail(target.email, accountNumber, target.companyName ?? target.name);
        } catch (mailErr) {
            console.warn("[vetting:approve] email failed", mailErr);
        }

        return NextResponse.json({ success: true, accountNumber });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to approve user";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
