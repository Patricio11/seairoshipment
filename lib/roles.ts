/**
 * Role model (client-safe - no server imports).
 *
 * admin        - full platform access, sea + road
 * client       - customer dashboard
 * road_manager - road side only: trucks, road rates, approvals, PODs
 * road_ops     - road side only, operational: confirm loads, PODs, WhatsApp.
 *                No rates, no invoicing, no creating/amending trucks.
 */

export type Role = "admin" | "client" | "road_manager" | "road_ops";
export type StaffRole = "admin" | "road_manager" | "road_ops";

export const ROLE_LABELS: Record<Role, string> = {
    admin: "Admin",
    client: "Customer",
    road_manager: "Road Freight Manager",
    road_ops: "Road Freight Operations",
};

/** Any back-office role that may enter /admin. */
export function isStaff(role: string | null | undefined): role is StaffRole {
    return role === "admin" || role === "road_manager" || role === "road_ops";
}

/** Road-only staff - locked to the ROAD transport mode everywhere. */
export function isRoadStaff(role: string | null | undefined): role is "road_manager" | "road_ops" {
    return role === "road_manager" || role === "road_ops";
}

/** Who may create/edit trucks and manage road rate cards. */
export function canManageRoad(role: string | null | undefined): boolean {
    return role === "admin" || role === "road_manager";
}

/**
 * Admin-area pages a road-only role may visit; everything else in /admin
 * bounces back to /admin/bookings. Kept here so the sidebar and the layout
 * guard share one definition.
 */
export function roadAllowedPath(role: string, pathname: string): boolean {
    if (pathname === "/admin/bookings" || pathname.startsWith("/admin/bookings/")) return true;
    if (role === "road_manager") {
        if (pathname === "/admin/fleet" || pathname.startsWith("/admin/fleet/")) return true;
        if (pathname === "/admin/finance/road-rates") return true;
    }
    return false;
}
