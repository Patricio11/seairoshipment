import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { clientNotifications } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const notifs = await db
            .select()
            .from(clientNotifications)
            .where(eq(clientNotifications.userId, session.user.id))
            .orderBy(desc(clientNotifications.createdAt))
            .limit(50);

        return NextResponse.json(notifs);
    } catch (err) {
        console.error("Get notifications error:", err);
        const message = err instanceof Error ? err.message : "Failed to fetch notifications";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
