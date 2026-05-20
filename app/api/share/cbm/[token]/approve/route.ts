import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
    cargoCalculations,
    cargoCalculationShares,
    cargoCalculationShareActions,
    clientNotifications,
    user as userTable,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { sendCbmShareApprovedEmail } from "@/lib/email";

/**
 * Public endpoint - a share-link guest clicks Approve.
 *
 * Body: { name: string, email: string, note?: string }
 *
 * Validation:
 *  - token exists, not revoked, not expired
 *  - share has allowApprove === true
 *  - name + email are present
 *
 * Side effects:
 *  - inserts a row into cargo_calculation_share_actions (action = APPROVED)
 *  - inserts a client_notifications row for the calc owner (CBM_SHARE_APPROVED)
 *  - sends an email to the calc owner (best-effort; doesn't fail the request)
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ token: string }> },
) {
    try {
        const { token } = await params;
        const body = await req.json().catch(() => ({}));
        const name = typeof body?.name === "string" ? body.name.trim() : "";
        const email = typeof body?.email === "string" ? body.email.trim() : "";
        const note = typeof body?.note === "string" ? body.note.trim().slice(0, 500) : null;

        if (!name || !email) {
            return NextResponse.json({ error: "Name and email are both required." }, { status: 400 });
        }
        // Light email syntax sanity-check - match any non-space char @ non-space char . non-space.
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
        }

        const [share] = await db
            .select()
            .from(cargoCalculationShares)
            .where(eq(cargoCalculationShares.token, token))
            .limit(1);

        if (!share) return NextResponse.json({ error: "Share link not found." }, { status: 404 });
        if (share.revokedAt) return NextResponse.json({ error: "This share link has been revoked." }, { status: 410 });
        if (share.expiresAt && share.expiresAt < new Date()) {
            return NextResponse.json({ error: "This share link has expired." }, { status: 410 });
        }
        if (!share.allowApprove) {
            return NextResponse.json({ error: "Approval isn't enabled on this share link." }, { status: 403 });
        }

        const [calc] = await db
            .select()
            .from(cargoCalculations)
            .where(eq(cargoCalculations.id, share.calculationId))
            .limit(1);

        if (!calc) return NextResponse.json({ error: "Calculation no longer available." }, { status: 404 });

        const actionId = `CSA-${nanoid(12)}`;
        await db.insert(cargoCalculationShareActions).values({
            id: actionId,
            shareToken: share.token,
            calculationId: calc.id,
            action: "APPROVED",
            guestName: name,
            guestEmail: email,
            note,
            // For APPROVED rows itemsSnapshot is a point-in-time record of
            // what the approver actually saw - not used for revert.
            itemsSnapshot: calc.cargoItems,
        });

        // In-app notification for the calc owner. Bell badge picks this up
        // from the existing /api/notifications endpoint.
        await db.insert(clientNotifications).values({
            id: `CNT-${nanoid(10)}`,
            userId: calc.userId,
            type: "CBM_SHARE_APPROVED",
            title: "Calculation approved",
            message: `${name} approved your shared calculation "${calc.name}"${note ? `: "${note}"` : ""}.`,
            isRead: false,
        });

        // Email - best-effort. We fetch the owner's email + name; failure to
        // send (no SMTP config in dev, transient mail issue) doesn't fail
        // the approval - the in-app notification still lands.
        const [owner] = await db
            .select({ email: userTable.email, name: userTable.name })
            .from(userTable)
            .where(eq(userTable.id, calc.userId))
            .limit(1);

        if (owner?.email) {
            try {
                await sendCbmShareApprovedEmail({
                    to: owner.email,
                    ownerName: owner.name,
                    calculationName: calc.name,
                    calculationId: calc.id,
                    guestName: name,
                    guestEmail: email,
                    note,
                });
            } catch (mailErr) {
                console.error("[share approve] email send failed (non-fatal):", mailErr);
            }
        }

        return NextResponse.json({ success: true, actionId });
    } catch (err) {
        console.error("[share approve] error:", err);
        const message = err instanceof Error ? err.message : "Failed to record approval";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
