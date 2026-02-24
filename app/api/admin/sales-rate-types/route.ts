import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { salesRateTypes } from "@/lib/db/schema";
import { asc } from "drizzle-orm";

export async function GET() {
    try {
        const session = await getSession();
        if (!session || (session.user as { role?: string }).role !== "admin") {
            return NextResponse.json({ error: "Admin access required" }, { status: 403 });
        }

        const results = await db
            .select()
            .from(salesRateTypes)
            .orderBy(asc(salesRateTypes.name));

        return NextResponse.json(results);
    } catch (error: unknown) {
        console.error("Sales rate types fetch error:", error);
        return NextResponse.json({ error: "Failed to fetch sales rate types" }, { status: 500 });
    }
}
