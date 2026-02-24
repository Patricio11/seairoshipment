import { NextRequest, NextResponse } from "next/server";
import { metaShipGet } from "@/lib/metaship";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const portOfLoadValue = searchParams.get("portOfLoadValue");
        const finalDestinationValue = searchParams.get("finalDestinationValue");

        if (!portOfLoadValue || !finalDestinationValue) {
            return NextResponse.json(
                { error: "portOfLoadValue and finalDestinationValue are required" },
                { status: 400 }
            );
        }

        // Search 60 days from today
        const startDate = new Date().toISOString().split("T")[0];
        const endDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0];

        const data = await metaShipGet<unknown>("/public/v2/sailing-schedules", {
            startDate,
            endDate,
            portOfLoadValue,
            finalDestinationValue,
        });

        // Response is { data: [...], total: N }
        const raw = data as Record<string, unknown>;
        const schedules = Array.isArray(data) ? data : (Array.isArray(raw.data) ? raw.data : []) as unknown[];

        // Filter to MSC carrier only (SCAC: MSCU)
        const mscOnly = schedules.filter((s: unknown) => {
            const schedule = s as Record<string, unknown>;
            const scac = (schedule.scac || "") as string;
            return scac.toUpperCase().includes("MSC");
        });

        // Map MetaShip fields to our SailingSchedule type
        const mapped = mscOnly.map((s: unknown) => {
            const r = s as Record<string, unknown>;
            const vessel = r.vessel as Record<string, unknown> | null;
            return {
                id: String(r.id),
                vesselName: (vessel?.name || r.vesselDescription || "Unknown Vessel") as string,
                voyageNumber: (r.voyage || "") as string,
                portOfLoadValue: (r.portOfLoadValue || "") as string,
                portOfLoadName: (r.portOfLoadValue || "") as string,
                finalDestinationValue: (r.finalDestinationValue || "") as string,
                finalDestinationName: (r.finalDestinationValue || "") as string,
                etd: (r.etd || "") as string,
                eta: (r.eta || "") as string,
                transitTime: parseInt(String(r.transit || "0"), 10),
                serviceType: r.direct === true ? "DIRECT" : "INDIRECT",
            };
        });

        return NextResponse.json(mapped);
    } catch (error: unknown) {
        console.error("MetaShip sailing-schedules error:", error);
        const message =
            error instanceof Error ? error.message : "Failed to fetch sailing schedules";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
