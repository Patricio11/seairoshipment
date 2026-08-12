/**
 * Shared constants + helpers for the Refrigerated Road Freight service.
 * See ROAD_FREIGHT.md for the full design.
 */

/** Fixed road corridors - these codes live in containers.route for ROAD rows
 *  and in road_rates.route. Directional: CPT-JNB and JNB-CPT price separately. */
export const ROAD_ROUTES = [
    { code: "CPT-JNB", label: "Cape Town → Johannesburg" },
    { code: "JNB-CPT", label: "Johannesburg → Cape Town" },
    { code: "JNB-DBN", label: "Johannesburg → Durban" },
    { code: "DBN-JNB", label: "Durban → Johannesburg" },
    { code: "CPT-DBN", label: "Cape Town → Durban" },
    { code: "DBN-CPT", label: "Durban → Cape Town" },
] as const;

export type RoadRouteCode = (typeof ROAD_ROUTES)[number]["code"];

export function isRoadRoute(code: string): code is RoadRouteCode {
    return ROAD_ROUTES.some(r => r.code === code);
}

export function roadRouteLabel(code: string): string {
    return ROAD_ROUTES.find(r => r.code === code)?.label ?? code;
}

/**
 * Road temperature bands - the SAME 4-value temperature enum as sea, with
 * trucking-specific labels per the plan:
 *   frozen  → -20°C to -18°C  Frozen
 *   cool    →   0°C to  +5°C  Partly Frozen
 *   chilled →  +5°C to  +7°C  Chilled
 *   ambient → +10°C to +18°C  Ambient
 */
export const ROAD_TEMP_LABELS: Record<string, string> = {
    frozen: "-20°C to -18°C (Frozen)",
    cool: "0°C to +5°C (Partly Frozen)",
    chilled: "+5°C to +7°C (Chilled)",
    ambient: "+10°C to +18°C (Ambient)",
};

/** Standard reefer trailer capacity - 28 pallet spaces, bookable from 1. */
export const ROAD_TRUCK_MAX_PALLETS = 28;

/** Road bookings pay 60% upfront on admin confirmation, 40% balance. */
export const ROAD_DEPOSIT_PERCENTAGE = 60;
