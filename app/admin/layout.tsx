import { requireRole } from "@/lib/auth/server";
import { AdminLayoutClient } from "./layout.client";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // Require admin role - redirects to dashboard if not admin
    await requireRole(["admin"]);

    // 2FA enforcement for admins is currently OFF - opt-in only.
    // Admins can enable 2FA themselves from /dashboard/settings → Security.
    // To turn enforcement back on, reinstate the DB-backed twoFactorEnabled
    // check and redirect to /auth/setup-2fa (see Phase D doc).

    return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
