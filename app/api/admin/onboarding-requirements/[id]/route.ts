import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { onboardingRequirements } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const { id } = await params;
        const body = await req.json().catch(() => ({}));

        const updates: Record<string, unknown> = { updatedAt: new Date() };
        if (typeof body?.name === "string") updates.name = body.name.trim();
        if (typeof body?.description === "string" || body?.description === null) {
            updates.description = body.description ? body.description.trim() : null;
        }
        if (typeof body?.required === "boolean") updates.required = body.required;
        if (typeof body?.active === "boolean") updates.active = body.active;

        if (Object.keys(updates).length === 1) {
            return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
        }

        const [updated] = await db
            .update(onboardingRequirements)
            .set(updates)
            .where(eq(onboardingRequirements.id, id))
            .returning();

        if (!updated) {
            return NextResponse.json({ error: "Requirement not found" }, { status: 404 });
        }

        return NextResponse.json({ requirement: updated });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to update requirement";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

/**
 * Soft delete — flips active=false. The row is kept so existing user uploads
 * that referenced it via requirementId still resolve to a name.
 */
export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const { id } = await params;

        const [updated] = await db
            .update(onboardingRequirements)
            .set({ active: false, updatedAt: new Date() })
            .where(eq(onboardingRequirements.id, id))
            .returning();

        if (!updated) {
            return NextResponse.json({ error: "Requirement not found" }, { status: 404 });
        }

        return NextResponse.json({ requirement: updated });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to deactivate requirement";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
