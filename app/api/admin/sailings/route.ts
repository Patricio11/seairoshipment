import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { sailings, containers } from "@/lib/db/schema";
import { sql, asc, and, gte } from "drizzle-orm";

/**
 * List all sailings in our DB (synced from MetaShip).
 * Includes container usage count.
 * Default: only sailings with ETD today or later.
 */
export async function GET(request: Request) {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const { searchParams } = new URL(request.url);
        const includePast = searchParams.get("includePast") === "true";

        const whereClause = includePast
            ? undefined
            : and(gte(sailings.etd, new Date()));

        const results = await db
            .select({
                id: sailings.id,
                metashipId: sailings.metashipId,
                vesselName: sailings.vesselName,
                voyageNumber: sailings.voyageNumber,
                shippingLine: sailings.shippingLine,
                portOfLoadValue: sailings.portOfLoadValue,
                portOfLoadCity: sailings.portOfLoadCity,
                portOfDischargeValue: sailings.portOfDischargeValue,
                portOfDischargeCity: sailings.portOfDischargeCity,
                originCountry: sailings.originCountry,
                destinationCountry: sailings.destinationCountry,
                etd: sailings.etd,
                eta: sailings.eta,
                transitTime: sailings.transitTime,
                serviceType: sailings.serviceType,
                active: sailings.active,
                lastSyncedAt: sailings.lastSyncedAt,
                containerCount: sql<number>`
                    (SELECT COUNT(*) FROM ${containers}
                     WHERE ${containers.sailingId} = ${sailings.id}
                     AND ${containers.status} IN ('OPEN','THRESHOLD_REACHED'))
                `.as("container_count"),
            })
            .from(sailings)
            .where(whereClause)
            .orderBy(asc(sailings.etd));

        return NextResponse.json(results);
    } catch (err) {
        console.error("List sailings error:", err);
        const message = err instanceof Error ? err.message : "Failed to fetch sailings";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
