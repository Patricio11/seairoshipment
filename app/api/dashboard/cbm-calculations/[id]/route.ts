import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { cargoCalculations } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { totalCbm, totalWeight, volumetricWeightSea } from "@/lib/cbm";
import type { CargoItem } from "@/lib/db/schema/pallet-allocations";

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

async function fetchOwned(calcId: string, userId: string) {
    const [row] = await db
        .select()
        .from(cargoCalculations)
        .where(and(eq(cargoCalculations.id, calcId), eq(cargoCalculations.userId, userId)))
        .limit(1);
    return row ?? null;
}

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = await params;
        const row = await fetchOwned(id, session.user.id);
        if (!row) return NextResponse.json({ error: "Calculation not found" }, { status: 404 });

        return NextResponse.json({ calculation: row });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load calculation";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = await params;
        const existing = await fetchOwned(id, session.user.id);
        if (!existing) return NextResponse.json({ error: "Calculation not found" }, { status: 404 });

        const body = await req.json().catch(() => ({}));
        const updates: Record<string, unknown> = { updatedAt: new Date() };

        if (typeof body?.name === "string") {
            const trimmed = body.name.trim();
            if (!trimmed) return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
            updates.name = trimmed;
        }
        if (typeof body?.notes === "string" || body?.notes === null) {
            updates.notes = body.notes ? String(body.notes).trim() : null;
        }
        if (body?.cargoItems !== undefined) {
            const items = normaliseItems(body.cargoItems);
            if (items.length === 0) {
                return NextResponse.json(
                    { error: "Add at least one cargo item with non-zero dimensions and quantity" },
                    { status: 400 },
                );
            }
            const totalCbmValue = totalCbm(items);
            const totalWeightValue = totalWeight(items);
            updates.cargoItems = items;
            updates.totalCBM = totalCbmValue.toFixed(4);
            updates.volumetricWeightKg = volumetricWeightSea(totalCbmValue).toFixed(4);
            updates.totalWeightKg = totalWeightValue.toFixed(4);
        }
        if (typeof body?.active === "boolean") {
            updates.active = body.active;
        }

        if (Object.keys(updates).length === 1) {
            return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
        }

        const [updated] = await db
            .update(cargoCalculations)
            .set(updates)
            .where(and(eq(cargoCalculations.id, id), eq(cargoCalculations.userId, session.user.id)))
            .returning();

        return NextResponse.json({ calculation: updated });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to update calculation";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

/**
 * Soft-delete by default - flips active=false so allocations that snapshot
 * this calc can still navigate to the source if they need to. Hard delete
 * via `?hard=true` is reserved for admin tooling later.
 */
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = await params;
        const existing = await fetchOwned(id, session.user.id);
        if (!existing) return NextResponse.json({ error: "Calculation not found" }, { status: 404 });

        await db
            .update(cargoCalculations)
            .set({ active: false, updatedAt: new Date() })
            .where(and(eq(cargoCalculations.id, id), eq(cargoCalculations.userId, session.user.id)));

        return NextResponse.json({ success: true });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to delete calculation";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
