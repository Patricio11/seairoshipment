/**
 * Seed script — populates rate management tables from mock data.
 * Run with: npx tsx lib/db/seed.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { locations } from "./schema/locations";
import { containerTypes } from "./schema/container-types";
import { salesRateTypes } from "./schema/sales-rate-types";
import {
    originCharges,
    originChargeItems,
    oceanFreightRates,
    destinationCharges,
    destinationChargeItems,
} from "./schema/rate-tables";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function seed() {
    console.log("Seeding database...");

    // 1. Locations
    console.log("  → Locations...");
    await db
        .insert(locations)
        .values([
            { id: "LOC-001", name: "Cape Town", code: "ZACPT", country: "South Africa", type: "ORIGIN", active: true, coordinates: "33.9249° S, 18.4241° E" },
            { id: "LOC-002", name: "Durban", code: "ZADUR", country: "South Africa", type: "ORIGIN", active: true, coordinates: "29.8587° S, 31.0218° E" },
            { id: "LOC-003", name: "Rotterdam", code: "NLRTM", country: "Netherlands", type: "DESTINATION", active: true, coordinates: "51.9225° N, 4.4792° E" },
            { id: "LOC-004", name: "London Gateway", code: "GBLND", country: "United Kingdom", type: "DESTINATION", active: true, coordinates: "51.5074° N, 0.1278° W" },
            { id: "LOC-005", name: "Singapore", code: "SGSIN", country: "Singapore", type: "HUB", active: true, coordinates: "1.3521° N, 103.8198° E" },
            { id: "LOC-006", name: "Ashdod", code: "ILASH", country: "Israel", type: "DESTINATION", active: false, coordinates: "31.8014° N, 34.6435° E" },
        ])
        .onConflictDoNothing();

    // 2. Container Types
    console.log("  → Container types...");
    await db
        .insert(containerTypes)
        .values([
            { id: "20ft-reefer-std", size: "20FT", type: "REEFER", variant: "STD", code: "20FT-REEFER-STD", displayName: "20ft Reefer", maxPallets: 10, active: true },
            { id: "20ft-dry-std", size: "20FT", type: "DRY", variant: "STD", code: "20FT-DRY-STD", displayName: "20ft Dry Container", maxPallets: 10, active: true },
            { id: "40ft-reefer-std", size: "40FT", type: "REEFER", variant: "STD", code: "40FT-REEFER-STD", displayName: "40ft Reefer", maxPallets: 20, active: true },
            { id: "40ft-reefer-hc", size: "40FT", type: "REEFER", variant: "HC", code: "40FT-REEFER-HC", displayName: "40ft HC Reefer", maxPallets: 20, active: true },
            { id: "40ft-dry-std", size: "40FT", type: "DRY", variant: "STD", code: "40FT-DRY-STD", displayName: "40ft Dry Container", maxPallets: 20, active: true },
            { id: "40ft-dry-hc", size: "40FT", type: "DRY", variant: "HC", code: "40FT-DRY-HC", displayName: "40ft HC Dry Container", maxPallets: 20, active: true },
        ])
        .onConflictDoNothing();

    // 3. Sales Rate Types
    console.log("  → Sales rate types...");
    await db
        .insert(salesRateTypes)
        .values([
            { id: "srs", code: "SRS", name: "Shared Reefer Services", description: "SRS consolidation service for refrigerated cargo", active: true },
            { id: "scs", code: "SCS", name: "Seairo Cargo Solutions", description: "Full container load (FCL) premium service", active: true },
        ])
        .onConflictDoNothing();

    // 4. Origin Charges (headers)
    console.log("  → Origin charges...");
    await db
        .insert(originCharges)
        .values([
            { id: "oc-cpt-40hc-srs", salesRateTypeId: "srs", originId: "cpt", originName: "Cape Town", containerId: "40ft-reefer-hc", effectiveFrom: "2024-01-01", effectiveTo: "2024-12-31", currency: "ZAR", active: true },
            { id: "oc-cpt-20ft-srs", salesRateTypeId: "srs", originId: "cpt", originName: "Cape Town", containerId: "20ft-reefer-std", effectiveFrom: "2024-01-01", effectiveTo: "2024-12-31", currency: "ZAR", active: true },
            { id: "oc-dur-40hc-srs", salesRateTypeId: "srs", originId: "dur", originName: "Durban", containerId: "40ft-reefer-hc", effectiveFrom: "2024-01-01", effectiveTo: "2024-12-31", currency: "ZAR", active: true },
        ])
        .onConflictDoNothing();

    // 5. Origin Charge Items (CPT 40HC SRS — 25 items)
    console.log("  → Origin charge items...");
    await db
        .insert(originChargeItems)
        .values([
            { id: "oci-1", originChargeId: "oc-cpt-40hc-srs", chargeCode: "COLLECTION", chargeName: "Collection in/around Cape Town", chargeType: "PER_CONTAINER", category: "COLLECTION", unitCost: null, containerCost: "10000.00", mandatory: true, sortOrder: 1, notes: null },
            { id: "oci-2", originChargeId: "oc-cpt-40hc-srs", chargeCode: "COLD_STORAGE", chargeName: "Cold storage per week and part thereof", chargeType: "PER_PALLET", category: "STORAGE", unitCost: "335.00", containerCost: "6700.00", mandatory: true, sortOrder: 2, notes: "Charged weekly, minimum 1 week" },
            { id: "oci-3", originChargeId: "oc-cpt-40hc-srs", chargeCode: "HANDLING", chargeName: "Handling in and out", chargeType: "PER_PALLET", category: "HANDLING", unitCost: "130.00", containerCost: "2600.00", mandatory: true, sortOrder: 3, notes: null },
            { id: "oci-4", originChargeId: "oc-cpt-40hc-srs", chargeCode: "TRANSPORT_TBP", chargeName: "Transport - Table Bay to port", chargeType: "PER_PALLET", category: "TRANSPORT", unitCost: "260.00", containerCost: "5200.00", mandatory: true, sortOrder: 4, notes: null },
            { id: "oci-5", originChargeId: "oc-cpt-40hc-srs", chargeCode: "FUEL_SURCHARGE", chargeName: "Fuel Surcharge", chargeType: "FIXED", category: "TRANSPORT", unitCost: null, containerCost: null, mandatory: false, sortOrder: 5, notes: "Subject to change based on fuel prices" },
            { id: "oci-6", originChargeId: "oc-cpt-40hc-srs", chargeCode: "GENSET", chargeName: "Genset", chargeType: "PER_PALLET", category: "TRANSPORT", unitCost: "92.50", containerCost: "1850.00", mandatory: true, sortOrder: 6, notes: "Refrigeration power unit" },
            { id: "oci-7", originChargeId: "oc-cpt-40hc-srs", chargeCode: "VGM", chargeName: "VGM (Verified Gross Mass)", chargeType: "PER_PALLET", category: "REGULATORY", unitCost: "45.00", containerCost: "900.00", mandatory: true, sortOrder: 7, notes: "SOLAS requirement" },
            { id: "oci-8", originChargeId: "oc-cpt-40hc-srs", chargeCode: "THC", chargeName: "Terminal Handling Charge", chargeType: "PER_CONTAINER", category: "REGULATORY", unitCost: "309.40", containerCost: "6188.00", mandatory: true, sortOrder: 8, notes: null },
            { id: "oci-9", originChargeId: "oc-cpt-40hc-srs", chargeCode: "CARRIER_SVC", chargeName: "Carrier Service Fee", chargeType: "PER_PALLET", category: "REGULATORY", unitCost: "72.35", containerCost: "1447.00", mandatory: true, sortOrder: 9, notes: null },
            { id: "oci-10", originChargeId: "oc-cpt-40hc-srs", chargeCode: "CARGO_DUES", chargeName: "Cargo Dues", chargeType: "PER_CONTAINER", category: "REGULATORY", unitCost: null, containerCost: "826.67", mandatory: true, sortOrder: 10, notes: null },
            { id: "oci-11", originChargeId: "oc-cpt-40hc-srs", chargeCode: "BL_FEE", chargeName: "Bill of Lading Fee", chargeType: "PER_CONTAINER", category: "DOCUMENTATION", unitCost: null, containerCost: "5500.00", mandatory: true, sortOrder: 11, notes: null },
            { id: "oci-12", originChargeId: "oc-cpt-40hc-srs", chargeCode: "SEAL_FEE", chargeName: "Seal Fee", chargeType: "PER_CONTAINER", category: "REGULATORY", unitCost: null, containerCost: "350.00", mandatory: true, sortOrder: 12, notes: null },
            { id: "oci-13", originChargeId: "oc-cpt-40hc-srs", chargeCode: "NAVIS", chargeName: "Navis Fee", chargeType: "PER_CONTAINER", category: "REGULATORY", unitCost: null, containerCost: "350.00", mandatory: true, sortOrder: 13, notes: "Port system fee" },
            { id: "oci-14", originChargeId: "oc-cpt-40hc-srs", chargeCode: "COURIER", chargeName: "Courier Fee", chargeType: "PER_CONTAINER", category: "DOCUMENTATION", unitCost: null, containerCost: "850.00", mandatory: true, sortOrder: 14, notes: null },
            { id: "oci-15", originChargeId: "oc-cpt-40hc-srs", chargeCode: "TRACKING", chargeName: "Tracking and reporting", chargeType: "PER_CONTAINER", category: "DOCUMENTATION", unitCost: null, containerCost: "1750.00", mandatory: true, sortOrder: 15, notes: null },
            { id: "oci-16", originChargeId: "oc-cpt-40hc-srs", chargeCode: "DATA_LOGGER", chargeName: "Data Logger", chargeType: "PER_CONTAINER", category: "DOCUMENTATION", unitCost: null, containerCost: "750.00", mandatory: true, sortOrder: 16, notes: "TIVE temperature monitoring device" },
            { id: "oci-17", originChargeId: "oc-cpt-40hc-srs", chargeCode: "PORT_HEALTH", chargeName: "Port Health Inspections", chargeType: "PER_CONTAINER", category: "REGULATORY", unitCost: null, containerCost: "1200.00", mandatory: true, sortOrder: 17, notes: null },
            { id: "oci-18", originChargeId: "oc-cpt-40hc-srs", chargeCode: "PPECB", chargeName: "PPECB Inspection", chargeType: "PER_CONTAINER", category: "REGULATORY", unitCost: null, containerCost: "1850.00", mandatory: true, sortOrder: 18, notes: "Perishable Products Export Control Board" },
            { id: "oci-19", originChargeId: "oc-cpt-40hc-srs", chargeCode: "EUR1", chargeName: "EUR 1 Certificate", chargeType: "PER_CONTAINER", category: "REGULATORY", unitCost: null, containerCost: "350.00", mandatory: false, sortOrder: 19, notes: "Certificate of origin for EU destinations" },
            { id: "oci-20", originChargeId: "oc-cpt-40hc-srs", chargeCode: "NRCS", chargeName: "NRCS Inspection", chargeType: "PER_CONTAINER", category: "REGULATORY", unitCost: null, containerCost: "1500.00", mandatory: true, sortOrder: 20, notes: "National Regulator for Compulsory Specifications" },
            { id: "oci-21", originChargeId: "oc-cpt-40hc-srs", chargeCode: "EDI", chargeName: "EDI Fee", chargeType: "PER_CONTAINER", category: "REGULATORY", unitCost: null, containerCost: null, mandatory: true, sortOrder: 21, notes: "Electronic Data Interchange" },
            { id: "oci-22", originChargeId: "oc-cpt-40hc-srs", chargeCode: "CUSTOMS", chargeName: "Customs Clearance", chargeType: "PER_CONTAINER", category: "CUSTOMS", unitCost: null, containerCost: "1200.00", mandatory: true, sortOrder: 22, notes: null },
            { id: "oci-23", originChargeId: "oc-cpt-40hc-srs", chargeCode: "INSURANCE", chargeName: "Insurance", chargeType: "PER_CONTAINER", category: "INSURANCE", unitCost: null, containerCost: "12000.00", mandatory: true, sortOrder: 23, notes: "Optional cargo insurance" },
            { id: "oci-24", originChargeId: "oc-cpt-40hc-srs", chargeCode: "AGENCY_FEE", chargeName: "Agency Fee", chargeType: "PER_CONTAINER", category: "OTHER", unitCost: null, containerCost: "8000.00", mandatory: true, sortOrder: 24, notes: null },
            { id: "oci-25", originChargeId: "oc-cpt-40hc-srs", chargeCode: "FACILITY_FEE", chargeName: "Facility Fee - on 30 days", chargeType: "PER_CONTAINER", category: "OTHER", unitCost: null, containerCost: "4500.00", mandatory: true, sortOrder: 25, notes: "Warehouse facility usage" },
        ])
        .onConflictDoNothing();

    // 6. Ocean Freight Rates
    console.log("  → Ocean freight rates...");
    await db
        .insert(oceanFreightRates)
        .values([
            { id: "of-1", salesRateTypeId: "srs", origin: "Cape Town/ Durban", destinationCountry: "UK", destinationPort: "London Gateway", destinationPortCode: "GBLND", shippingLine: "MSC", containerId: "40ft-reefer-hc", effectiveFrom: "2024-01-01", effectiveTo: "2024-12-31", freightUSD: "4606.00", bafUSD: "882.00", ispsUSD: "15.00", otherSurchargesUSD: "55.00", rcgUSD: "42.00", totalUSD: "5600.00", exchangeRate: "15.9", totalZAR: "89040.00", active: true },
            { id: "of-2", salesRateTypeId: "srs", origin: "Cape Town/ Durban", destinationCountry: "UK", destinationPort: "Immingham", destinationPortCode: "GBIMM", shippingLine: "MSC", containerId: "40ft-reefer-hc", effectiveFrom: "2024-01-01", effectiveTo: "2024-12-31", freightUSD: "0", bafUSD: "0", ispsUSD: "0", otherSurchargesUSD: "0", rcgUSD: "0", totalUSD: "0", exchangeRate: "15.9", totalZAR: "0", active: false },
            { id: "of-3", salesRateTypeId: "srs", origin: "Cape Town/ Durban", destinationCountry: "Ireland", destinationPort: "Dublin", destinationPortCode: "IEDUB", shippingLine: "MSC", containerId: "40ft-reefer-hc", effectiveFrom: "2024-01-01", effectiveTo: "2024-12-31", freightUSD: "3900.00", bafUSD: "882.00", ispsUSD: "15.00", otherSurchargesUSD: "859.00", rcgUSD: "42.00", totalUSD: "5698.00", exchangeRate: "15.9", totalZAR: "90598.20", active: true },
            { id: "of-4", salesRateTypeId: "srs", origin: "Cape Town/ Durban", destinationCountry: "Portugal", destinationPort: "Leixões", destinationPortCode: "PTLEI", shippingLine: "MSC", containerId: "40ft-reefer-hc", effectiveFrom: "2024-01-01", effectiveTo: "2024-12-31", freightUSD: "3950.00", bafUSD: "884.00", ispsUSD: "15.00", otherSurchargesUSD: "157.00", rcgUSD: "42.00", totalUSD: "5048.00", exchangeRate: "15.9", totalZAR: "80263.20", active: true },
            { id: "of-5", salesRateTypeId: "srs", origin: "Cape Town/ Durban", destinationCountry: "Italy", destinationPort: "Genoa", destinationPortCode: "ITGOA", shippingLine: "MSC", containerId: "40ft-reefer-hc", effectiveFrom: "2024-01-01", effectiveTo: "2024-12-31", freightUSD: "3700.00", bafUSD: "882.00", ispsUSD: "15.00", otherSurchargesUSD: "11.00", rcgUSD: "42.00", totalUSD: "4650.00", exchangeRate: "15.9", totalZAR: "73935.00", active: true },
            { id: "of-6", salesRateTypeId: "srs", origin: "Cape Town/ Durban", destinationCountry: "Belgium", destinationPort: "Antwerp", destinationPortCode: "BEANR", shippingLine: "MSC", containerId: "40ft-reefer-hc", effectiveFrom: "2024-01-01", effectiveTo: "2024-12-31", freightUSD: "0", bafUSD: "0", ispsUSD: "0", otherSurchargesUSD: "0", rcgUSD: "0", totalUSD: "0", exchangeRate: "15.9", totalZAR: "0", active: false },
            { id: "of-7", salesRateTypeId: "srs", origin: "Cape Town/ Durban", destinationCountry: "Germany", destinationPort: "Bremerhaven", destinationPortCode: "DEBRV", shippingLine: "MSC", containerId: "40ft-reefer-hc", effectiveFrom: "2024-01-01", effectiveTo: "2024-12-31", freightUSD: "0", bafUSD: "0", ispsUSD: "0", otherSurchargesUSD: "0", rcgUSD: "0", totalUSD: "0", exchangeRate: "15.9", totalZAR: "0", active: false },
            { id: "of-8", salesRateTypeId: "srs", origin: "Cape Town/ Durban", destinationCountry: "France", destinationPort: "Le Havre", destinationPortCode: "FRLEH", shippingLine: "MSC", containerId: "40ft-reefer-hc", effectiveFrom: "2024-01-01", effectiveTo: "2024-12-31", freightUSD: "3900.00", bafUSD: "882.00", ispsUSD: "15.00", otherSurchargesUSD: "329.00", rcgUSD: "42.00", totalUSD: "5168.00", exchangeRate: "15.9", totalZAR: "82171.20", active: true },
            { id: "of-9", salesRateTypeId: "srs", origin: "Cape Town/ Durban", destinationCountry: "Spain", destinationPort: "Vigo", destinationPortCode: "ESVGO", shippingLine: "MSC", containerId: "40ft-reefer-hc", effectiveFrom: "2024-01-01", effectiveTo: "2024-12-31", freightUSD: "0", bafUSD: "0", ispsUSD: "0", otherSurchargesUSD: "0", rcgUSD: "0", totalUSD: "0", exchangeRate: "15.9", totalZAR: "0", active: false },
            { id: "of-10", salesRateTypeId: "srs", origin: "Cape Town/ Durban", destinationCountry: "Greece", destinationPort: "Limassol", destinationPortCode: "CYLMS", shippingLine: "MSC", containerId: "40ft-reefer-hc", effectiveFrom: "2024-01-01", effectiveTo: "2024-12-31", freightUSD: "6168.00", bafUSD: "882.00", ispsUSD: "15.00", otherSurchargesUSD: "1739.00", rcgUSD: "42.00", totalUSD: "8846.00", exchangeRate: "15.9", totalZAR: "140651.40", active: true },
            { id: "of-11", salesRateTypeId: "srs", origin: "Cape Town/ Durban", destinationCountry: "Spain", destinationPort: "Las Palmas", destinationPortCode: "ESLPA", shippingLine: "MSC", containerId: "40ft-reefer-hc", effectiveFrom: "2024-01-01", effectiveTo: "2024-12-31", freightUSD: "0", bafUSD: "0", ispsUSD: "0", otherSurchargesUSD: "0", rcgUSD: "0", totalUSD: "0", exchangeRate: "15.9", totalZAR: "0", active: false },
        ])
        .onConflictDoNothing();

    // 7. Destination Charges (headers)
    console.log("  → Destination charges...");
    await db
        .insert(destinationCharges)
        .values([
            { id: "dc-lon-40hc-srs", salesRateTypeId: "srs", destinationId: "lnd", destinationName: "London Gateway", destinationPortCode: "GBLND", containerId: "40ft-reefer-hc", currency: "GBP", exchangeRateToZAR: "22.30", effectiveFrom: "2024-01-01", effectiveTo: "2024-12-31", active: true },
            { id: "dc-dub-40hc-srs", salesRateTypeId: "srs", destinationId: "dub", destinationName: "Dublin", destinationPortCode: "IEDUB", containerId: "40ft-reefer-hc", currency: "EUR", exchangeRateToZAR: "20.40", effectiveFrom: "2024-01-01", effectiveTo: "2024-12-31", active: true },
            { id: "dc-goa-40hc-srs", salesRateTypeId: "srs", destinationId: "goa", destinationName: "Genoa", destinationPortCode: "ITGOA", containerId: "40ft-reefer-hc", currency: "EUR", exchangeRateToZAR: "20.40", effectiveFrom: "2024-01-01", effectiveTo: "2024-12-31", active: true },
            { id: "dc-leh-40hc-srs", salesRateTypeId: "srs", destinationId: "leh", destinationName: "Le Havre", destinationPortCode: "FRLEH", containerId: "40ft-reefer-hc", currency: "EUR", exchangeRateToZAR: "20.40", effectiveFrom: "2024-01-01", effectiveTo: "2024-12-31", active: true },
        ])
        .onConflictDoNothing();

    // 8. Destination Charge Items
    console.log("  → Destination charge items...");
    await db
        .insert(destinationChargeItems)
        .values([
            // London Gateway items
            { id: "dci-lon-1", destinationChargeId: "dc-lon-40hc-srs", chargeCode: "DELIVERY", chargeName: "Delivery to cold store Kent", chargeType: "PER_CONTAINER", amountLocal: "560.00", amountZAR: "12488.00", sortOrder: 1, notes: null },
            { id: "dci-lon-2", destinationChargeId: "dc-lon-40hc-srs", chargeCode: "GENSET", chargeName: "Genset", chargeType: "PER_CONTAINER", amountLocal: "280.00", amountZAR: "6244.00", sortOrder: 2, notes: null },
            { id: "dci-lon-3", destinationChargeId: "dc-lon-40hc-srs", chargeCode: "DOCUMENTATION", chargeName: "Documentation", chargeType: "PER_CONTAINER", amountLocal: "55.00", amountZAR: "1226.50", sortOrder: 3, notes: null },
            { id: "dci-lon-4", destinationChargeId: "dc-lon-40hc-srs", chargeCode: "PORT_CHARGES", chargeName: "Port Charges", chargeType: "PER_CONTAINER", amountLocal: "110.00", amountZAR: "2453.00", sortOrder: 4, notes: null },
            { id: "dci-lon-5", destinationChargeId: "dc-lon-40hc-srs", chargeCode: "THC", chargeName: "Terminal Handling Charge", chargeType: "PER_CONTAINER", amountLocal: "285.00", amountZAR: "6355.50", sortOrder: 5, notes: null },
            { id: "dci-lon-6", destinationChargeId: "dc-lon-40hc-srs", chargeCode: "CUSTOMS_ENTRY", chargeName: "Customs Entry", chargeType: "PER_CONTAINER", amountLocal: "400.00", amountZAR: "8920.00", sortOrder: 6, notes: null },
            { id: "dci-lon-7", destinationChargeId: "dc-lon-40hc-srs", chargeCode: "CARRIER_TERMINAL", chargeName: "Carrier Terminal Fees", chargeType: "PER_CONTAINER", amountLocal: "100.00", amountZAR: "2230.00", sortOrder: 7, notes: null },
            { id: "dci-lon-8", destinationChargeId: "dc-lon-40hc-srs", chargeCode: "UNPACK", chargeName: "Unpack", chargeType: "PER_CONTAINER", amountLocal: "385.00", amountZAR: "8585.50", sortOrder: 8, notes: "Container devanning and pallet handling" },
            // Dublin items
            { id: "dci-dub-1", destinationChargeId: "dc-dub-40hc-srs", chargeCode: "DELIVERY", chargeName: "Delivery to cold store Dublin", chargeType: "PER_CONTAINER", amountLocal: "520.00", amountZAR: "10608.00", sortOrder: 1, notes: null },
            { id: "dci-dub-2", destinationChargeId: "dc-dub-40hc-srs", chargeCode: "THC", chargeName: "Terminal Handling Charge", chargeType: "PER_CONTAINER", amountLocal: "295.00", amountZAR: "6019.00", sortOrder: 2, notes: null },
            { id: "dci-dub-3", destinationChargeId: "dc-dub-40hc-srs", chargeCode: "CUSTOMS_ENTRY", chargeName: "Customs Entry", chargeType: "PER_CONTAINER", amountLocal: "380.00", amountZAR: "7752.00", sortOrder: 3, notes: null },
            { id: "dci-dub-4", destinationChargeId: "dc-dub-40hc-srs", chargeCode: "UNPACK", chargeName: "Unpack", chargeType: "PER_CONTAINER", amountLocal: "350.00", amountZAR: "7140.00", sortOrder: 4, notes: null },
        ])
        .onConflictDoNothing();

    console.log("Seed complete!");
}

seed()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error("Seed failed:", err);
        process.exit(1);
    });
