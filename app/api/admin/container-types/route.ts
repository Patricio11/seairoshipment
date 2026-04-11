import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { containerTypes } from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";

export async function GET() {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const results = await db
            .select()
            .from(containerTypes)
            .orderBy(asc(containerTypes.size), asc(containerTypes.displayName));

        return NextResponse.json(results);
    } catch (error: unknown) {
        console.error("Container types fetch error:", error);
        return NextResponse.json({ error: "Failed to fetch container types" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const body = await request.json();
        const { id, size, type, variant, code, displayName, maxPallets, active } = body;

        if (!id || !size || !type || !code || !displayName || !maxPallets) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const [created] = await db
            .insert(containerTypes)
            .values({
                id,
                size,
                type,
                variant: variant || null,
                code,
                displayName,
                maxPallets,
                active: active !== false,
            })
            .returning();

        return NextResponse.json(created, { status: 201 });
    } catch (error: unknown) {
        console.error("Create container type error:", error);
        const message = error instanceof Error ? error.message : "Failed to create container type";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const body = await request.json();
        const { id, displayName, maxPallets, active } = body;

        if (!id) {
            return NextResponse.json({ error: "Container type ID is required" }, { status: 400 });
        }

        const updates: Record<string, unknown> = { updatedAt: new Date() };
        if (displayName !== undefined) updates.displayName = displayName;
        if (maxPallets !== undefined) updates.maxPallets = maxPallets;
        if (active !== undefined) updates.active = active;

        const [updated] = await db
            .update(containerTypes)
            .set(updates)
            .where(eq(containerTypes.id, id))
            .returning();

        if (!updated) {
            return NextResponse.json({ error: "Container type not found" }, { status: 404 });
        }

        return NextResponse.json(updated);
    } catch (error: unknown) {
        console.error("Update container type error:", error);
        const message = error instanceof Error ? error.message : "Failed to update container type";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const { id } = await request.json();
        if (!id) {
            return NextResponse.json({ error: "Container type ID is required" }, { status: 400 });
        }

        const [deleted] = await db
            .delete(containerTypes)
            .where(eq(containerTypes.id, id))
            .returning();

        if (!deleted) {
            return NextResponse.json({ error: "Container type not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error("Delete container type error:", error);
        const message = error instanceof Error ? error.message : "Failed to delete container type";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
