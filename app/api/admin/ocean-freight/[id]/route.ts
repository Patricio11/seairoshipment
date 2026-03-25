import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { oceanFreightRates } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const { id } = await params;
        const body = await request.json();

        // Recompute totals
        const freight = Number(body.freightUSD) || 0;
        const baf = Number(body.bafUSD) || 0;
        const isps = Number(body.ispsUSD) || 0;
        const other = Number(body.otherSurchargesUSD) || 0;
        const rcg = Number(body.rcgUSD) || 0;
        const rate = Number(body.exchangeRate) || 0;
        const totalUSD = freight + baf + isps + other + rcg;
        const totalZAR = totalUSD * rate;

        const bFreight = Number(body.buyFreightUSD) || 0;
        const bBaf = Number(body.buyBafUSD) || 0;
        const bIsps = Number(body.buyIspsUSD) || 0;
        const bOther = Number(body.buyOtherSurchargesUSD) || 0;
        const bRcg = Number(body.buyRcgUSD) || 0;
        const buyTotalUSD = bFreight + bBaf + bIsps + bOther + bRcg;
        const buyTotalZAR = buyTotalUSD * rate;

        const updateData: Record<string, unknown> = {
            updatedAt: new Date(),
            freightUSD: freight.toFixed(2),
            bafUSD: baf.toFixed(2),
            ispsUSD: isps.toFixed(2),
            otherSurchargesUSD: other.toFixed(2),
            rcgUSD: rcg.toFixed(2),
            totalUSD: totalUSD.toFixed(2),
            exchangeRate: rate.toFixed(2),
            totalZAR: totalZAR.toFixed(2),
            buyFreightUSD: bFreight.toFixed(2),
            buyBafUSD: bBaf.toFixed(2),
            buyIspsUSD: bIsps.toFixed(2),
            buyOtherSurchargesUSD: bOther.toFixed(2),
            buyRcgUSD: bRcg.toFixed(2),
            buyTotalUSD: buyTotalUSD.toFixed(2),
            buyTotalZAR: buyTotalZAR.toFixed(2),
        };

        if (body.origin !== undefined) updateData.origin = body.origin;
        if (body.destinationCountry !== undefined) updateData.destinationCountry = body.destinationCountry;
        if (body.destinationPort !== undefined) updateData.destinationPort = body.destinationPort;
        if (body.destinationPortCode !== undefined) updateData.destinationPortCode = body.destinationPortCode;
        if (body.shippingLine !== undefined) updateData.shippingLine = body.shippingLine;
        if (body.containerId !== undefined) updateData.containerId = body.containerId;
        if (body.salesRateTypeId !== undefined) updateData.salesRateTypeId = body.salesRateTypeId;
        if (body.effectiveFrom !== undefined) updateData.effectiveFrom = body.effectiveFrom;
        if (body.effectiveTo !== undefined) updateData.effectiveTo = body.effectiveTo;
        if (body.active !== undefined) updateData.active = body.active;

        const [updated] = await db
            .update(oceanFreightRates)
            .set(updateData)
            .where(eq(oceanFreightRates.id, id))
            .returning();

        if (!updated) {
            return NextResponse.json({ error: "Ocean freight rate not found" }, { status: 404 });
        }

        return NextResponse.json(updated);
    } catch (error: unknown) {
        console.error("Ocean freight update error:", error);
        const message = error instanceof Error ? error.message : "Failed to update ocean freight rate";
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
        const [deleted] = await db
            .delete(oceanFreightRates)
            .where(eq(oceanFreightRates.id, id))
            .returning();

        if (!deleted) {
            return NextResponse.json({ error: "Ocean freight rate not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error("Ocean freight delete error:", error);
        return NextResponse.json({ error: "Failed to delete ocean freight rate" }, { status: 500 });
    }
}
