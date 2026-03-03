import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { salesRateTypes } from "@/lib/db/schema";
import { asc } from "drizzle-orm";

export async function GET() {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

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
