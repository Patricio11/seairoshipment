import { pgTable, text, timestamp, integer, boolean, doublePrecision, pgEnum, index } from "drizzle-orm/pg-core";

export const portRoleEnum = pgEnum("port_role", ["ORIGIN", "DEST", "HUB"]);

/**
 * Curated list of ports surfaced on the client dashboard's "Key Port Weather"
 * widget. Admin picks 3–5 ports relevant to current routes; the widget hits
 * Open-Meteo (free, no API key) for live temperature + condition.
 *
 * Lat/lng is stored on the row itself rather than joined from `locations`
 * because:
 *   - the widget list is short and admin-curated
 *   - some ports we want to show may not have a `locations` row yet
 *   - keeps Open-Meteo lookups one-to-one with this table
 *
 * `active = false` hides without deleting so the admin can quickly toggle a
 * port back on when the relevant route is in use again.
 */
export const dashboardWeatherPorts = pgTable("dashboard_weather_ports", {
    id: text("id").primaryKey(),
    cityName: text("city_name").notNull(),       // Display name e.g. "Cape Town"
    countryCode: text("country_code"),           // Optional ISO-2 e.g. "ZA"
    role: portRoleEnum("role").default("DEST").notNull(),
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
    sortIdx: index("dashboard_weather_ports_sort_idx").on(t.sortOrder),
    activeIdx: index("dashboard_weather_ports_active_idx").on(t.active),
}));

export type DashboardWeatherPort = typeof dashboardWeatherPorts.$inferSelect;
export type NewDashboardWeatherPort = typeof dashboardWeatherPorts.$inferInsert;
