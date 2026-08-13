import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { calculateRoadQuote } from "@/lib/road-pricing";
import { isRoadRoute, ROAD_TRUCK_MAX_PALLETS } from "@/lib/road";

/**
 * Live quote for the Road Freight wizard's cost step. Resolves the signed-in
 * customer's rate card (their own → default fallback) and returns the 3 cost
 * lines + 60/40 split.
 *
 * Query params: route, pallets, drops (delivery point count), overhang (1/0)
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const params = request.nextUrl.searchParams;
        const route = params.get("route") || "";
        const pallets = Math.floor(Number(params.get("pallets")));
        const drops = Math.max(1, Math.floor(Number(params.get("drops")) || 1));
        const overhang = params.get("overhang") === "1";

        if (!isRoadRoute(route)) {
            return NextResponse.json({ error: "Pick a valid road route corridor" }, { status: 400 });
        }
        if (!(pallets >= 1) || pallets > ROAD_TRUCK_MAX_PALLETS) {
            return NextResponse.json({ error: `Pallets must be between 1 and ${ROAD_TRUCK_MAX_PALLETS}` }, { status: 400 });
        }

        const quote = await calculateRoadQuote(session.user.id, route, pallets, drops, overhang);
        if (!quote) {
            return NextResponse.json(
                { error: "No road rates are loaded for this route and pallet count yet. Please contact us for a quote." },
                { status: 404 }
            );
        }

        // Payment terms show on the cost sheet and drive the invoice shape
        const [customerRow] = await db
            .select({ paymentTerms: user.paymentTerms })
            .from(user)
            .where(eq(user.id, session.user.id))
            .limit(1);

        return NextResponse.json({ ...quote, paymentTerms: customerRow?.paymentTerms ?? "SPLIT_60_40" });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to quote";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
