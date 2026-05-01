import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { onboardingRequirements } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Bulk-update sortOrder. Body:
 *   { order: [{ id, sortOrder }, ...] }
 * Used by the drag-to-reorder UI on the admin page.
 */
export async function PATCH(req: NextRequest) {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const body = await req.json().catch(() => ({}));
        const order = Array.isArray(body?.order) ? body.order : [];

        if (order.length === 0) {
            return NextResponse.json({ error: "No order entries supplied" }, { status: 400 });
        }

        const valid = order.filter((r: unknown): r is { id: string; sortOrder: number } => {
            if (!r || typeof r !== "object") return false;
            const row = r as { id?: unknown; sortOrder?: unknown };
            return typeof row.id === "string" && typeof row.sortOrder === "number";
        });

        const now = new Date();
        for (const row of valid) {
            await db
                .update(onboardingRequirements)
                .set({ sortOrder: row.sortOrder, updatedAt: now })
                .where(eq(onboardingRequirements.id, row.id));
        }

        return NextResponse.json({ success: true, updated: valid.length });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to reorder";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
