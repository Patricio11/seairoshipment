import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { sailings, locations } from "@/lib/db/schema";
import { metaShipGet } from "@/lib/metaship";
import { eq } from "drizzle-orm";

/**
 * Sync sailings from MetaShip for all active origin×destination pairs in our locations table.
 * Body (optional): { startDate: "YYYY-MM-DD", endDate: "YYYY-MM-DD" }
 * Defaults: today → +90 days.
 *
 * MetaShip requires per-route queries (portOfLoadValue + finalDestinationValue), so we
 * iterate all combinations of our origin and destination locations.
 */
export async function POST(request: NextRequest) {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const body = await request.json().catch(() => ({}));
        const startDate: string = body.startDate || new Date().toISOString().split("T")[0];
        const endDate: string = body.endDate ||
            new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

        // Get all active origin and destination ports from our locations table
        const origins = await db
            .select()
            .from(locations)
            .where(eq(locations.type, "ORIGIN"));
        const destinations = await db
            .select()
            .from(locations)
            .where(eq(locations.type, "DESTINATION"));

        let totalFetched = 0;
        let inserted = 0;
        let updated = 0;
        const errors: string[] = [];
        const now = new Date();

        for (const origin of origins) {
            if (!origin.active || !origin.code) continue;
            for (const dest of destinations) {
                if (!dest.active || !dest.code) continue;

                try {
                    const data = await metaShipGet<Record<string, unknown>>(
                        "/public/v2/sailing-schedules",
                        {
                            startDate,
                            endDate,
                            portOfLoadValue: origin.code,
                            finalDestinationValue: dest.code,
                        }
                    );

                    const schedules = Array.isArray(data)
                        ? data
                        : Array.isArray(data.data)
                            ? (data.data as Record<string, unknown>[])
                            : [];

                    totalFetched += schedules.length;

                    // Filter to MSC only (same logic as existing route)
                    const mscOnly = schedules.filter((s: Record<string, unknown>) => {
                        const scac = (s.scac || "") as string;
                        return scac.toUpperCase().includes("MSC");
                    });

                    for (const s of mscOnly) {
                        const metashipIdRaw = s.id;
                        if (metashipIdRaw === undefined || metashipIdRaw === null) continue;
                        const metashipId = String(metashipIdRaw);
                        const id = `sail-${metashipId}`;

                        const vessel = s.vessel as Record<string, unknown> | null;
                        const etdRaw = s.etd as string | undefined;
                        const etaRaw = s.eta as string | undefined;
                        if (!etdRaw) continue;

                        const record = {
                            vesselName: String(vessel?.name || s.vesselDescription || "Unknown Vessel"),
                            voyageNumber: String(s.voyage || ""),
                            shippingLine: String(s.scac || "MSC"),
                            portOfLoadValue: origin.code,
                            portOfLoadCity: origin.name,
                            portOfDischargeValue: dest.code,
                            portOfDischargeCity: dest.name,
                            originCountry: origin.country || origin.code.slice(0, 2),
                            destinationCountry: dest.country || dest.code.slice(0, 2),
                            etd: new Date(etdRaw),
                            eta: etaRaw ? new Date(etaRaw) : null,
                            transitTime: s.transit ? parseInt(String(s.transit), 10) : null,
                            serviceType: s.direct === true ? "DIRECT" : "INDIRECT",
                            lastSyncedAt: now,
                            updatedAt: now,
                        };

                        const [existing] = await db
                            .select()
                            .from(sailings)
                            .where(eq(sailings.id, id))
                            .limit(1);

                        if (existing) {
                            await db.update(sailings).set(record).where(eq(sailings.id, id));
                            updated++;
                        } else {
                            await db.insert(sailings).values({
                                id,
                                metashipId,
                                ...record,
                                active: true,
                            });
                            inserted++;
                        }
                    }
                } catch (err) {
                    errors.push(
                        `${origin.code}→${dest.code}: ${err instanceof Error ? err.message : "unknown"}`
                    );
                }
            }
        }

        return NextResponse.json({
            success: true,
            totalFetched,
            inserted,
            updated,
            errors,
            dateRange: { startDate, endDate },
        });
    } catch (err) {
        console.error("Sailings sync error:", err);
        const message = err instanceof Error ? err.message : "Failed to sync sailings";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
