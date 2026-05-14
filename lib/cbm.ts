/**
 * Pure helpers for the CBM (cubic-metre) calculator. No React, no DB.
 *
 * Internal canonical storage:
 *   - lengths in millimetres (integer-friendly)
 *   - weights in kilograms (float)
 *   - volumes in cubic metres (float)
 *
 * Unit toggles in the UI are display-side only; data flows in/out in the
 * canonical units. This keeps the calculator round-trip-safe across unit
 * switches.
 */

import type { CargoItem } from "@/lib/db/schema/pallet-allocations";

/* -------------------------------------------------------------------------- */
/* Unit conversions                                                            */
/* -------------------------------------------------------------------------- */

export type LengthUnit = "cm" | "in" | "m" | "ft";
export type WeightUnit = "kg" | "lb";

const MM_PER_LENGTH_UNIT: Record<LengthUnit, number> = {
    cm: 10,
    in: 25.4,
    m: 1000,
    ft: 304.8,
};

const KG_PER_WEIGHT_UNIT: Record<WeightUnit, number> = {
    kg: 1,
    lb: 0.45359237,
};

export function toMm(value: number, unit: LengthUnit): number {
    return value * MM_PER_LENGTH_UNIT[unit];
}

export function fromMm(mm: number, unit: LengthUnit): number {
    return mm / MM_PER_LENGTH_UNIT[unit];
}

export function toKg(value: number, unit: WeightUnit): number {
    return value * KG_PER_WEIGHT_UNIT[unit];
}

export function fromKg(kg: number, unit: WeightUnit): number {
    return kg / KG_PER_WEIGHT_UNIT[unit];
}

/* -------------------------------------------------------------------------- */
/* CBM math                                                                    */
/* -------------------------------------------------------------------------- */

/** Volume of a single item including its quantity, in cubic metres. */
export function itemCbm(item: Pick<CargoItem, "lengthMm" | "widthMm" | "heightMm" | "quantity">): number {
    const oneUnitCbm = (item.lengthMm * item.widthMm * item.heightMm) / 1_000_000_000;
    return oneUnitCbm * (item.quantity || 0);
}

export function totalCbm(items: CargoItem[]): number {
    return items.reduce((sum, item) => sum + itemCbm(item), 0);
}

/** Sum of (per-unit weight × quantity) across all items, in kg. */
export function totalWeight(items: CargoItem[]): number {
    return items.reduce((sum, item) => sum + (item.weightKg || 0) * (item.quantity || 0), 0);
}

/* -------------------------------------------------------------------------- */
/* Volumetric weight by shipping mode                                          */
/* -------------------------------------------------------------------------- */
/**
 * IATA / industry-standard volumetric-weight factors. Sea is the only one we
 * surface in the UI for v1, but the others are kept here so future calculators
 * (chargeable weight) don't have to re-derive them.
 *
 *   Sea     1000 kg / m³ (1 CBM = 1000 kg)
 *   Air      167 kg / m³ (IATA factor 6000 — 1,000,000 cm³ / 6000)
 *   Courier  200 kg / m³ (factor 5000)
 *   Road     333 kg / m³ (factor 3000)
 */

export const VOLUMETRIC_FACTOR_KG_PER_CBM = {
    sea: 1000,
    air: 167,
    courier: 200,
    road: 333,
} as const;

export type ShippingMode = keyof typeof VOLUMETRIC_FACTOR_KG_PER_CBM;

export function volumetricWeight(cbm: number, mode: ShippingMode = "sea"): number {
    return cbm * VOLUMETRIC_FACTOR_KG_PER_CBM[mode];
}

/** Sea-mode volumetric weight, kg. Convenience alias used everywhere in v1. */
export function volumetricWeightSea(cbm: number): number {
    return volumetricWeight(cbm, "sea");
}

/**
 * Chargeable weight = max(actual gross weight, volumetric weight).
 * Used by quote engines that price on weight rather than volume.
 */
export function chargeableWeight(actualKg: number, cbm: number, mode: ShippingMode = "sea"): number {
    return Math.max(actualKg, volumetricWeight(cbm, mode));
}

/* -------------------------------------------------------------------------- */
/* Container fit                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Standard interior volumes in m³. These are conservative industry-typical
 * figures; admin can override per `container_types.volumeCBM` for any
 * custom build (refrigerated, open-top, flat rack etc.).
 */
export const STANDARD_CONTAINERS = {
    "20ft": 33.2,
    "40ft": 67.7,
    "40ftHC": 76.4,
} as const;

export type StandardContainer = keyof typeof STANDARD_CONTAINERS;

