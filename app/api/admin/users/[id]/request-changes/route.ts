import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { user, clientNotifications } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { sendRequestChangesEmail } from "@/lib/email";

/**
 * Reopen onboarding with a note. Status flips back to ONBOARDING_PENDING so the
 * client can edit and resubmit. The note is shown as a yellow banner on the form.
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
        const note = typeof body?.note === "string" ? body.note.trim() : "";
        if (!note) return NextResponse.json({ error: "A note for the client is required" }, { status: 400 });

        const [target] = await db.select().from(user).where(eq(user.id, id)).limit(1);
        if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
        if (target.role !== "client") return NextResponse.json({ error: "Only client accounts are vetted" }, { status: 400 });

        await db
            .update(user)
            .set({
                vettingStatus: "ONBOARDING_PENDING",
                vettingAdminNote: note,
                vettingRejectionReason: null,
                vettingReviewedAt: new Date(),
                vettingReviewedBy: session.user.id,
                updatedAt: new Date(),
            })
            .where(eq(user.id, id));

        await db.insert(clientNotifications).values({
            id: `CNT-${nanoid(10)}`,
            userId: id,
            type: "GENERAL",
            title: "We need a few changes",
            message: note,
            isRead: false,
        });

        try {
            await sendRequestChangesEmail(target.email, note, target.companyName ?? target.name);
        } catch (mailErr) {
            console.warn("[vetting:request-changes] email failed", mailErr);
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to request changes";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
