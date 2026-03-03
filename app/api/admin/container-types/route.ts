import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { containerTypes } from "@/lib/db/schema";
import { asc } from "drizzle-orm";

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
