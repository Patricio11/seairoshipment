import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { cargoCalculations, cargoCalculationShares } from "@/lib/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
import { randomBytes } from "crypto";

/**
 * Public share-link management for a saved calculation.
 *
 * - POST creates a new token (with optional expiry in days)
 * - GET lists this calc's active tokens so the owner can revoke
 * - DELETE revokes a specific token (?token=…) - also reachable via
 *   the [token] route for symmetry; either works.
 *
 * Tokens are 32-byte URL-safe random strings - not guessable. We don't
 * embed the calculation id in them so different calcs share the same
 * token-namespace globally.
 */

function ownsCalculation(calcId: string, userId: string) {
    return db
        .select({ id: cargoCalculations.id })
        .from(cargoCalculations)
        .where(and(eq(cargoCalculations.id, calcId), eq(cargoCalculations.userId, userId)))
        .limit(1)
        .then(rows => rows[0] ?? null);
}

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const { id } = await params;
        const owned = await ownsCalculation(id, session.user.id);
        if (!owned) return NextResponse.json({ error: "Calculation not found" }, { status: 404 });

        const rows = await db
            .select()
            .from(cargoCalculationShares)
            .where(and(eq(cargoCalculationShares.calculationId, id), isNull(cargoCalculationShares.revokedAt)))
            .orderBy(desc(cargoCalculationShares.createdAt));

        return NextResponse.json({ shares: rows });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load shares";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const { id } = await params;
        const owned = await ownsCalculation(id, session.user.id);
        if (!owned) return NextResponse.json({ error: "Calculation not found" }, { status: 404 });

        const body = await req.json().catch(() => ({}));
        const expiresInDaysRaw = body?.expiresInDays;
        let expiresAt: Date | null = null;
        if (typeof expiresInDaysRaw === "number" && Number.isFinite(expiresInDaysRaw) && expiresInDaysRaw > 0) {
            const days = Math.min(365, Math.floor(expiresInDaysRaw)); // cap at 1 year
            expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
        }

        // Optional toggles - default false so existing share-link callers
        // keep getting strictly read-only tokens.
        const allowApprove = body?.allowApprove === true;
        const allowEdit = body?.allowEdit === true;

        const token = randomBytes(24).toString("base64url"); // 32 chars, URL-safe
        const [created] = await db
            .insert(cargoCalculationShares)
            .values({
                token,
                calculationId: id,
                expiresAt,
                allowApprove,
                allowEdit,
            })
            .returning();

        return NextResponse.json({ share: created });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to create share link";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const { id } = await params;
        const owned = await ownsCalculation(id, session.user.id);
        if (!owned) return NextResponse.json({ error: "Calculation not found" }, { status: 404 });

        const token = req.nextUrl.searchParams.get("token");
        if (!token) return NextResponse.json({ error: "token query param required" }, { status: 400 });

        await db
            .update(cargoCalculationShares)
            .set({ revokedAt: new Date() })
            .where(and(
                eq(cargoCalculationShares.token, token),
                eq(cargoCalculationShares.calculationId, id),
            ));

        return NextResponse.json({ success: true });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to revoke share link";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
