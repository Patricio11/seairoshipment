import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { adminNotifications } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
    try {
        const session = await getSession();
        if (!session || session.user.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

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
        const session = await getSession();
        if (!session || session.user.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

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
