import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { dashboardWeatherPorts } from "@/lib/db/schema";
import { asc, max } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function GET() {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const rows = await db
            .select()
            .from(dashboardWeatherPorts)
            .orderBy(asc(dashboardWeatherPorts.sortOrder));

        return NextResponse.json({ ports: rows });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load weather ports";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const body = await req.json().catch(() => ({}));
        const cityName = typeof body?.cityName === "string" ? body.cityName.trim() : "";
        const latitude = typeof body?.latitude === "number" ? body.latitude : Number(body?.latitude);
        const longitude = typeof body?.longitude === "number" ? body.longitude : Number(body?.longitude);
        const role = typeof body?.role === "string" ? body.role.toUpperCase() : "DEST";
        const countryCode = typeof body?.countryCode === "string" ? body.countryCode.trim().toUpperCase() : null;

        if (!cityName) return NextResponse.json({ error: "City name is required" }, { status: 400 });
        if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
            return NextResponse.json({ error: "Latitude must be between -90 and 90" }, { status: 400 });
        }
        if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
            return NextResponse.json({ error: "Longitude must be between -180 and 180" }, { status: 400 });
        }
        if (!["ORIGIN", "DEST", "HUB"].includes(role)) {
            return NextResponse.json({ error: "Role must be ORIGIN, DEST, or HUB" }, { status: 400 });
        }

        const [{ next }] = await db
            .select({ next: max(dashboardWeatherPorts.sortOrder) })
            .from(dashboardWeatherPorts);

        const [created] = await db
            .insert(dashboardWeatherPorts)
            .values({
                id: `WPRT-${nanoid(10)}`,
                cityName,
                countryCode: countryCode || null,
                role: role as "ORIGIN" | "DEST" | "HUB",
                latitude,
                longitude,
                sortOrder: (next ?? 0) + 10,
                active: true,
            })
            .returning();

        return NextResponse.json({ port: created });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to create weather port";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
