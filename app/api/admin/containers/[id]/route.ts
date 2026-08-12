import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { containers, palletAllocations, containerTypes, sailings, productCategories, documents, invoices } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { isRoadRoute } from "@/lib/road";

type Temperature = "frozen" | "cool" | "chilled" | "ambient";
const ALL_TEMPS: Temperature[] = ["frozen", "cool", "chilled", "ambient"];

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

        // ── ROAD branch: trucks edit a different field set (corridor, truck
        // name, dates, file number, capacity, category, temperature). No
        // container type / sailing logic applies.
        if (existing.transportMode === "ROAD") {
            const updates: Record<string, unknown> = { updatedAt: new Date() };

            if (body.route !== undefined) {
                if (!isRoadRoute(body.route)) {
                    return NextResponse.json({ error: "Pick a valid road route corridor" }, { status: 400 });
                }
                updates.route = body.route;
            }
            if (body.truckName !== undefined) {
                if (!String(body.truckName).trim()) {
                    return NextResponse.json({ error: "Transporter / truck name is required" }, { status: 400 });
                }
                updates.vessel = String(body.truckName).trim();
            }
            if (body.fileNumber !== undefined) updates.fileNumber = String(body.fileNumber).trim() || null;
            if (body.departureDate !== undefined) updates.etd = body.departureDate ? new Date(body.departureDate) : null;
            if (body.arrivalDate !== undefined) updates.eta = body.arrivalDate ? new Date(body.arrivalDate) : null;
            if (body.maxCapacity !== undefined) {
                const cap = Math.floor(Number(body.maxCapacity));
                if (!(cap > 0)) return NextResponse.json({ error: "Capacity must be at least 1 pallet" }, { status: 400 });
                if (cap < existing.totalPallets) {
                    return NextResponse.json(
                        { error: `Capacity can't drop below the ${existing.totalPallets} pallets already booked` },
                        { status: 400 }
                    );
                }
                updates.maxCapacity = cap;
            }

            let roadCategoryTemps: Temperature[] | null = null;
            if (body.categoryId !== undefined && body.categoryId) {
                const [cat] = await db.select().from(productCategories).where(eq(productCategories.id, body.categoryId)).limit(1);
                if (!cat) return NextResponse.json({ error: "Invalid category" }, { status: 400 });
                if (!cat.active) return NextResponse.json({ error: "Category is inactive" }, { status: 400 });
                if (cat.salesRateTypeId !== "srs") {
                    return NextResponse.json({ error: "Road trucks are refrigerated - pick an SRS (reefer) category" }, { status: 400 });
                }
                updates.categoryId = cat.id;
                roadCategoryTemps = (cat.allowedTemperatures as Temperature[]) || [];
            } else if (existing.categoryId) {
                const [cat] = await db.select().from(productCategories).where(eq(productCategories.id, existing.categoryId)).limit(1);
                if (cat) roadCategoryTemps = (cat.allowedTemperatures as Temperature[]) || [];
            }

            if (body.temperature !== undefined) {
                if (!body.temperature || !ALL_TEMPS.includes(body.temperature as Temperature)) {
                    return NextResponse.json({ error: `Pick a temperature for this truck (${ALL_TEMPS.join(", ")}).` }, { status: 400 });
                }
                if (roadCategoryTemps && !roadCategoryTemps.includes(body.temperature as Temperature)) {
                    return NextResponse.json(
                        { error: `Temperature "${body.temperature}" is not allowed for this category. Allowed: ${roadCategoryTemps.join(", ")}` },
                        { status: 400 }
                    );
                }
                updates.temperature = body.temperature;
            }

            const [updatedTruck] = await db
                .update(containers)
                .set(updates)
                .where(eq(containers.id, id))
                .returning();

            return NextResponse.json(updatedTruck);
        }

        // ── SEA branch (existing behaviour, unchanged) ──
        // cargoType is locked at creation - refuse any change.
        if (body.cargoType !== undefined && body.cargoType !== existing.cargoType) {
            return NextResponse.json(
                { error: `Cargo type is locked after creation (current: ${existing.cargoType}). Create a new container instead.` },
                { status: 400 }
            );
        }

        const updates: Record<string, unknown> = { updatedAt: new Date() };

        if (body.route !== undefined) updates.route = body.route;

        // Container type change: also updates size, maxCapacity, maxCapacityCBM, salesRateTypeId
        let containerCategory: "REEFER" | "DRY" | null = null;
        if (body.containerTypeId !== undefined) {
            const [ct] = await db.select().from(containerTypes).where(eq(containerTypes.id, body.containerTypeId)).limit(1);
            if (!ct) return NextResponse.json({ error: "Invalid container type" }, { status: 400 });
            updates.containerTypeId = ct.id;
            updates.type = ct.size;
            updates.maxCapacity = ct.maxPallets;
            updates.maxCapacityCBM = ct.volumeCBM ?? null;
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

        // Temperature change - DRY containers always end up with null
        // (no temperature regime). REEFER containers must pick from
        // frozen / chilled / ambient and the category's allowed list.
        if (body.temperature !== undefined) {
            if (containerCategory === "DRY") {
                updates.temperature = null;
            } else if (body.temperature) {
                const reeferAllowed: Temperature[] = ["frozen", "cool", "chilled", "ambient"];
                if (!reeferAllowed.includes(body.temperature as Temperature)) {
                    return NextResponse.json(
                        { error: `Temperature "${body.temperature}" is not valid for a reefer container. Allowed: ${reeferAllowed.join(", ")}` },
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

/**
 * Hard-delete a container. Cascades through every dependent row so the admin
 * can always wipe a container (even after a MetaShip order has been placed):
 *
 *   1. Find all allocations on this container.
 *   2. Refuse if any of those allocations has a PAID invoice - admin should
 *      void the invoice manually first.
 *   3. Delete documents → invoices → allocations → the container itself.
 *
 * Storage objects in Supabase (the actual uploaded files) are left orphaned;
 * a later sweep job can claim them.
 */
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

        // Pull every allocation under this container so we can cascade through
        // each one's documents + invoices in bulk.
        const allocations = await db
            .select({ id: palletAllocations.id })
            .from(palletAllocations)
            .where(eq(palletAllocations.containerId, id));
        const allocationIds = allocations.map(a => a.id);

        if (allocationIds.length > 0) {
            // Refuse if any linked invoice is PAID
            const linkedInvoices = await db
                .select()
                .from(invoices)
                .where(inArray(invoices.allocationId, allocationIds));

            const hasPaid = linkedInvoices.some(inv => inv.status === "PAID");
            if (hasPaid) {
                return NextResponse.json(
                    { error: "Cannot delete: at least one booking has a paid invoice. Void the invoice first." },
                    { status: 400 }
                );
            }

            await db.delete(documents).where(inArray(documents.allocationId, allocationIds));
            await db.delete(invoices).where(inArray(invoices.allocationId, allocationIds));
        }

        // Container-level docs (METASHIP_SHARED) - clean those up too.
        await db.delete(documents).where(eq(documents.containerId, id));

        await db.delete(palletAllocations).where(eq(palletAllocations.containerId, id));
        await db.delete(containers).where(eq(containers.id, id));

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error("Delete container error:", error);
        const message = error instanceof Error ? error.message : "Failed to delete container";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
