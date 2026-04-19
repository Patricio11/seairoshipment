import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { containers, palletAllocations, containerTypes, sailings, productCategories } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

type Temperature = "frozen" | "chilled" | "ambient";

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const { id } = await params;
        const body = await request.json();

        const [existing] = await db
            .select()
            .from(containers)
            .where(eq(containers.id, id))
            .limit(1);

        if (!existing) {
            return NextResponse.json({ error: "Container not found" }, { status: 404 });
        }

        const updates: Record<string, unknown> = { updatedAt: new Date() };

        if (body.route !== undefined) updates.route = body.route;

        // Container type change: also updates size, maxCapacity, salesRateTypeId
        let containerCategory: "REEFER" | "DRY" | null = null;
        if (body.containerTypeId !== undefined) {
            const [ct] = await db.select().from(containerTypes).where(eq(containerTypes.id, body.containerTypeId)).limit(1);
            if (!ct) return NextResponse.json({ error: "Invalid container type" }, { status: 400 });
            updates.containerTypeId = ct.id;
            updates.type = ct.size;
            updates.maxCapacity = ct.maxPallets;
            updates.salesRateTypeId = ct.type === "DRY" ? "scs" : "srs";
            containerCategory = ct.type as "REEFER" | "DRY";
        } else if (existing.containerTypeId) {
            const [ct] = await db.select().from(containerTypes).where(eq(containerTypes.id, existing.containerTypeId)).limit(1);
            if (ct) containerCategory = ct.type as "REEFER" | "DRY";
        }

        // Sailing change: auto-fills vessel, voyage, etd, eta
        if (body.sailingId !== undefined) {
            if (body.sailingId) {
                const [sailing] = await db.select().from(sailings).where(eq(sailings.id, body.sailingId)).limit(1);
                if (!sailing) return NextResponse.json({ error: "Invalid sailing" }, { status: 400 });
                const effectiveRoute = (updates.route as string) || existing.route;
                const [originCode, destCode] = effectiveRoute.split("-");
                if (sailing.portOfLoadValue !== originCode || sailing.portOfDischargeValue !== destCode) {
                    return NextResponse.json(
                        { error: `Sailing route (${sailing.portOfLoadValue}→${sailing.portOfDischargeValue}) does not match container route (${originCode}→${destCode})` },
                        { status: 400 }
                    );
                }
                updates.sailingId = sailing.id;
                updates.vessel = sailing.vesselName;
                updates.voyageNumber = sailing.voyageNumber || null;
                updates.sailingScheduleId = sailing.metashipId;
                updates.etd = sailing.etd;
                updates.eta = sailing.eta;
            } else {
                updates.sailingId = null;
            }
        }

        // Category change
        let targetCategoryAllowedTemps: Temperature[] | null = null;
        if (body.categoryId !== undefined) {
            if (body.categoryId) {
                const [cat] = await db.select().from(productCategories).where(eq(productCategories.id, body.categoryId)).limit(1);
                if (!cat) return NextResponse.json({ error: "Invalid category" }, { status: 400 });
                if (!cat.active) return NextResponse.json({ error: "Category is inactive" }, { status: 400 });
                updates.categoryId = cat.id;
                targetCategoryAllowedTemps = (cat.allowedTemperatures as Temperature[]) || [];
            } else {
                updates.categoryId = null;
            }
        } else if (existing.categoryId) {
            const [cat] = await db.select().from(productCategories).where(eq(productCategories.id, existing.categoryId)).limit(1);
            if (cat) targetCategoryAllowedTemps = (cat.allowedTemperatures as Temperature[]) || [];
        }

        // Temperature change — validate against container type AND category
        if (body.temperature !== undefined) {
            if (body.temperature) {
                const containerTypeTemps: Record<string, Temperature[]> = {
                    REEFER: ["frozen", "chilled"],
                    DRY: ["ambient"],
                };
                const ctAllowed = containerCategory ? containerTypeTemps[containerCategory] : [];
                if (!ctAllowed.includes(body.temperature as Temperature)) {
                    return NextResponse.json(
                        { error: `Temperature "${body.temperature}" is not valid for this container type. Allowed: ${ctAllowed.join(", ")}` },
                        { status: 400 }
                    );
                }
                if (targetCategoryAllowedTemps && !targetCategoryAllowedTemps.includes(body.temperature as Temperature)) {
                    return NextResponse.json(
                        { error: `Temperature "${body.temperature}" is not allowed for this category. Allowed: ${targetCategoryAllowedTemps.join(", ")}` },
                        { status: 400 }
                    );
                }
                updates.temperature = body.temperature;
            } else {
                updates.temperature = null;
            }
        }

        const [updated] = await db
            .update(containers)
            .set(updates)
            .where(eq(containers.id, id))
            .returning();

        return NextResponse.json(updated);
    } catch (error: unknown) {
        console.error("Update container error:", error);
        const message = error instanceof Error ? error.message : "Failed to update container";
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

        const [existing] = await db
            .select()
            .from(containers)
            .where(eq(containers.id, id))
            .limit(1);

        if (!existing) {
            return NextResponse.json({ error: "Container not found" }, { status: 404 });
        }

        if (existing.totalPallets > 0) {
            return NextResponse.json(
                { error: "Cannot delete container with pallet allocations. Remove allocations first." },
                { status: 400 }
            );
        }

        if (existing.status !== "OPEN") {
            return NextResponse.json(
                { error: "Can only delete containers with OPEN status" },
                { status: 400 }
            );
        }

        // Clean up any allocations (should be 0 but just in case)
        await db.delete(palletAllocations).where(eq(palletAllocations.containerId, id));
        await db.delete(containers).where(eq(containers.id, id));

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error("Delete container error:", error);
        const message = error instanceof Error ? error.message : "Failed to delete container";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
