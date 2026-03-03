import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { locations } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function GET(request: NextRequest) {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const { searchParams } = new URL(request.url);
        const type = searchParams.get("type");

        let query = db.select().from(locations).orderBy(asc(locations.type), asc(locations.name));

        if (type) {
            const results = await db
                .select()
                .from(locations)
                .where(eq(locations.type, type as "ORIGIN" | "DESTINATION" | "HUB"))
                .orderBy(asc(locations.name));
            return NextResponse.json(results);
        }

        const results = await query;
        return NextResponse.json(results);
    } catch (error: unknown) {
        console.error("Locations fetch error:", error);
        return NextResponse.json({ error: "Failed to fetch locations" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const body = await request.json();
        const { name, code, country, type, coordinates, active } = body;

        if (!name || !code || !country || !type) {
            return NextResponse.json({ error: "name, code, country, and type are required" }, { status: 400 });
        }

        const id = `LOC-${nanoid(6).toUpperCase()}`;
        const [created] = await db
            .insert(locations)
            .values({
                id,
                name,
                code: code.toUpperCase(),
                country,
                type,
                coordinates: coordinates || null,
                active: active !== false,
            })
            .returning();

        return NextResponse.json(created, { status: 201 });
    } catch (error: unknown) {
        console.error("Location create error:", error);
        return NextResponse.json({ error: "Failed to create location" }, { status: 500 });
    }
}
