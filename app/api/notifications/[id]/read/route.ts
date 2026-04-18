import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { clientNotifications } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        // Special "all" id to mark all as read
        if (id === "all") {
            await db
                .update(clientNotifications)
                .set({ isRead: true })
                .where(eq(clientNotifications.userId, session.user.id));
            return NextResponse.json({ success: true });
        }

        await db
            .update(clientNotifications)
            .set({ isRead: true })
            .where(
                and(
                    eq(clientNotifications.id, id),
                    eq(clientNotifications.userId, session.user.id)
                )
            );

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Mark notification read error:", err);
        const message = err instanceof Error ? err.message : "Failed to update notification";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
