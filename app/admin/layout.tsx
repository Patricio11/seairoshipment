import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/server";
import { isStaff, type StaffRole } from "@/lib/roles";
import { AdminLayoutClient } from "./layout.client";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // Any staff role may enter /admin; road roles are further restricted to
    // road-only pages by the client layout guard (which knows the pathname)
    // and, for data, by the API-level requireStaff guards.
    const session = await requireAuth();
    const role = session.user.role as string;
    if (!isStaff(role)) {
        redirect("/dashboard");
    }

    // 2FA enforcement for admins is currently OFF - opt-in only.
    // Admins can enable 2FA themselves from /dashboard/settings → Security.
    // To turn enforcement back on, reinstate the DB-backed twoFactorEnabled
    // check and redirect to /auth/setup-2fa (see Phase D doc).

    return <AdminLayoutClient role={role as StaffRole}>{children}</AdminLayoutClient>;
}
