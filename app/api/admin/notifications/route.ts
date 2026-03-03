import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { adminNotifications } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const notifications = await db
            .select()
            .from(adminNotifications)
            .orderBy(desc(adminNotifications.createdAt))
            .limit(50);

        return NextResponse.json(notifications);
    } catch (error: unknown) {
        console.error("Get notifications error:", error);
        const message =
            error instanceof Error ? error.message : "Failed to fetch notifications";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

// Mark notification as read
export async function PATCH(request: NextRequest) {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const { id } = await request.json();
        if (!id) {
            return NextResponse.json({ error: "Notification ID required" }, { status: 400 });
        }

        await db
            .update(adminNotifications)
            .set({ isRead: true })
            .where(eq(adminNotifications.id, id));

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error("Update notification error:", error);
        const message =
            error instanceof Error ? error.message : "Failed to update notification";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
