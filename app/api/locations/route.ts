import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { locations } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get("type");

        const conditions = [eq(locations.active, true)];
        if (type) {
            conditions.push(eq(locations.type, type as "ORIGIN" | "DESTINATION" | "HUB"));
        }

        const results = await db
            .select({
                id: locations.id,
                name: locations.name,
                code: locations.code,
                country: locations.country,
                type: locations.type,
            })
            .from(locations)
            .where(and(...conditions))
            .orderBy(asc(locations.type), asc(locations.name));

        return NextResponse.json(results);
    } catch (error: unknown) {
        console.error("Locations fetch error:", error);
        return NextResponse.json({ error: "Failed to fetch locations" }, { status: 500 });
    }
}
