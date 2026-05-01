import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { onboardingRequirements } from "@/lib/db/schema";
import { asc } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function GET() {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const rows = await db
            .select()
            .from(onboardingRequirements)
            .orderBy(asc(onboardingRequirements.sortOrder));

        return NextResponse.json({ requirements: rows });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load requirements";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { session, error } = await requireAdmin();
        if (error) return error;

        const body = await req.json().catch(() => ({}));
        const name = typeof body?.name === "string" ? body.name.trim() : "";
        if (!name) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        const description = typeof body?.description === "string" ? body.description.trim() : null;
        const required = body?.required === false ? false : true;

        // Place new rows at the end of the list
        const all = await db.select({ sortOrder: onboardingRequirements.sortOrder }).from(onboardingRequirements);
        const nextSort = (all.reduce((m, r) => Math.max(m, r.sortOrder), 0) ?? 0) + 10;

        const id = `req-${nanoid(8)}`;
        const [created] = await db
            .insert(onboardingRequirements)
            .values({
                id,
                name,
                description,
                required,
                sortOrder: nextSort,
                active: true,
                uploadedBy: session.user.id,
            })
            .returning();

        return NextResponse.json({ requirement: created });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to create requirement";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
