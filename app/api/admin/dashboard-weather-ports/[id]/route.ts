import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { dashboardWeatherPorts } from "@/lib/db/schema";
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
        if (typeof body?.cityName === "string") updates.cityName = body.cityName.trim();
        if (typeof body?.countryCode === "string" || body?.countryCode === null) {
            updates.countryCode = body.countryCode ? String(body.countryCode).trim().toUpperCase() : null;
        }
        if (typeof body?.role === "string" && ["ORIGIN", "DEST", "HUB"].includes(body.role.toUpperCase())) {
            updates.role = body.role.toUpperCase();
        }
        if (body?.latitude !== undefined) {
            const lat = Number(body.latitude);
            if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
                return NextResponse.json({ error: "Invalid latitude" }, { status: 400 });
            }
            updates.latitude = lat;
        }
        if (body?.longitude !== undefined) {
            const lng = Number(body.longitude);
            if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
                return NextResponse.json({ error: "Invalid longitude" }, { status: 400 });
            }
            updates.longitude = lng;
        }
        if (typeof body?.active === "boolean") updates.active = body.active;
        if (typeof body?.sortOrder === "number") updates.sortOrder = body.sortOrder;

        if (Object.keys(updates).length === 1) {
            return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
        }

        const [updated] = await db
            .update(dashboardWeatherPorts)
            .set(updates)
            .where(eq(dashboardWeatherPorts.id, id))
            .returning();

        if (!updated) return NextResponse.json({ error: "Port not found" }, { status: 404 });
        return NextResponse.json({ port: updated });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to update port";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const { id } = await params;
        const [deleted] = await db
            .delete(dashboardWeatherPorts)
            .where(eq(dashboardWeatherPorts.id, id))
            .returning();

        if (!deleted) return NextResponse.json({ error: "Port not found" }, { status: 404 });
        return NextResponse.json({ success: true });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to delete port";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
