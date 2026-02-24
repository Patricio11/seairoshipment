import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { containerTypes } from "@/lib/db/schema";
import { asc } from "drizzle-orm";

export async function GET() {
    try {
        const session = await getSession();
        if (!session || (session.user as { role?: string }).role !== "admin") {
            return NextResponse.json({ error: "Admin access required" }, { status: 403 });
        }

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
