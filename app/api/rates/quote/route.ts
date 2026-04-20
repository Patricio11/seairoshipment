import { NextRequest, NextResponse } from "next/server";
import { calculateQuote } from "@/lib/rates";
import { db } from "@/lib/db";
import { containers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const origin = searchParams.get("origin");
        const destination = searchParams.get("destination");
        const palletCountStr = searchParams.get("palletCount");
        const salesRateTypeId = searchParams.get("salesRateTypeId");
        const containerId = searchParams.get("containerId");

        if (!origin || !destination || !palletCountStr) {
            return NextResponse.json(
                { error: "origin, destination, and palletCount are required" },
                { status: 400 }
            );
        }
        if (!salesRateTypeId) {
            return NextResponse.json(
                { error: "salesRateTypeId is required (srs or scs)" },
                { status: 400 }
            );
        }
        if (!containerId) {
            return NextResponse.json(
                { error: "containerId is required — pick a container first" },
                { status: 400 }
            );
        }

        const palletCount = parseInt(palletCountStr, 10);
        if (isNaN(palletCount) || palletCount < 1) {
            return NextResponse.json(
                { error: "palletCount must be a positive integer" },
                { status: 400 }
            );
        }

        // Resolve the container's containerTypeId — rate tables key off this, not the instance id.
        const [container] = await db
            .select({ containerTypeId: containers.containerTypeId })
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

        const quote = await calculateQuote(origin, destination, palletCount, salesRateTypeId, container.containerTypeId);
        return NextResponse.json(quote);
    } catch (error: unknown) {
        console.error("Quote calculation error:", error);
        const message =
            error instanceof Error ? error.message : "Failed to calculate quote";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
