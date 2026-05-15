import { db } from "@/lib/db";
import {
    originCharges,
    originChargeItems,
    oceanFreightRates,
    destinationCharges,
    destinationChargeItems,
    locations,
    containerTypes,
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
    salesRateTypeId: string,
    containerTypeId: string,
): Promise<CostBreakdownResult> {
    if (!salesRateTypeId) {
        throw new Error("salesRateTypeId is required");
    }
    if (!containerTypeId) {
        throw new Error("containerTypeId is required");
    }
    // Derive IDs the same way the admin forms do
    const originId = deriveShortId(originCode);       // e.g. "ZACPT" → "cpt"

    // Resolve friendly names from DB locations
    let originName = originCode;
    let destinationName = destinationCode;
    try {
        // (code, type) is now the unique key on locations — same code can
        // exist as both ORIGIN and DESTINATION (Cape Town being both). Pin
        // each lookup to its expected type so we resolve to the right row.
        const [originLoc] = await db
            .select({ name: locations.name })
            .from(locations)
            .where(and(eq(locations.code, originCode), eq(locations.type, "ORIGIN")))
            .limit(1);
        if (originLoc) originName = originLoc.name;

        const [destLoc] = await db
            .select({ name: locations.name })
            .from(locations)
            .where(and(eq(locations.code, destinationCode), eq(locations.type, "DESTINATION")))
            .limit(1);
        if (destLoc) destinationName = destLoc.name;
    } catch {
        // Use fallback codes as names
    }

    // 1. Origin charges — find active rate by originId (derived short code).
    // calculateQuote is the PALLET path; CUBE bookings go through
    // calculateCubeQuote instead. Pin cargoType=PALLET so an SCS-Cube card
    // for the same origin/container can't leak into a PALLET quote.
    let originPerPallet = 0;
    let hasOriginRates = false;
    {
        const [originCharge] = await db
            .select({ id: originCharges.id })
            .from(originCharges)
            .where(
                and(
                    eq(originCharges.originId, originId),
                    eq(originCharges.containerId, containerTypeId),
                    eq(originCharges.salesRateTypeId, salesRateTypeId),
                    eq(originCharges.cargoType, "PALLET"),
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
                    eq(oceanFreightRates.containerId, containerTypeId),
                    eq(oceanFreightRates.salesRateTypeId, salesRateTypeId),
                    eq(oceanFreightRates.cargoType, "PALLET"),
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
                    eq(destinationCharges.containerId, containerTypeId),
                    eq(destinationCharges.salesRateTypeId, salesRateTypeId),
                    eq(destinationCharges.cargoType, "PALLET"),
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

/* -------------------------------------------------------------------------- */
/* Cube quote                                                                  */
/* -------------------------------------------------------------------------- */

export interface CubeCostBreakdown {
    originPerCBM: number;
    oceanPerCBM: number;
    destinationPerCBM: number;
    totalPerCBM: number;
    totalCost: number;
    depositAmount: number;
    balanceAmount: number;
    cbmVolume: number;
    originName: string;
    destinationName: string;
    hasOriginRates: boolean;
    hasOceanRates: boolean;
    hasDestinationRates: boolean;
    containerVolumeCBM: number;
}

/**
 * Cube-specific quote: prices a shipment denominated in m³ instead of
 * pallets. Looks up rate cards filtered by `cargoType = 'CUBE'`. Per-CBM
 * line items multiply directly; per-container line items + ocean freight
 * are split proportionally by `cbm / containerCBM` (mirroring the
 * `/ PALLETS_PER_CONTAINER` split on the pallet side).
 */
export async function calculateCubeQuote(
    originCode: string,
    destinationCode: string,
    cbmVolume: number,
    salesRateTypeId: string,
    containerTypeId: string,
): Promise<CubeCostBreakdown> {
    if (!salesRateTypeId) throw new Error("salesRateTypeId is required");
    if (!containerTypeId) throw new Error("containerTypeId is required");
    if (!Number.isFinite(cbmVolume) || cbmVolume <= 0) {
        throw new Error("cbmVolume must be a positive number");
    }

    const originId = deriveShortId(originCode);

    // Container volume drives the per-container → per-CBM split. If the type
    // hasn't had volumeCBM filled in yet, fall back to the 40ft default so we
    // can still produce a quote rather than failing outright.
    const [ct] = await db
        .select({ volumeCBM: containerTypes.volumeCBM })
        .from(containerTypes)
        .where(eq(containerTypes.id, containerTypeId))
        .limit(1);
    const containerVolumeCBM = ct?.volumeCBM ? Number(ct.volumeCBM) : 67.7;

    // Resolve friendly names — pin each lookup to its expected type so we
    // get the right row when a code (e.g. ZACPT) exists as both ORIGIN and
    // DESTINATION (Cape Town as export AND import port).
    let originName = originCode;
    let destinationName = destinationCode;
    try {
        const [originLoc] = await db
            .select({ name: locations.name })
            .from(locations)
            .where(and(eq(locations.code, originCode), eq(locations.type, "ORIGIN")))
            .limit(1);
        if (originLoc) originName = originLoc.name;
        const [destLoc] = await db
            .select({ name: locations.name })
            .from(locations)
            .where(and(eq(locations.code, destinationCode), eq(locations.type, "DESTINATION")))
            .limit(1);
        if (destLoc) destinationName = destLoc.name;
    } catch { /* fallback to codes */ }

    // 1. Origin charges (CUBE rate cards)
    let originPerCBM = 0;
    let hasOriginRates = false;
    {
        const [originCharge] = await db
            .select({ id: originCharges.id })
            .from(originCharges)
            .where(and(
                eq(originCharges.originId, originId),
                eq(originCharges.containerId, containerTypeId),
                eq(originCharges.salesRateTypeId, salesRateTypeId),
                eq(originCharges.cargoType, "CUBE"),
                eq(originCharges.active, true),
            ))
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
                    if (item.chargeType === "PER_CBM" && item.unitCost != null) {
                        originPerCBM += Number(item.unitCost);
                    } else if (
                        (item.chargeType === "PER_CONTAINER" || item.chargeType === "FIXED") &&
                        item.containerCost != null
                    ) {
                        originPerCBM += Number(item.containerCost) / containerVolumeCBM;
                    }
                    // PER_PALLET items on a CUBE rate card are ignored — admin
                    // should not have created those; if they did it's a config
                    // bug we don't try to silently translate.
                }
            }
        }
    }

    // 2. Ocean freight (CUBE rate)
    let oceanPerCBM = 0;
    let hasOceanRates = false;
    {
        const [oceanRate] = await db
            .select({ totalZAR: oceanFreightRates.totalZAR })
            .from(oceanFreightRates)
            .where(and(
                eq(oceanFreightRates.destinationPortCode, destinationCode),
                eq(oceanFreightRates.containerId, containerTypeId),
                eq(oceanFreightRates.salesRateTypeId, salesRateTypeId),
                eq(oceanFreightRates.cargoType, "CUBE"),
                eq(oceanFreightRates.active, true),
            ))
            .orderBy(desc(oceanFreightRates.effectiveFrom))
            .limit(1);

        if (oceanRate && Number(oceanRate.totalZAR) > 0) {
            hasOceanRates = true;
            oceanPerCBM = Number(oceanRate.totalZAR) / containerVolumeCBM;
        }
    }

    // 3. Destination charges (CUBE rate cards)
    let destinationPerCBM = 0;
    let hasDestinationRates = false;
    {
        const [destCharge] = await db
            .select({ id: destinationCharges.id })
            .from(destinationCharges)
            .where(and(
                eq(destinationCharges.destinationPortCode, destinationCode),
                eq(destinationCharges.containerId, containerTypeId),
                eq(destinationCharges.salesRateTypeId, salesRateTypeId),
                eq(destinationCharges.cargoType, "CUBE"),
                eq(destinationCharges.active, true),
            ))
            .orderBy(desc(destinationCharges.effectiveFrom))
            .limit(1);

        if (destCharge) {
            const items = await db
                .select({ amountZAR: destinationChargeItems.amountZAR, chargeType: destinationChargeItems.chargeType })
                .from(destinationChargeItems)
                .where(eq(destinationChargeItems.destinationChargeId, destCharge.id));

            if (items.length > 0) {
                hasDestinationRates = true;
                for (const item of items) {
                    const amount = Number(item.amountZAR);
                    if (item.chargeType === "PER_CBM") {
                        destinationPerCBM += amount;
                    } else {
                        // PER_CONTAINER / FIXED — proportional split by CBM
                        destinationPerCBM += amount / containerVolumeCBM;
                    }
                }
            }
        }
    }

    const totalPerCBM = originPerCBM + oceanPerCBM + destinationPerCBM;
    const totalCost = totalPerCBM * cbmVolume;
    const depositAmount = totalCost * (DEPOSIT_PERCENTAGE / 100);
    const balanceAmount = totalCost * (BALANCE_PERCENTAGE / 100);

    return {
        originPerCBM: Math.round(originPerCBM * 100) / 100,
        oceanPerCBM: Math.round(oceanPerCBM * 100) / 100,
        destinationPerCBM: Math.round(destinationPerCBM * 100) / 100,
        totalPerCBM: Math.round(totalPerCBM * 100) / 100,
        totalCost: Math.round(totalCost * 100) / 100,
        depositAmount: Math.round(depositAmount * 100) / 100,
        balanceAmount: Math.round(balanceAmount * 100) / 100,
        cbmVolume,
        originName,
        destinationName,
        hasOriginRates,
        hasOceanRates,
        hasDestinationRates,
        containerVolumeCBM,
    };
}
