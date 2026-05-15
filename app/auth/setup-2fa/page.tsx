import { redirect } from "next/navigation"
import { eq } from "drizzle-orm"
import { getSession } from "@/lib/auth/server"
import { db } from "@/lib/db"
import { user as userTable } from "@/lib/db/schema"
import { ForcedTwoFactorSetup } from "@/components/auth/forced-two-factor-setup"

/**
 * Role-agnostic forced 2FA enrollment page. Reached when an admin without 2FA
 * tries to load any /admin/* route — the admin layout redirects here instead
 * of /dashboard/settings, because the dashboard layout requires the "client"
 * role and would ping-pong an admin straight back to /admin (which would
 * redirect here again — infinite loop).
 *
 * This page:
 *  - Requires an authenticated user (any role).
 *  - Redirects already-enrolled users to their role's home immediately —
 *    nothing to do here.
 *  - Otherwise renders the wizard in `forceEnroll` mode: no dismissal,
 *    sign-out escape hatch in the banner, and a "Done" handler that bounces
 *    to /admin (admins) or /dashboard (clients) once codes are saved.
 */
export default async function SetupTwoFactorPage() {
    const session = await getSession()
    if (!session) {
        redirect("/")
    }

    const [row] = await db
        .select({ twoFactorEnabled: userTable.twoFactorEnabled })
        .from(userTable)
        .where(eq(userTable.id, session.user.id))
        .limit(1)

    if (row?.twoFactorEnabled) {
        // Already enrolled — nothing to do here. Bounce to their role's home.
        const role = (session.user.role as string) || "client"
        redirect(role === "admin" ? "/admin" : "/dashboard")
    }

    const role = (session.user.role as string) || "client"
    return <ForcedTwoFactorSetup role={role === "admin" ? "admin" : "client"} />
}
