import { db } from "@/lib/db";
import {
    originCharges,
    originChargeItems,
    oceanFreightRates,
    destinationCharges,
    destinationChargeItems,
    locations,
} from "@/lib/db/schema";
import { eq, and, asc, desc } from "drizzle-orm";

export interface CostBreakdownResult {
    originPerPallet: number;
    oceanPerPallet: number;
    destinationPerPallet: number;
    totalPerPallet: number;
    totalCost: number;
    depositAmount: number;
    balanceAmount: number;
    palletCount: number;
    originName: string;
    destinationName: string;
    hasOriginRates: boolean;
    hasOceanRates: boolean;
    hasDestinationRates: boolean;
}

const PALLETS_PER_CONTAINER = 20;
const DEPOSIT_PERCENTAGE = 60;
const BALANCE_PERCENTAGE = 40;

/**
 * Derive short IDs from UN/LOCODE codes — matches what the admin forms save.
 * e.g. "ZACPT" → "cpt", "GBLND" → "lnd", "IEDUB" → "dub"
 */
function deriveShortId(code: string): string {
    return code.toLowerCase().slice(2);
}

export async function calculateQuote(
    originCode: string,
    destinationCode: string,
    palletCount: number,
    salesRateTypeId: string = "srs"
): Promise<CostBreakdownResult> {
    // Derive IDs the same way the admin forms do
    const originId = deriveShortId(originCode);       // e.g. "ZACPT" → "cpt"

    // Resolve friendly names from DB locations
    let originName = originCode;
    let destinationName = destinationCode;
    try {
        const [originLoc] = await db
            .select({ name: locations.name })
            .from(locations)
            .where(eq(locations.code, originCode))
            .limit(1);
        if (originLoc) originName = originLoc.name;

        const [destLoc] = await db
            .select({ name: locations.name })
            .from(locations)
            .where(eq(locations.code, destinationCode))
            .limit(1);
        if (destLoc) destinationName = destLoc.name;
    } catch {
        // Use fallback codes as names
    }

    // 1. Origin charges — find active rate by originId (derived short code)
    let originPerPallet = 0;
    let hasOriginRates = false;
    {
        const [originCharge] = await db
            .select({ id: originCharges.id })
            .from(originCharges)
            .where(
                and(
                    eq(originCharges.originId, originId),
                    eq(originCharges.containerId, "40ft-reefer-hc"),
                    eq(originCharges.salesRateTypeId, salesRateTypeId),
                    eq(originCharges.active, true)
                )
            )
            .orderBy(desc(originCharges.effectiveFrom))
            .limit(1);

        if (originCharge) {
            const items = await db
                .select()
                .from(originChargeItems)
                .where(eq(originChargeItems.originChargeId, originCharge.id))
                .orderBy(asc(originChargeItems.sortOrder));

            if (items.length > 0) {
                hasOriginRates = true;
                for (const item of items) {
                    if (item.chargeType === "PER_PALLET" && item.unitCost != null) {
                        originPerPallet += Number(item.unitCost);
                    } else if (
                        (item.chargeType === "PER_CONTAINER" || item.chargeType === "FIXED") &&
                        item.containerCost != null
                    ) {
                        originPerPallet += Number(item.containerCost) / PALLETS_PER_CONTAINER;
                    }
                }
            }
        }
    }

    // 2. Ocean freight — look up by destinationPortCode (the location code saved by the form)
    let oceanPerPallet = 0;
    let hasOceanRates = false;
    {
        const [oceanRate] = await db
            .select({ totalZAR: oceanFreightRates.totalZAR })
            .from(oceanFreightRates)
            .where(
                and(
                    eq(oceanFreightRates.destinationPortCode, destinationCode),
                    eq(oceanFreightRates.containerId, "40ft-reefer-hc"),
                    eq(oceanFreightRates.salesRateTypeId, salesRateTypeId),
                    eq(oceanFreightRates.active, true)
                )
            )
            .orderBy(desc(oceanFreightRates.effectiveFrom))
            .limit(1);

        if (oceanRate && Number(oceanRate.totalZAR) > 0) {
            hasOceanRates = true;
            oceanPerPallet = Number(oceanRate.totalZAR) / PALLETS_PER_CONTAINER;
        }
    }

    // 3. Destination charges — look up by destinationPortCode (the location code saved by the form)
    let destinationPerPallet = 0;
    let hasDestinationRates = false;
    {
        const [destCharge] = await db
            .select({ id: destinationCharges.id })
            .from(destinationCharges)
            .where(
                and(
                    eq(destinationCharges.destinationPortCode, destinationCode),
                    eq(destinationCharges.containerId, "40ft-reefer-hc"),
                    eq(destinationCharges.salesRateTypeId, salesRateTypeId),
                    eq(destinationCharges.active, true)
                )
            )
            .orderBy(desc(destinationCharges.effectiveFrom))
            .limit(1);

        if (destCharge) {
            const items = await db
                .select({ amountZAR: destinationChargeItems.amountZAR })
                .from(destinationChargeItems)
                .where(eq(destinationChargeItems.destinationChargeId, destCharge.id));

            if (items.length > 0) {
                hasDestinationRates = true;
                for (const item of items) {
                    destinationPerPallet += Number(item.amountZAR) / PALLETS_PER_CONTAINER;
                }
            }
        }
    }

    // 4. Calculate totals
    const totalPerPallet = originPerPallet + oceanPerPallet + destinationPerPallet;
    const totalCost = totalPerPallet * palletCount;
    const depositAmount = totalCost * (DEPOSIT_PERCENTAGE / 100);
    const balanceAmount = totalCost * (BALANCE_PERCENTAGE / 100);

    return {
        originPerPallet: Math.round(originPerPallet * 100) / 100,
        oceanPerPallet: Math.round(oceanPerPallet * 100) / 100,
        destinationPerPallet: Math.round(destinationPerPallet * 100) / 100,
        totalPerPallet: Math.round(totalPerPallet * 100) / 100,
        totalCost: Math.round(totalCost * 100) / 100,
        depositAmount: Math.round(depositAmount * 100) / 100,
        balanceAmount: Math.round(balanceAmount * 100) / 100,
        palletCount,
        originName,
        destinationName,
        hasOriginRates,
        hasOceanRates,
        hasDestinationRates,
    };
}
