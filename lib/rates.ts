import { db } from "@/lib/db";
import {
    originCharges,
    originChargeItems,
    oceanFreightRates,
    destinationCharges,
    destinationChargeItems,
    locations,
} from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";

// Map booking form UN/LOCODE → origin short IDs used in rate tables
const ORIGIN_MAP: Record<string, string> = {
    ZACPT: "cpt",
    ZADUR: "dur",
};

// Map booking form UN/LOCODE → ocean freight destination port codes
const DESTINATION_OCEAN_MAP: Record<string, string> = {
    GBLND: "GBLON",
    NLRTM: "NLRTM",
    SGSIN: "SGSIN",
    IEDUB: "IEDUB",
    ITGOA: "ITGOA",
    FRLEH: "FRLEH",
    PTLEI: "PTLEI",
    BEANR: "BEANR",
    DEBRV: "DEBRV",
    ESVGO: "ESVGO",
    CYLMS: "CYLMS",
    ESLPA: "ESLPA",
};

// Map booking form UN/LOCODE → destination charge IDs
const DESTINATION_CHARGE_MAP: Record<string, string> = {
    GBLND: "lon",
    IEDUB: "dub",
    ITGOA: "goa",
    FRLEH: "leh",
};

// Friendly names for display (fallback if not found in DB)
const PORT_NAMES: Record<string, string> = {
    ZACPT: "Cape Town",
    ZADUR: "Durban",
    GBLND: "London Gateway",
    NLRTM: "Rotterdam",
    SGSIN: "Singapore",
    IEDUB: "Dublin",
    ITGOA: "Genoa",
    FRLEH: "Le Havre",
    PTLEI: "Leixões",
    BEANR: "Antwerp",
    DEBRV: "Bremerhaven",
    ESVGO: "Vigo",
    CYLMS: "Limassol",
    ESLPA: "Las Palmas",
};

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

export async function calculateQuote(
    originCode: string,
    destinationCode: string,
    palletCount: number
): Promise<CostBreakdownResult> {
    const originId = ORIGIN_MAP[originCode];
    const oceanPortCode = DESTINATION_OCEAN_MAP[destinationCode];
    const destChargeId = DESTINATION_CHARGE_MAP[destinationCode];

    // Try to resolve names from DB locations
    let originName = PORT_NAMES[originCode] || originCode;
    let destinationName = PORT_NAMES[destinationCode] || destinationCode;
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
        // Use fallback names
    }

    // 1. Origin charges — find active 40ft HC Reefer SRS rate from DB
    let originPerPallet = 0;
    let hasOriginRates = false;
    if (originId) {
        const [originCharge] = await db
            .select({ id: originCharges.id })
            .from(originCharges)
            .where(
                and(
                    eq(originCharges.originId, originId),
                    eq(originCharges.containerId, "40ft-reefer-hc"),
                    eq(originCharges.salesRateTypeId, "srs"),
                    eq(originCharges.active, true)
                )
            )
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

    // 2. Ocean freight — find active rate for destination from DB
    let oceanPerPallet = 0;
    let hasOceanRates = false;
    if (oceanPortCode) {
        const [oceanRate] = await db
            .select({ totalZAR: oceanFreightRates.totalZAR })
            .from(oceanFreightRates)
            .where(
                and(
                    eq(oceanFreightRates.destinationPortCode, oceanPortCode),
                    eq(oceanFreightRates.containerId, "40ft-reefer-hc"),
                    eq(oceanFreightRates.salesRateTypeId, "srs"),
                    eq(oceanFreightRates.active, true)
                )
            )
            .limit(1);

        if (oceanRate && Number(oceanRate.totalZAR) > 0) {
            hasOceanRates = true;
            oceanPerPallet = Number(oceanRate.totalZAR) / PALLETS_PER_CONTAINER;
        }
    }

    // 3. Destination charges — find active rate from DB
    let destinationPerPallet = 0;
    let hasDestinationRates = false;
    if (destChargeId) {
        const [destCharge] = await db
            .select({ id: destinationCharges.id })
            .from(destinationCharges)
            .where(
                and(
                    eq(destinationCharges.destinationId, destChargeId),
                    eq(destinationCharges.containerId, "40ft-reefer-hc"),
                    eq(destinationCharges.salesRateTypeId, "srs"),
                    eq(destinationCharges.active, true)
                )
            )
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
