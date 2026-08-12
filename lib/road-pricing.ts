import { db } from "@/lib/db";
import { roadRates } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { ROAD_DEPOSIT_PERCENTAGE, roadRouteLabel } from "@/lib/road";

export interface RoadQuote {
    route: string;
    routeLabel: string;
    palletCount: number;
    /** Which card priced this - "CUSTOMER" (their own) or "DEFAULT". */
    rateSource: "CUSTOMER" | "DEFAULT";
    transportPerPallet: number;
    transportTotal: number;
    additionalDropFee: number;   // 0 when single delivery point
    overhangFeePerPallet: number;
    overhangTotal: number;       // 0 when overhang = false
    totalCost: number;
    depositPercentage: number;
    depositAmount: number;
    balanceAmount: number;
}

/**
 * Resolve the road rate card for a customer + corridor:
 *   1. The customer's own (userId, route) card, if active.
 *   2. The default (userId IS NULL, route) card, if active.
 *   3. null → route not quotable for this customer.
 */
export async function resolveRoadRate(userId: string, route: string) {
    const [customerRate] = await db
        .select()
        .from(roadRates)
        .where(and(
            eq(roadRates.userId, userId),
            eq(roadRates.route, route),
            eq(roadRates.active, true),
        ))
        .limit(1);
    if (customerRate) return { rate: customerRate, source: "CUSTOMER" as const };

    const [defaultRate] = await db
        .select()
        .from(roadRates)
        .where(and(
            isNull(roadRates.userId),
            eq(roadRates.route, route),
            eq(roadRates.active, true),
        ))
        .limit(1);
    if (defaultRate) return { rate: defaultRate, source: "DEFAULT" as const };

    return null;
}

/**
 * Price a road booking - the 3 cost lines from the plan:
 *   1. Transport cost per pallet × pallets
 *   2. Additional drop fee (once, when there is more than one delivery point)
 *   3. Overhang fee per pallet × pallets (when the customer flags overhang)
 *
 * Returns null when no active rate card covers the corridor.
 */
export async function calculateRoadQuote(
    userId: string,
    route: string,
    palletCount: number,
    deliveryPointCount: number,
    overhang: boolean,
): Promise<RoadQuote | null> {
    const resolved = await resolveRoadRate(userId, route);
    if (!resolved) return null;

    const { rate, source } = resolved;
    const transportPerPallet = Number(rate.transportCostPerPallet);
    const transportTotal = transportPerPallet * palletCount;
    const additionalDropFee = deliveryPointCount > 1 ? Number(rate.additionalDropFee) : 0;
    const overhangFeePerPallet = Number(rate.overhangFeePerPallet);
    const overhangTotal = overhang ? overhangFeePerPallet * palletCount : 0;
    const totalCost = transportTotal + additionalDropFee + overhangTotal;
    const depositAmount = totalCost * (ROAD_DEPOSIT_PERCENTAGE / 100);

    return {
        route,
        routeLabel: roadRouteLabel(route),
        palletCount,
        rateSource: source,
        transportPerPallet,
        transportTotal,
        additionalDropFee,
        overhangFeePerPallet,
        overhangTotal,
        totalCost,
        depositPercentage: ROAD_DEPOSIT_PERCENTAGE,
        depositAmount,
        balanceAmount: totalCost - depositAmount,
    };
}
