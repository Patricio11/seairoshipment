import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { user as userTable } from "@/lib/db/schema";
import { AdminLayoutClient } from "./layout.client";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // Require admin role - redirects to dashboard if not admin
    const session = await requireRole(["admin"]);

    // 2FA gate for admin accounts. We read the live DB row rather than trusting
    // session.user.twoFactorEnabled — that way an admin who enrols in another
    // tab clears the gate on their next navigation, without waiting for the
    // session cookie cache to refresh.
    const [row] = await db
        .select({ twoFactorEnabled: userTable.twoFactorEnabled })
        .from(userTable)
        .where(eq(userTable.id, session.user.id))
        .limit(1);

    if (!row?.twoFactorEnabled) {
        // Land them on the dedicated setup page. Routing through
        // /dashboard/settings would loop — the dashboard layout requires the
        // "client" role and would bounce admins back to /admin, retriggering
        // this same check. /auth/setup-2fa is role-agnostic.
        redirect("/auth/setup-2fa");
    }

    return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
