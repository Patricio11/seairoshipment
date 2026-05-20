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
import { totalCbm, totalWeight, volumetricWeightSea } from "@/lib/cbm";
import type { CargoItem } from "@/lib/db/schema/pallet-allocations";
import { sendCbmShareEditedEmail } from "@/lib/email";

/**
 * Public endpoint - a share-link guest saves edits to the calculation.
 *
 * Body: { name: string, email: string, items: CargoItem[], note?: string }
 *
 * Validation:
 *  - token exists, not revoked, not expired
 *  - share has allowEdit === true
 *  - name + email present
 *  - items array is non-empty, each row has positive dimensions + quantity
 *
 * Side effects:
 *  - snapshots the calc's *current* items into a new EDITED action row
 *    (so owner-side Revert restores the previous state)
 *  - updates the calc's items + recomputes totals server-side (never trust
 *    client-supplied totals)
 *  - inserts a client_notifications row for the calc owner (CBM_SHARE_EDITED)
 *  - sends an email to the calc owner (best-effort)
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
        const itemsRaw = Array.isArray(body?.items) ? body.items : null;

        if (!name || !email) {
            return NextResponse.json({ error: "Name and email are both required." }, { status: 400 });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
        }
        if (!itemsRaw || itemsRaw.length === 0) {
            return NextResponse.json({ error: "At least one cargo item is required." }, { status: 400 });
        }

        // Sanitise items - accept only the fields we trust, coerce types, drop the rest.
        const items: CargoItem[] = [];
        for (const raw of itemsRaw) {
            if (!raw || typeof raw !== "object") continue;
            const lengthMm = Number(raw.lengthMm);
            const widthMm = Number(raw.widthMm);
            const heightMm = Number(raw.heightMm);
            const weightKg = Number(raw.weightKg ?? 0);
            const quantity = Math.max(0, Math.floor(Number(raw.quantity) || 0));
            if (!Number.isFinite(lengthMm) || lengthMm <= 0) continue;
            if (!Number.isFinite(widthMm) || widthMm <= 0) continue;
            if (!Number.isFinite(heightMm) || heightMm <= 0) continue;
            if (quantity <= 0) continue;
            items.push({
                id: typeof raw.id === "string" && raw.id.length > 0 ? raw.id : `ci-${nanoid(10)}`,
                label: typeof raw.label === "string" ? raw.label.slice(0, 120) : "",
                lengthMm,
                widthMm,
                heightMm,
                weightKg: Number.isFinite(weightKg) ? Math.max(0, weightKg) : 0,
                quantity,
            });
        }

        if (items.length === 0) {
            return NextResponse.json({ error: "At least one valid cargo item is required (positive dimensions + quantity)." }, { status: 400 });
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
        if (!share.allowEdit) {
            return NextResponse.json({ error: "Editing isn't enabled on this share link." }, { status: 403 });
        }

        const [calc] = await db
            .select()
            .from(cargoCalculations)
            .where(eq(cargoCalculations.id, share.calculationId))
            .limit(1);

        if (!calc) return NextResponse.json({ error: "Calculation no longer available." }, { status: 404 });

        // Snapshot the items *before* the edit, then update.
        const actionId = `CSA-${nanoid(12)}`;
        await db.insert(cargoCalculationShareActions).values({
            id: actionId,
            shareToken: share.token,
            calculationId: calc.id,
            action: "EDITED",
            guestName: name,
            guestEmail: email,
            note,
            itemsSnapshot: calc.cargoItems, // previous state - what owner-side Revert restores
        });

        // Recompute totals server-side from the sanitised items. Never trust
        // client-supplied totals.
        const totalCbmValue = totalCbm(items);
        const totalWeightKg = totalWeight(items);
        const volumetric = volumetricWeightSea(totalCbmValue);

        await db
            .update(cargoCalculations)
            .set({
                cargoItems: items,
                totalCBM: totalCbmValue.toFixed(4),
                totalWeightKg: totalWeightKg.toFixed(4),
                volumetricWeightKg: volumetric.toFixed(4),
                updatedAt: new Date(),
            })
            .where(eq(cargoCalculations.id, calc.id));

        // In-app notification for the owner.
        await db.insert(clientNotifications).values({
            id: `CNT-${nanoid(10)}`,
            userId: calc.userId,
            type: "CBM_SHARE_EDITED",
            title: "Calculation edited",
            message: `${name} edited your shared calculation "${calc.name}"${note ? `: "${note}"` : ""}.`,
            isRead: false,
        });

        // Best-effort email.
        const [owner] = await db
            .select({ email: userTable.email, name: userTable.name })
            .from(userTable)
            .where(eq(userTable.id, calc.userId))
            .limit(1);

        if (owner?.email) {
            try {
                await sendCbmShareEditedEmail({
                    to: owner.email,
                    ownerName: owner.name,
                    calculationName: calc.name,
                    calculationId: calc.id,
                    guestName: name,
                    guestEmail: email,
                    note,
                });
            } catch (mailErr) {
                console.error("[share edit] email send failed (non-fatal):", mailErr);
            }
        }

        return NextResponse.json({ success: true, actionId });
    } catch (err) {
        console.error("[share edit] error:", err);
        const message = err instanceof Error ? err.message : "Failed to save edits";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