export interface ContainerFit {
    fits: boolean;
    percentFull: number;       // 0–100
    remainingCbm: number;      // negative when over capacity
    qtyContainersNeeded: number; // ceil(totalCbm / containerVolume) — for "how many of these to ship X"
}

export function fitInContainer(totalCbm: number, containerVolumeCbm: number): ContainerFit {
    if (!containerVolumeCbm || containerVolumeCbm <= 0) {
        return { fits: false, percentFull: 0, remainingCbm: 0, qtyContainersNeeded: 0 };
    }
    const percentFull = (totalCbm / containerVolumeCbm) * 100;
    return {
        fits: totalCbm <= containerVolumeCbm,
        percentFull,
        remainingCbm: containerVolumeCbm - totalCbm,
        qtyContainersNeeded: Math.max(1, Math.ceil(totalCbm / containerVolumeCbm)),
    };
}

/**
 * Returns one fit row per standard container plus the smallest that fits.
 * Drives the "Container fit" table in the calculator UI.
 */
export function fitInStandardContainers(totalCbm: number): Array<{
    container: StandardContainer;
    volumeCbm: number;
    fit: ContainerFit;
}> {
    return (Object.keys(STANDARD_CONTAINERS) as StandardContainer[]).map(container => ({
        container,
        volumeCbm: STANDARD_CONTAINERS[container],
        fit: fitInContainer(totalCbm, STANDARD_CONTAINERS[container]),
    }));
}

export function smallestFitContainer(totalCbm: number): StandardContainer | null {
    const ordered: StandardContainer[] = ["20ft", "40ft", "40ftHC"];
    return ordered.find(c => totalCbm <= STANDARD_CONTAINERS[c]) ?? null;
}

/* -------------------------------------------------------------------------- */
/* Friendly displays                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Equivalent in standard EUR1 pallets (1.2 × 1.0 × 1.4 m = 1.68 m³).
 * Bridges the mental model for clients used to thinking in pallets,
 * but it's a volumetric approximation only — real pallet capacity is
 * lower due to floor-space + stacking constraints.
 */
export const EUR_PALLET_CBM = 1.2 * 1.0 * 1.4; // 1.68

export function palletEquivalent(totalCbm: number): number {
    return totalCbm / EUR_PALLET_CBM;
}

/**
 * CO2-equivalent emissions estimate by mode. Industry-standard tonne-km
 * factors (g CO2eq / tonne-km) over a typical 12,000 km ocean route used
 * as the v1 baseline so we can render an "X kg CO2eq — ~95% less than air"
 * line in the calculator without a per-route lookup.
 *
 *   Sea ≈ 15 g/tkm
 *   Air ≈ 600 g/tkm
 *   Road ≈ 60 g/tkm
 */
const TYPICAL_OCEAN_DISTANCE_KM = 12_000;
const G_CO2_PER_TONNE_KM = { sea: 15, air: 600, road: 60 } as const;

export interface SustainabilityScore {
    kgCO2eqSea: number;
    kgCO2eqAir: number;
    percentLessThanAir: number;
}

export function sustainabilityScore(totalWeightKg: number, totalCbmVolume: number): SustainabilityScore {
    // Use the heavier of actual vs volumetric weight for a realistic chargeable basis.
    const chargeable = chargeableWeight(totalWeightKg, totalCbmVolume, "sea");
    const tonnes = chargeable / 1000;
    const kgCO2eqSea = (tonnes * TYPICAL_OCEAN_DISTANCE_KM * G_CO2_PER_TONNE_KM.sea) / 1000;
    const kgCO2eqAir = (tonnes * TYPICAL_OCEAN_DISTANCE_KM * G_CO2_PER_TONNE_KM.air) / 1000;
    const percentLessThanAir = kgCO2eqAir > 0 ? ((kgCO2eqAir - kgCO2eqSea) / kgCO2eqAir) * 100 : 0;
    return { kgCO2eqSea, kgCO2eqAir, percentLessThanAir };
}

/* -------------------------------------------------------------------------- */
/* Formatting helpers                                                          */
/* -------------------------------------------------------------------------- */

export function formatCbm(cbm: number): string {
    return `${cbm.toFixed(2)} m³`;
}

export function formatKg(kg: number): string {
    if (kg >= 1000) return `${(kg / 1000).toFixed(2)} t`;
    return `${kg.toFixed(kg >= 100 ? 0 : 1)} kg`;
}

export function formatDimensionMm(mm: number, unit: LengthUnit): string {
    return `${fromMm(mm, unit).toFixed(unit === "m" || unit === "ft" ? 2 : 0)} ${unit}`;
}
