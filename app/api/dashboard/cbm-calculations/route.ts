import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { cargoCalculations } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { totalCbm, totalWeight, volumetricWeightSea } from "@/lib/cbm";
import type { CargoItem } from "@/lib/db/schema/pallet-allocations";

/**
 * List + create endpoints for the user's saved CBM calculations.
 *
 * Totals are always recomputed server-side from the items so the client
 * cannot inject a fake `totalCBM` and downstream booking/quote logic can
 * trust the persisted figure.
 */

interface IncomingCargoItem {
    id?: string;
    label?: string | null;
    lengthMm?: number;
    widthMm?: number;
    heightMm?: number;
    weightKg?: number;
    quantity?: number;
}

function normaliseItems(raw: unknown): CargoItem[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .map((it: IncomingCargoItem): CargoItem | null => {
            const lengthMm = Number(it.lengthMm);
            const widthMm = Number(it.widthMm);
            const heightMm = Number(it.heightMm);
            const weightKg = Number(it.weightKg ?? 0);
            const quantity = Number(it.quantity ?? 0);
            if (![lengthMm, widthMm, heightMm, weightKg, quantity].every(n => Number.isFinite(n) && n >= 0)) return null;
            // Drop rows that contribute zero volume — they're empty/placeholder
            if (lengthMm * widthMm * heightMm * quantity === 0) return null;
            return {
                id: typeof it.id === "string" && it.id ? it.id : `ci-${nanoid(8)}`,
                label: typeof it.label === "string" ? it.label : "",
                lengthMm: Math.min(lengthMm, 10_000),
                widthMm: Math.min(widthMm, 10_000),
                heightMm: Math.min(heightMm, 10_000),
                weightKg: Math.min(weightKg, 50_000),
                quantity: Math.min(quantity, 100_000),
            };
        })
        .filter((x): x is CargoItem => x !== null);
}

export async function GET() {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const rows = await db
            .select()
            .from(cargoCalculations)
            .where(and(
                eq(cargoCalculations.userId, session.user.id),
                eq(cargoCalculations.active, true),
            ))
            .orderBy(desc(cargoCalculations.updatedAt));

        return NextResponse.json({ calculations: rows });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load calculations";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json().catch(() => ({}));
        const name = typeof body?.name === "string" ? body.name.trim() : "";
        const notes = typeof body?.notes === "string" ? body.notes.trim() : null;
        const items = normaliseItems(body?.cargoItems);

        if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
        if (items.length === 0) {
            return NextResponse.json(
                { error: "Add at least one cargo item with non-zero dimensions and quantity" },
                { status: 400 },
            );
        }

        const totalCbmValue = totalCbm(items);
        const totalWeightValue = totalWeight(items);
        const volumetric = volumetricWeightSea(totalCbmValue);

        const id = `CCALC-${nanoid(10)}`;
        const [created] = await db
            .insert(cargoCalculations)
            .values({
                id,
                userId: session.user.id,
                name,
                cargoType: "CUBE",
                cargoItems: items,
                totalCBM: totalCbmValue.toFixed(4),
                volumetricWeightKg: volumetric.toFixed(4),
                totalWeightKg: totalWeightValue.toFixed(4),
                notes,
                active: true,
            })
            .returning();

        return NextResponse.json({ calculation: created });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to save calculation";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
