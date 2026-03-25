import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { destinationCharges, destinationChargeItems, containerTypes, salesRateTypes } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const { id } = await params;

        const [header] = await db
            .select({
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
            })
            .from(destinationCharges)
            .leftJoin(containerTypes, eq(destinationCharges.containerId, containerTypes.id))
            .leftJoin(salesRateTypes, eq(destinationCharges.salesRateTypeId, salesRateTypes.id))
            .where(eq(destinationCharges.id, id))
            .limit(1);

        if (!header) {
            return NextResponse.json({ error: "Destination charge not found" }, { status: 404 });
        }

        const items = await db
            .select()
            .from(destinationChargeItems)
            .where(eq(destinationChargeItems.destinationChargeId, id))
            .orderBy(asc(destinationChargeItems.sortOrder));

        return NextResponse.json({ ...header, items });
    } catch (error: unknown) {
        console.error("Destination charge fetch error:", error);
        return NextResponse.json({ error: "Failed to fetch destination charge" }, { status: 500 });
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const { id } = await params;
        const body = await request.json();
        const { currency, exchangeRateToZAR, buyExchangeRateToZAR, effectiveFrom, effectiveTo, active, items } = body;

        const updateData: Record<string, unknown> = { updatedAt: new Date() };
        if (currency !== undefined) updateData.currency = currency;
        if (exchangeRateToZAR !== undefined) updateData.exchangeRateToZAR = String(exchangeRateToZAR);
        if (buyExchangeRateToZAR !== undefined) updateData.buyExchangeRateToZAR = buyExchangeRateToZAR != null ? String(buyExchangeRateToZAR) : null;
        if (effectiveFrom !== undefined) updateData.effectiveFrom = effectiveFrom;
        if (effectiveTo !== undefined) updateData.effectiveTo = effectiveTo;
        if (active !== undefined) updateData.active = active;

        const [updated] = await db
            .update(destinationCharges)
            .set(updateData)
            .where(eq(destinationCharges.id, id))
            .returning();

        if (!updated) {
            return NextResponse.json({ error: "Destination charge not found" }, { status: 404 });
        }

        // Replace items
        if (items !== undefined) {
            await db.delete(destinationChargeItems).where(eq(destinationChargeItems.destinationChargeId, id));

            if (items.length > 0) {
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
        }

        return NextResponse.json(updated);
    } catch (error: unknown) {
        console.error("Destination charge update error:", error);
        const message = error instanceof Error ? error.message : "Failed to update destination charge";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const { id } = await params;
        const [deleted] = await db
            .delete(destinationCharges)
            .where(eq(destinationCharges.id, id))
            .returning();

        if (!deleted) {
            return NextResponse.json({ error: "Destination charge not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error("Destination charge delete error:", error);
        return NextResponse.json({ error: "Failed to delete destination charge" }, { status: 500 });
    }
}
