import { NextRequest, NextResponse } from "next/server";
import { calculateQuote } from "@/lib/rates";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const origin = searchParams.get("origin");
        const destination = searchParams.get("destination");
        const palletCountStr = searchParams.get("palletCount");

        if (!origin || !destination || !palletCountStr) {
            return NextResponse.json(
                { error: "origin, destination, and palletCount are required" },
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

        const quote = await calculateQuote(origin, destination, palletCount);

        return NextResponse.json(quote);
    } catch (error: unknown) {
        console.error("Quote calculation error:", error);
        const message =
            error instanceof Error ? error.message : "Failed to calculate quote";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
