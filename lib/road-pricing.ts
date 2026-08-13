import { db } from "@/lib/db";
import { roadRates } from "@/lib/db/schema";
import { and, eq, isNull, lte, gte } from "drizzle-orm";
import { ROAD_DEPOSIT_PERCENTAGE, roadRouteLabel } from "@/lib/road";

export interface RoadQuote {
    route: string;
    routeLabel: string;
    palletCount: number;
    /** Which card priced this - "CUSTOMER" (their own) or "DEFAULT". */
    rateSource: "CUSTOMER" | "DEFAULT";
    /** The pallet band that matched, e.g. "2-3" or "15+". */
    band: string;
    transportPerPallet: number;
    transportTotal: number;
    /** Delivery points included in the band price. */
    dropsIncluded: number;
    /** Delivery points beyond the included count. */
    billableDrops: number;
    additionalDropRate: number;
    additionalDropFee: number;   // billableDrops × additionalDropRate
    overhangFeePerPallet: number;
    overhangTotal: number;       // 0 when overhang = false
    totalCost: number;
    depositPercentage: number;
    depositAmount: number;
    balanceAmount: number;
}

/**
 * Resolve the road rate line for a customer + corridor + pallet count:
 *   1. The customer's own active line whose band covers the count.
 *   2. The default (userId IS NULL) active line covering the count.
 *   3. null → not quotable for this customer/count.
 */
export async function resolveRoadRate(userId: string, route: string, palletCount: number) {
    const bandMatch = and(
        eq(roadRates.route, route),
        eq(roadRates.active, true),
        lte(roadRates.minPallets, palletCount),
        gte(roadRates.maxPallets, palletCount),
    );

    const [customerRate] = await db
        .select()
        .from(roadRates)
        .where(and(eq(roadRates.userId, userId), bandMatch))
        .limit(1);
    if (customerRate) return { rate: customerRate, source: "CUSTOMER" as const };

    const [defaultRate] = await db
        .select()
        .from(roadRates)
        .where(and(isNull(roadRates.userId), bandMatch))
        .limit(1);
    if (defaultRate) return { rate: defaultRate, source: "DEFAULT" as const };

    return null;
}

/**
 * Price a road booking off the matching pallet band (Britos-card model):
 *   1. Transport: band's per-pallet price × pallets
 *   2. Drops: the band includes N delivery points; extras are charged at the
 *      band's additional-drop rate
 *   3. Overhang: per-pallet fee when the customer flags overhang
 *
 * Returns null when no active rate line covers the corridor + count.
 */
export async function calculateRoadQuote(
    userId: string,
    route: string,
    palletCount: number,
    deliveryPointCount: number,
    overhang: boolean,
): Promise<RoadQuote | null> {
    const resolved = await resolveRoadRate(userId, route, palletCount);
    if (!resolved) return null;

    const { rate, source } = resolved;
    const transportPerPallet = Number(rate.transportCostPerPallet);
    const transportTotal = transportPerPallet * palletCount;

    const dropsIncluded = Math.max(1, rate.dropsIncluded);
    const billableDrops = Math.max(0, deliveryPointCount - dropsIncluded);
    const additionalDropRate = Number(rate.additionalDropFee);
    const additionalDropFee = billableDrops * additionalDropRate;

    const overhangFeePerPallet = Number(rate.overhangFeePerPallet);
    const overhangTotal = overhang ? overhangFeePerPallet * palletCount : 0;

    const totalCost = transportTotal + additionalDropFee + overhangTotal;
    const depositAmount = totalCost * (ROAD_DEPOSIT_PERCENTAGE / 100);

    return {
        route,
        routeLabel: roadRouteLabel(route),
        palletCount,
        rateSource: source,
        band: `${rate.minPallets}${rate.maxPallets >= 28 && rate.minPallets < 28 ? "+" : rate.maxPallets !== rate.minPallets ? `-${rate.maxPallets}` : ""}`,
        transportPerPallet,
        transportTotal,
        dropsIncluded,
        billableDrops,
        additionalDropRate,
        additionalDropFee,
        overhangFeePerPallet,
        overhangTotal,
        totalCost,
        depositPercentage: ROAD_DEPOSIT_PERCENTAGE,
        depositAmount,
        balanceAmount: totalCost - depositAmount,
    };
}
