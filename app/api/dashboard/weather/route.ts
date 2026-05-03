import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { dashboardWeatherPorts } from "@/lib/db/schema";
import { and, asc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * Live weather for the admin-curated port list.
 *
 * Pulls active rows from `dashboard_weather_ports` and asks Open-Meteo for
 * the latest temperature + WMO weather code per coordinate. Open-Meteo is
 * free, no API key, commercial-friendly — picked specifically because the
 * dashboard widget shouldn't require key rotation or budget.
 *
 * In-memory cache (1 hour TTL) keeps us well under any reasonable rate
 * limit even on a busy admin team. A miss falls through to a fresh fetch.
 */

const CACHE_TTL_MS = 60 * 60 * 1000;

interface WeatherCacheEntry {
    fetchedAt: number;
    tempC: number | null;
    weatherCode: number | null;
}
const weatherCache = new Map<string, WeatherCacheEntry>();

function cacheKey(lat: number, lng: number): string {
    // Round to 2dp — that's <2km — so co-located ports share a cache slot.
    return `${lat.toFixed(2)},${lng.toFixed(2)}`;
}

interface OpenMeteoResponse {
    current?: {
        temperature_2m?: number;
        weather_code?: number;
    };
}

async function fetchOpenMeteo(lat: number, lng: number): Promise<{ tempC: number | null; weatherCode: number | null }> {
    const key = cacheKey(lat, lng);
    const cached = weatherCache.get(key);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
        return { tempC: cached.tempC, weatherCode: cached.weatherCode };
    }

    try {
        const url = new URL("https://api.open-meteo.com/v1/forecast");
        url.searchParams.set("latitude", String(lat));
        url.searchParams.set("longitude", String(lng));
        url.searchParams.set("current", "temperature_2m,weather_code");
        url.searchParams.set("timezone", "auto");

        const res = await fetch(url.toString(), {
            // Cache at the fetch layer too; if the route hits multiple times
            // before the in-memory map populates, Next dedupes.
            next: { revalidate: 3600 },
        });
        if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
        const data = (await res.json()) as OpenMeteoResponse;
        const tempC = typeof data.current?.temperature_2m === "number" ? data.current.temperature_2m : null;
        const weatherCode = typeof data.current?.weather_code === "number" ? data.current.weather_code : null;

        weatherCache.set(key, { fetchedAt: Date.now(), tempC, weatherCode });
        return { tempC, weatherCode };
    } catch {
        // On API failure, prefer stale cache over showing nothing
        if (cached) return { tempC: cached.tempC, weatherCode: cached.weatherCode };
        return { tempC: null, weatherCode: null };
    }
}

/**
 * Map WMO weather code → friendly condition string + a coarse "kind" the UI
 * uses to pick an icon. Codes from https://open-meteo.com/en/docs (WMO 4677).
 */
export function describeWeatherCode(code: number | null): { label: string; kind: "sun" | "cloud" | "rain" | "snow" | "storm" | "fog" | "unknown" } {
    if (code === null) return { label: "—", kind: "unknown" };
    if (code === 0) return { label: "Clear", kind: "sun" };
    if (code === 1 || code === 2) return { label: "Partly cloudy", kind: "cloud" };
    if (code === 3) return { label: "Overcast", kind: "cloud" };
    if (code === 45 || code === 48) return { label: "Fog", kind: "fog" };
    if (code >= 51 && code <= 57) return { label: "Drizzle", kind: "rain" };
    if (code >= 61 && code <= 67) return { label: "Rain", kind: "rain" };
    if (code >= 71 && code <= 77) return { label: "Snow", kind: "snow" };
    if (code >= 80 && code <= 82) return { label: "Showers", kind: "rain" };
    if (code === 85 || code === 86) return { label: "Snow showers", kind: "snow" };
    if (code >= 95 && code <= 99) return { label: "Thunderstorm", kind: "storm" };
    return { label: "—", kind: "unknown" };
}

export async function GET() {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const ports = await db
            .select()
            .from(dashboardWeatherPorts)
            .where(and(eq(dashboardWeatherPorts.active, true)))
            .orderBy(asc(dashboardWeatherPorts.sortOrder));

        // Fan out, but the per-coord cache + Next fetch dedupe keep this cheap.
        const enriched = await Promise.all(
            ports.map(async (p) => {
                const { tempC, weatherCode } = await fetchOpenMeteo(p.latitude, p.longitude);
                const condition = describeWeatherCode(weatherCode);
                return {
                    id: p.id,
                    cityName: p.cityName,
                    countryCode: p.countryCode,
                    role: p.role,
                    tempC,
                    weatherCode,
                    condition: condition.label,
                    conditionKind: condition.kind,
                };
            }),
        );

        return NextResponse.json({ ports: enriched });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load weather";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
