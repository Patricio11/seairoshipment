import { requireRole } from "@/lib/auth/server";
import { AdminLayoutClient } from "./layout.client";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // Require admin role - redirects to dashboard if not admin
    await requireRole(["admin"]);

    return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
