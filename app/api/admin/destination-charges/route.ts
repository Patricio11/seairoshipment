import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { destinationCharges, destinationChargeItems, containerTypes, salesRateTypes } from "@/lib/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function GET(request: NextRequest) {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const { searchParams } = new URL(request.url);
        const destId = searchParams.get("destId");

        let headers;
        const selectFields = {
            id: destinationCharges.id,
            salesRateTypeId: destinationCharges.salesRateTypeId,
            destinationId: destinationCharges.destinationId,
            destinationName: destinationCharges.destinationName,
            destinationPortCode: destinationCharges.destinationPortCode,
            containerId: destinationCharges.containerId,
            currency: destinationCharges.currency,
            exchangeRateToZAR: destinationCharges.exchangeRateToZAR,
            buyExchangeRateToZAR: destinationCharges.buyExchangeRateToZAR,
            effectiveFrom: destinationCharges.effectiveFrom,
            effectiveTo: destinationCharges.effectiveTo,
            active: destinationCharges.active,
            createdAt: destinationCharges.createdAt,
            updatedAt: destinationCharges.updatedAt,
            containerDisplayName: containerTypes.displayName,
            salesRateTypeName: salesRateTypes.name,
        };

        if (destId) {
            headers = await db
                .select(selectFields)
                .from(destinationCharges)
                .leftJoin(containerTypes, eq(destinationCharges.containerId, containerTypes.id))
                .leftJoin(salesRateTypes, eq(destinationCharges.salesRateTypeId, salesRateTypes.id))
                .where(eq(destinationCharges.destinationId, destId))
                .orderBy(desc(destinationCharges.createdAt));
        } else {
            headers = await db
                .select(selectFields)
                .from(destinationCharges)
                .leftJoin(containerTypes, eq(destinationCharges.containerId, containerTypes.id))
                .leftJoin(salesRateTypes, eq(destinationCharges.salesRateTypeId, salesRateTypes.id))
                .orderBy(desc(destinationCharges.createdAt));
        }

        // Fetch all items
        const items = await db
            .select()
            .from(destinationChargeItems)
            .orderBy(asc(destinationChargeItems.sortOrder));

        const result = headers.map((h) => ({
            ...h,
            items: items.filter((i) => i.destinationChargeId === h.id),
        }));

        return NextResponse.json(result);
    } catch (error: unknown) {
        console.error("Destination charges fetch error:", error);
        return NextResponse.json({ error: "Failed to fetch destination charges" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const body = await request.json();
        const {
            id: customId, salesRateTypeId, destinationId, destinationName,
            destinationPortCode, containerId, currency, exchangeRateToZAR,
            buyExchangeRateToZAR, effectiveFrom, effectiveTo, active, items,
        } = body;

        const id = customId || `dc-${nanoid(8)}`;
        const [created] = await db
            .insert(destinationCharges)
            .values({
                id,
                salesRateTypeId: salesRateTypeId || "srs",
                destinationId,
                destinationName,
                destinationPortCode,
                containerId,
                currency,
                exchangeRateToZAR: String(exchangeRateToZAR),
                buyExchangeRateToZAR: buyExchangeRateToZAR != null ? String(buyExchangeRateToZAR) : null,
                effectiveFrom,
                effectiveTo: effectiveTo || null,
                active: active !== false,
            })
            .returning();

        if (items && items.length > 0) {
            await db.insert(destinationChargeItems).values(
                items.map((item: Record<string, unknown>, idx: number) => ({
                    id: (item.id as string)?.startsWith("new-") ? `dci-${nanoid(6)}` : (item.id as string) || `dci-${nanoid(6)}`,
                    destinationChargeId: id,
                    chargeCode: (item.chargeCode as string) || "",
                    chargeName: item.chargeName as string,
                    chargeType: (item.chargeType as string) || "PER_CONTAINER",
                    amountLocal: String(item.amountLocal),
                    amountZAR: String(item.amountZAR),
                    buyAmountZAR: item.buyAmountZAR != null ? String(item.buyAmountZAR) : null,
                    sortOrder: (item.sortOrder as number) ?? idx + 1,
                    notes: (item.notes as string) || null,
                }))
            );
        }

        return NextResponse.json(created, { status: 201 });
    } catch (error: unknown) {
        console.error("Destination charge create error:", error);
        const message = error instanceof Error ? error.message : "Failed to create destination charge";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
