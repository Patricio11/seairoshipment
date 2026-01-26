import { requireAuth } from "@/lib/auth/server";
import { DashboardLayoutClient } from "./layout.client";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // Require authentication - redirects to home if not logged in
    await requireAuth();

    return <DashboardLayoutClient>{children}</DashboardLayoutClient>;
}
