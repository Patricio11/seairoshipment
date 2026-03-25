import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { originCharges, originChargeItems, containerTypes, salesRateTypes } from "@/lib/db/schema";
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
                id: originCharges.id,
                salesRateTypeId: originCharges.salesRateTypeId,
                originId: originCharges.originId,
                originName: originCharges.originName,
                containerId: originCharges.containerId,
                effectiveFrom: originCharges.effectiveFrom,
                effectiveTo: originCharges.effectiveTo,
                currency: originCharges.currency,
                active: originCharges.active,
                createdAt: originCharges.createdAt,
                updatedAt: originCharges.updatedAt,
                containerDisplayName: containerTypes.displayName,
                salesRateTypeName: salesRateTypes.name,
            })
            .from(originCharges)
            .leftJoin(containerTypes, eq(originCharges.containerId, containerTypes.id))
            .leftJoin(salesRateTypes, eq(originCharges.salesRateTypeId, salesRateTypes.id))
            .where(eq(originCharges.id, id))
            .limit(1);

        if (!header) {
            return NextResponse.json({ error: "Origin charge not found" }, { status: 404 });
        }

        const items = await db
            .select()
            .from(originChargeItems)
            .where(eq(originChargeItems.originChargeId, id))
            .orderBy(asc(originChargeItems.sortOrder));

        return NextResponse.json({ ...header, items });
    } catch (error: unknown) {
        console.error("Origin charge fetch error:", error);
        return NextResponse.json({ error: "Failed to fetch origin charge" }, { status: 500 });
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
        const { salesRateTypeId, originId, originName, containerId, effectiveFrom, effectiveTo, currency, active, items } = body;

        // Update header
        const updateData: Record<string, unknown> = { updatedAt: new Date() };
        if (salesRateTypeId !== undefined) updateData.salesRateTypeId = salesRateTypeId;
        if (originId !== undefined) updateData.originId = originId;
        if (originName !== undefined) updateData.originName = originName;
        if (containerId !== undefined) updateData.containerId = containerId;
        if (effectiveFrom !== undefined) updateData.effectiveFrom = effectiveFrom;
        if (effectiveTo !== undefined) updateData.effectiveTo = effectiveTo;
        if (currency !== undefined) updateData.currency = currency;
        if (active !== undefined) updateData.active = active;

        const [updated] = await db
            .update(originCharges)
            .set(updateData)
            .where(eq(originCharges.id, id))
            .returning();

        if (!updated) {
            return NextResponse.json({ error: "Origin charge not found" }, { status: 404 });
        }

        // Replace items: delete all, then insert new
        if (items !== undefined) {
            await db.delete(originChargeItems).where(eq(originChargeItems.originChargeId, id));

            if (items.length > 0) {
                await db.insert(originChargeItems).values(
                    items.map((item: Record<string, unknown>, idx: number) => ({
                        id: (item.id as string)?.startsWith("new-") ? `oci-${nanoid(6)}` : (item.id as string) || `oci-${nanoid(6)}`,
                        originChargeId: id,
                        chargeCode: (item.chargeCode as string) || "",
                        chargeName: item.chargeName as string,
                        chargeType: item.chargeType as "PER_PALLET" | "PER_CONTAINER" | "FIXED",
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
        }

        return NextResponse.json(updated);
    } catch (error: unknown) {
        console.error("Origin charge update error:", error);
        return NextResponse.json({ error: "Failed to update origin charge" }, { status: 500 });
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

        // Items cascade-delete via FK
        const [deleted] = await db
            .delete(originCharges)
            .where(eq(originCharges.id, id))
            .returning();

        if (!deleted) {
            return NextResponse.json({ error: "Origin charge not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error("Origin charge delete error:", error);
        return NextResponse.json({ error: "Failed to delete origin charge" }, { status: 500 });
    }
}
