import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { cargoItemPresets } from "@/lib/db/schema";
import { and, asc, eq, or } from "drizzle-orm";
import { nanoid } from "nanoid";

/**
 * Picker endpoint surfaced inside the CBM calculator.
 *
 * Returns admin-curated presets + the current user's own saved presets.
 * Optional `?categoryId=…` returns category-relevant + category-agnostic
 * + the user's own. Category-relevant items rank first in the response so
 * the picker can show them at the top without extra client logic.
 */
export async function GET(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const categoryId = req.nextUrl.searchParams.get("categoryId");

        // Visible to this user: admin presets + their own.
        const visible = await db
            .select()
            .from(cargoItemPresets)
            .where(and(
                eq(cargoItemPresets.active, true),
                or(
                    eq(cargoItemPresets.isAdmin, true),
                    eq(cargoItemPresets.userId, session.user.id),
                ),
            ))
            .orderBy(asc(cargoItemPresets.name));

        // Rank: user-owned first (most relevant), then admin-curated matching the
        // category, then admin-curated category-agnostic (null categoryId), then
        // admin-curated other categories.
        const ranked = [...visible].sort((a, b) => relevance(b, categoryId) - relevance(a, categoryId));

        return NextResponse.json({ presets: ranked });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load presets";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

function relevance(row: { isAdmin: boolean; userId: string | null; categoryId: string | null }, categoryId: string | null): number {
    if (!row.isAdmin) return 3;                                  // user's own — top
    if (categoryId && row.categoryId === categoryId) return 2;   // matches active category
    if (row.categoryId === null) return 1;                       // generic admin items (pallet bases)
    return 0;                                                    // other category admin items
}

/**
 * Save a personal preset. Admin-curated rows are managed via the admin
 * endpoint; this is for "I just measured a new box, keep it".
 */
export async function POST(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json().catch(() => ({}));
        const name = typeof body?.name === "string" ? body.name.trim() : "";
        const lengthMm = Number(body?.lengthMm);
        const widthMm = Number(body?.widthMm);
        const heightMm = Number(body?.heightMm);
        const weightKgRaw = body?.weightKg !== undefined ? Number(body.weightKg) : null;
        const categoryId = typeof body?.categoryId === "string" && body.categoryId ? body.categoryId : null;

        if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
        if (![lengthMm, widthMm, heightMm].every(n => Number.isFinite(n) && n > 0 && n <= 10_000)) {
            return NextResponse.json({ error: "Dimensions must be > 0 and ≤ 10 m" }, { status: 400 });
        }
        const weightKg = weightKgRaw !== null && Number.isFinite(weightKgRaw) && weightKgRaw >= 0
            ? Math.min(weightKgRaw, 50_000)
            : null;

        const [created] = await db
            .insert(cargoItemPresets)
            .values({
                id: `cip-${nanoid(10)}`,
                name,
                categoryId,
                lengthMm: Math.round(lengthMm),
                widthMm: Math.round(widthMm),
                heightMm: Math.round(heightMm),
                weightKg: weightKg !== null ? weightKg.toString() : null,
                isAdmin: false,
                userId: session.user.id,
                active: true,
            })
            .returning();

        return NextResponse.json({ preset: created });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to save preset";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
