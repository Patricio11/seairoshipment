import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { locations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const { id } = await params;
        const body = await request.json();
        const { name, code, country, type, coordinates, active } = body;

        const updateData: Record<string, unknown> = { updatedAt: new Date() };
        if (name !== undefined) updateData.name = name;
        if (code !== undefined) updateData.code = code.toUpperCase();
        if (country !== undefined) updateData.country = country;
        if (type !== undefined) updateData.type = type;
        if (coordinates !== undefined) updateData.coordinates = coordinates;
        if (active !== undefined) updateData.active = active;

        const [updated] = await db
            .update(locations)
            .set(updateData)
            .where(eq(locations.id, id))
            .returning();

        if (!updated) {
            return NextResponse.json({ error: "Location not found" }, { status: 404 });
        }

        return NextResponse.json(updated);
    } catch (error: unknown) {
        console.error("Location update error:", error);
        return NextResponse.json({ error: "Failed to update location" }, { status: 500 });
    }
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const { id } = await params;
        const [deleted] = await db
            .delete(locations)
            .where(eq(locations.id, id))
            .returning();

        if (!deleted) {
            return NextResponse.json({ error: "Location not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error("Location delete error:", error);
        return NextResponse.json({ error: "Failed to delete location" }, { status: 500 });
    }
}
