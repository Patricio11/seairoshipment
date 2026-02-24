import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { originCharges, originChargeItems, containerTypes, salesRateTypes } from "@/lib/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session || (session.user as { role?: string }).role !== "admin") {
            return NextResponse.json({ error: "Admin access required" }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const originId = searchParams.get("originId");

        // Fetch headers with joined display names
        let headers;
        if (originId) {
            headers = await db
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
                .where(eq(originCharges.originId, originId))
                .orderBy(desc(originCharges.createdAt));
        } else {
            headers = await db
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

export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session || (session.user as { role?: string }).role !== "admin") {
            return NextResponse.json({ error: "Admin access required" }, { status: 403 });
        }

        const body = await request.json();
        const { id: customId, salesRateTypeId, originId, originName, containerId, effectiveFrom, effectiveTo, currency, active, items } = body;

        const id = customId || `oc-${nanoid(8)}`;
        const [created] = await db
            .insert(originCharges)
            .values({
                id,
                salesRateTypeId,
                originId,
                originName,
                containerId,
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
                    chargeType: item.chargeType as "PER_PALLET" | "PER_CONTAINER" | "FIXED",
                    category: (item.category as string) || "OTHER",
                    unitCost: item.unitCost != null ? String(item.unitCost) : null,
                    containerCost: item.containerCost != null ? String(item.containerCost) : null,
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
