import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { productCategories } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * One-shot seed endpoint. Creates the 8 starter categories based on
 * Documents_needed_per_commodity.md. Idempotent — skips anything that
 * already exists by id.
 */
export async function POST() {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const SEED = [
            // SRS (reefer) categories
            {
                id: "cat-frozen-seafood",
                name: "Frozen Seafood",
                description: "Hakes, squid, yellow tail and other frozen fish products",
                salesRateTypeId: "srs",
                allowedTemperatures: ["frozen"],
                requiredDocuments: [
                    "COMMERCIAL_INVOICE", "PACKING_LIST", "IMPORT_PERMIT", "BILL_OF_LADING",
                    "PPECB_EXPORT_CERTIFICATE", "NRCS_HEALTH_CERTIFICATE", "SAD500", "CERTIFICATE_OF_ORIGIN",
                ],
            },
            {
                id: "cat-poultry",
                name: "Poultry",
                description: "Chicken, ostrich, further processed poultry",
                salesRateTypeId: "srs",
                allowedTemperatures: ["frozen"],
                requiredDocuments: [
                    "COMMERCIAL_INVOICE", "PACKING_LIST", "IMPORT_PERMIT", "BILL_OF_LADING",
                    "EXPORT_CERTIFICATE", "PPECB_HEALTH_CERTIFICATE", "HALAAL_CERTIFICATE", "SAD500", "CERTIFICATE_OF_ORIGIN",
                ],
            },
            {
                id: "cat-meat",
                name: "Meat",
                description: "Lamb 6-way cuts, beef cuts, deboned cuts — chilled or frozen",
                salesRateTypeId: "srs",
                allowedTemperatures: ["frozen", "chilled"],
                requiredDocuments: [
                    "COMMERCIAL_INVOICE", "PACKING_LIST", "IMPORT_PERMIT", "BILL_OF_LADING",
                    "EXPORT_CERTIFICATE", "PPECB_HEALTH_CERTIFICATE", "HALAAL_CERTIFICATE", "SAD500", "CERTIFICATE_OF_ORIGIN",
                ],
            },
            {
                id: "cat-dairy",
                name: "Dairy",
                description: "Cheese, cream cheese, butter — chilled or frozen",
                salesRateTypeId: "srs",
                allowedTemperatures: ["frozen", "chilled"],
                requiredDocuments: [
                    "COMMERCIAL_INVOICE", "PACKING_LIST", "IMPORT_PERMIT", "BILL_OF_LADING",
                    "EXPORT_CERTIFICATE", "PPECB_HEALTH_CERTIFICATE", "HALAAL_CERTIFICATE", "SAD500", "CERTIFICATE_OF_ORIGIN",
                ],
            },
            {
                id: "cat-fruit",
                name: "Fruit",
                description: "Fresh fruit exports — chilled reefer",
                salesRateTypeId: "srs",
                allowedTemperatures: ["chilled"],
                requiredDocuments: [
                    "COMMERCIAL_INVOICE", "PACKING_LIST", "IMPORT_PERMIT", "BILL_OF_LADING",
                    "PPECB_EXPORT_CERTIFICATE", "PHYTO_SANITARY", "SAD500", "CERTIFICATE_OF_ORIGIN",
                    "COA", "SGS",
                ],
            },
            // SCS (dry) categories
            {
                id: "cat-hunting-trophies",
                name: "Hunting Trophies",
                description: "Trophies (requires CITES certification)",
                salesRateTypeId: "scs",
                allowedTemperatures: ["ambient"],
                requiredDocuments: [
                    "COMMERCIAL_INVOICE", "PACKING_LIST", "IMPORT_PERMIT", "BILL_OF_LADING",
                    "CITES", "SAD500", "CERTIFICATE_OF_ORIGIN",
                ],
            },
            {
                id: "cat-wine-spirits",
                name: "Wine & Spirits",
                description: "Wine requires SAWIS certification",
                salesRateTypeId: "scs",
                allowedTemperatures: ["ambient"],
                requiredDocuments: [
                    "COMMERCIAL_INVOICE", "PACKING_LIST", "IMPORT_PERMIT", "BILL_OF_LADING",
                    "SAWIS", "SAD500", "CERTIFICATE_OF_ORIGIN",
                ],
            },
            {
                id: "cat-dry-mixed",
                name: "Other Dry Mixed",
                description: "Dry food goods, canned goods, general ambient cargo",
                salesRateTypeId: "scs",
                allowedTemperatures: ["ambient"],
                requiredDocuments: [
                    "COMMERCIAL_INVOICE", "PACKING_LIST", "IMPORT_PERMIT", "BILL_OF_LADING",
                    "SAD500", "CERTIFICATE_OF_ORIGIN",
                ],
            },
        ];

        let created = 0;
        let skipped = 0;

        for (const cat of SEED) {
            const [existing] = await db
                .select()
                .from(productCategories)
                .where(eq(productCategories.id, cat.id))
                .limit(1);
            if (existing) {
                skipped++;
                continue;
            }
            await db.insert(productCategories).values({
                id: cat.id,
                name: cat.name,
                description: cat.description,
                salesRateTypeId: cat.salesRateTypeId,
                allowedTemperatures: cat.allowedTemperatures,
                requiredDocuments: cat.requiredDocuments,
                active: true,
            });
            created++;
        }

        return NextResponse.json({ success: true, created, skipped, total: SEED.length });
    } catch (err) {
        console.error("Seed categories error:", err);
        const message = err instanceof Error ? err.message : "Failed to seed categories";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
