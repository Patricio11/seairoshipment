import { requireRole } from "@/lib/auth/server";
import { DashboardLayoutClient } from "./layout.client";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // Require client role - admins will be redirected to /admin
    await requireRole(["client"]);

    return <DashboardLayoutClient>{children}</DashboardLayoutClient>;
}
