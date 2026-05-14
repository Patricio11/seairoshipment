import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { originCharges, originChargeItems, containerTypes, salesRateTypes } from "@/lib/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function GET(request: NextRequest) {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const { searchParams } = new URL(request.url);
        const originId = searchParams.get("originId");

        // Fetch headers with joined display names
        let headers;
        const selectFields = {
            id: originCharges.id,
            salesRateTypeId: originCharges.salesRateTypeId,
            originId: originCharges.originId,
            originName: originCharges.originName,
            containerId: originCharges.containerId,
            cargoType: originCharges.cargoType,
            effectiveFrom: originCharges.effectiveFrom,
            effectiveTo: originCharges.effectiveTo,
            currency: originCharges.currency,
            active: originCharges.active,
            createdAt: originCharges.createdAt,
            updatedAt: originCharges.updatedAt,
            containerDisplayName: containerTypes.displayName,
            containerVolumeCBM: containerTypes.volumeCBM,
            containerMaxPallets: containerTypes.maxPallets,
            salesRateTypeName: salesRateTypes.name,
        };
        if (originId) {
            headers = await db
                .select(selectFields)
                .from(originCharges)
                .leftJoin(containerTypes, eq(originCharges.containerId, containerTypes.id))
                .leftJoin(salesRateTypes, eq(originCharges.salesRateTypeId, salesRateTypes.id))
                .where(eq(originCharges.originId, originId))
                .orderBy(desc(originCharges.createdAt));
        } else {
            headers = await db
                .select(selectFields)
                .from(originCharges)
                .leftJoin(containerTypes, eq(originCharges.containerId, containerTypes.id))
                .leftJoin(salesRateTypes, eq(originCharges.salesRateTypeId, salesRateTypes.id))
                .orderBy(desc(originCharges.createdAt));
        }

        // Fetch all items for these headers
        const headerIds = headers.map((h) => h.id);
        let items: (typeof originChargeItems.$inferSelect)[] = [];
        if (headerIds.length > 0) {
            items = await db
                .select()
                .from(originChargeItems)
                .orderBy(asc(originChargeItems.sortOrder));
        }

        // Assemble into nested structure
        const result = headers.map((h) => ({
            ...h,
            items: items.filter((i) => i.originChargeId === h.id),
        }));

        return NextResponse.json(result);
    } catch (error: unknown) {
        console.error("Origin charges fetch error:", error);
        return NextResponse.json({ error: "Failed to fetch origin charges" }, { status: 500 });
    }
}

/**
 * Cross-validation: a CUBE rate card line item must use PER_CBM /
 * PER_CONTAINER / FIXED; PER_PALLET is meaningless. A PALLET rate card
 * line item must use PER_PALLET / PER_CONTAINER / FIXED; PER_CBM is
 * meaningless. Returns an error string when invalid, or null when OK.
 */
function validateChargeTypeForCargoType(
    chargeType: string,
    cargoType: "PALLET" | "CUBE",
): string | null {
    if (cargoType === "CUBE" && chargeType === "PER_PALLET") {
        return "PER_PALLET is not valid on a CUBE rate card — use PER_CBM, PER_CONTAINER, or FIXED.";
    }
    if (cargoType === "PALLET" && chargeType === "PER_CBM") {
        return "PER_CBM is not valid on a PALLET rate card — use PER_PALLET, PER_CONTAINER, or FIXED.";
    }
    if (!["PER_PALLET", "PER_CONTAINER", "FIXED", "PER_CBM"].includes(chargeType)) {
        return `Unknown charge type "${chargeType}".`;
    }
    return null;
}

export async function POST(request: NextRequest) {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const body = await request.json();
        const {
            id: customId,
            salesRateTypeId,
            originId,
            originName,
            containerId,
            effectiveFrom,
            effectiveTo,
            currency,
            active,
            items,
            cargoType: cargoTypeRaw,
        } = body;

        // SRS rate cards are always PALLET. SCS cards take the field from the
        // form (defaults to PALLET if the form didn't supply one).
        const cargoType: "PALLET" | "CUBE" = salesRateTypeId === "srs"
            ? "PALLET"
            : (cargoTypeRaw === "CUBE" ? "CUBE" : "PALLET");

        // Pre-validate every item before any insert so we don't half-create the card.
        if (items && Array.isArray(items)) {
            for (const item of items) {
                const ct = (item as Record<string, unknown>).chargeType as string;
                const err = validateChargeTypeForCargoType(ct, cargoType);
                if (err) return NextResponse.json({ error: err }, { status: 400 });
            }
        }

        const id = customId || `oc-${nanoid(8)}`;
        const [created] = await db
            .insert(originCharges)
            .values({
                id,
                salesRateTypeId,
                originId,
                originName,
                containerId,
                cargoType,
                effectiveFrom,
                effectiveTo: effectiveTo || null,
                currency: currency || "ZAR",
                active: active !== false,
            })
            .returning();

        // Insert items if provided
        if (items && items.length > 0) {
            await db.insert(originChargeItems).values(
                items.map((item: Record<string, unknown>, idx: number) => ({
                    id: (item.id as string)?.startsWith("new-") ? `oci-${nanoid(6)}` : (item.id as string) || `oci-${nanoid(6)}`,
                    originChargeId: id,
                    chargeCode: (item.chargeCode as string) || "",
                    chargeName: item.chargeName as string,
                    chargeType: item.chargeType as "PER_PALLET" | "PER_CONTAINER" | "FIXED" | "PER_CBM",
                    category: (item.category as string) || "OTHER",
                    unitCost: item.unitCost != null ? String(item.unitCost) : null,
                    containerCost: item.containerCost != null ? String(item.containerCost) : null,
                    buyUnitCost: item.buyUnitCost != null ? String(item.buyUnitCost) : null,
                    buyContainerCost: item.buyContainerCost != null ? String(item.buyContainerCost) : null,
                    mandatory: item.mandatory !== false,
                    sortOrder: (item.sortOrder as number) ?? idx + 1,
                    notes: (item.notes as string) || null,
                }))
            );
        }

        return NextResponse.json(created, { status: 201 });
    } catch (error: unknown) {
        console.error("Origin charge create error:", error);
        return NextResponse.json({ error: "Failed to create origin charge" }, { status: 500 });
    }
}
