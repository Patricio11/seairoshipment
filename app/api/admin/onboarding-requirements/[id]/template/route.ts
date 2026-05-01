import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { onboardingRequirements } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Set or replace the fillable template attached to a requirement.
 * Body:  { url, originalName, mimeType?, sizeBytes? }
 *
 * The actual file upload happens client-side to Supabase via the existing
 * uploadFile helper; we just persist the resulting URL + metadata here.
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const { id } = await params;
        const body = await req.json().catch(() => ({}));

        const url = typeof body?.url === "string" ? body.url.trim() : "";
        const originalName = typeof body?.originalName === "string" ? body.originalName.trim() : "";
        if (!url || !originalName) {
            return NextResponse.json({ error: "url and originalName are required" }, { status: 400 });
        }

        const mimeType = typeof body?.mimeType === "string" ? body.mimeType : null;
        const sizeBytes = typeof body?.sizeBytes === "number" ? body.sizeBytes : null;

        const [updated] = await db
            .update(onboardingRequirements)
            .set({
                templateUrl: url,
                templateOriginalName: originalName,
                templateMimeType: mimeType,
                templateSizeBytes: sizeBytes,
                updatedAt: new Date(),
            })
            .where(eq(onboardingRequirements.id, id))
            .returning();

        if (!updated) {
            return NextResponse.json({ error: "Requirement not found" }, { status: 404 });
        }

        return NextResponse.json({ requirement: updated });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to attach template";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

/**
 * Remove the template — flips this requirement back from "fillable template"
 * to plain "user document slot". Existing user uploads that point at this
 * requirement are unaffected.
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
            .set({
                templateUrl: null,
                templateOriginalName: null,
                templateMimeType: null,
                templateSizeBytes: null,
                updatedAt: new Date(),
            })
            .where(eq(onboardingRequirements.id, id))
            .returning();

        if (!updated) {
            return NextResponse.json({ error: "Requirement not found" }, { status: 404 });
        }

        return NextResponse.json({ requirement: updated });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to remove template";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
