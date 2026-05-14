import { NextRequest, NextResponse } from "next/server";
import { calculateQuote, calculateCubeQuote } from "@/lib/rates";
import { db } from "@/lib/db";
import { containers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Quote endpoint used by the booking wizard's cost-breakdown step.
 *
 * Branches by cargo type:
 *   - PALLET (default): existing palletCount × per-pallet pricing
 *   - CUBE:             cbmVolume × per-CBM pricing via calculateCubeQuote
 *
 * Cargo type is taken from the explicit ?cargoType= param (preferred);
 * if absent, falls back to the container's cargoType column so older
 * callers that don't pass it still resolve correctly.
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const origin = searchParams.get("origin");
        const destination = searchParams.get("destination");
        const salesRateTypeId = searchParams.get("salesRateTypeId");
        const containerId = searchParams.get("containerId");
        const cargoTypeParam = searchParams.get("cargoType");
        const palletCountStr = searchParams.get("palletCount");
        const cbmVolumeStr = searchParams.get("cbmVolume");

        if (!origin || !destination) {
            return NextResponse.json({ error: "origin and destination are required" }, { status: 400 });
        }
        if (!salesRateTypeId) {
            return NextResponse.json({ error: "salesRateTypeId is required (srs or scs)" }, { status: 400 });
        }
        if (!containerId) {
            return NextResponse.json({ error: "containerId is required — pick a container first" }, { status: 400 });
        }

        // Resolve the container's containerTypeId + cargoType
        const [container] = await db
            .select({
                containerTypeId: containers.containerTypeId,
                cargoType: containers.cargoType,
            })
            .from(containers)
            .where(eq(containers.id, containerId))
            .limit(1);

        if (!container) {
            return NextResponse.json({ error: "Container not found" }, { status: 404 });
        }
        if (!container.containerTypeId) {
            return NextResponse.json(
                { error: "Container has no container-type assigned — admin must set one before rates can be resolved" },
                { status: 422 }
            );
        }

        const cargoType: "PALLET" | "CUBE" = cargoTypeParam === "CUBE" || cargoTypeParam === "PALLET"
            ? cargoTypeParam
            : container.cargoType;

        if (cargoType === "CUBE") {
            if (!cbmVolumeStr) {
                return NextResponse.json({ error: "cbmVolume is required for a Cube quote" }, { status: 400 });
            }
            const cbmVolume = Number(cbmVolumeStr);
            if (!Number.isFinite(cbmVolume) || cbmVolume <= 0) {
                return NextResponse.json({ error: "cbmVolume must be a positive number" }, { status: 400 });
            }
            const quote = await calculateCubeQuote(origin, destination, cbmVolume, salesRateTypeId, container.containerTypeId);
            return NextResponse.json({ cargoType: "CUBE", ...quote });
        }

        if (!palletCountStr) {
            return NextResponse.json({ error: "palletCount is required for a Pallet quote" }, { status: 400 });
        }
        const palletCount = parseInt(palletCountStr, 10);
        if (isNaN(palletCount) || palletCount < 1) {
            return NextResponse.json({ error: "palletCount must be a positive integer" }, { status: 400 });
        }
        const quote = await calculateQuote(origin, destination, palletCount, salesRateTypeId, container.containerTypeId);
        return NextResponse.json({ cargoType: "PALLET", ...quote });
    } catch (error: unknown) {
        console.error("Quote calculation error:", error);
        const message = error instanceof Error ? error.message : "Failed to calculate quote";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
