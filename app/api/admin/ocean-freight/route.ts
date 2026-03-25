import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { oceanFreightRates, containerTypes, salesRateTypes } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function GET(request: NextRequest) {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const { searchParams } = new URL(request.url);
        const destId = searchParams.get("destId");

        let results;
        const selectFields = {
            id: oceanFreightRates.id,
            salesRateTypeId: oceanFreightRates.salesRateTypeId,
            origin: oceanFreightRates.origin,
            destinationCountry: oceanFreightRates.destinationCountry,
            destinationPort: oceanFreightRates.destinationPort,
            destinationPortCode: oceanFreightRates.destinationPortCode,
            shippingLine: oceanFreightRates.shippingLine,
            containerId: oceanFreightRates.containerId,
            effectiveFrom: oceanFreightRates.effectiveFrom,
            effectiveTo: oceanFreightRates.effectiveTo,
            freightUSD: oceanFreightRates.freightUSD,
            bafUSD: oceanFreightRates.bafUSD,
            ispsUSD: oceanFreightRates.ispsUSD,
            otherSurchargesUSD: oceanFreightRates.otherSurchargesUSD,
            rcgUSD: oceanFreightRates.rcgUSD,
            totalUSD: oceanFreightRates.totalUSD,
            exchangeRate: oceanFreightRates.exchangeRate,
            totalZAR: oceanFreightRates.totalZAR,
            buyFreightUSD: oceanFreightRates.buyFreightUSD,
            buyBafUSD: oceanFreightRates.buyBafUSD,
            buyIspsUSD: oceanFreightRates.buyIspsUSD,
            buyOtherSurchargesUSD: oceanFreightRates.buyOtherSurchargesUSD,
            buyRcgUSD: oceanFreightRates.buyRcgUSD,
            buyTotalUSD: oceanFreightRates.buyTotalUSD,
            buyTotalZAR: oceanFreightRates.buyTotalZAR,
            active: oceanFreightRates.active,
            createdAt: oceanFreightRates.createdAt,
            updatedAt: oceanFreightRates.updatedAt,
            containerDisplayName: containerTypes.displayName,
            salesRateTypeName: salesRateTypes.name,
        };

        if (destId) {
            results = await db
                .select(selectFields)
                .from(oceanFreightRates)
                .leftJoin(containerTypes, eq(oceanFreightRates.containerId, containerTypes.id))
                .leftJoin(salesRateTypes, eq(oceanFreightRates.salesRateTypeId, salesRateTypes.id))
                .where(eq(oceanFreightRates.destinationPortCode, destId.toUpperCase()))
                .orderBy(desc(oceanFreightRates.createdAt));
        } else {
            results = await db
                .select(selectFields)
                .from(oceanFreightRates)
                .leftJoin(containerTypes, eq(oceanFreightRates.containerId, containerTypes.id))
                .leftJoin(salesRateTypes, eq(oceanFreightRates.salesRateTypeId, salesRateTypes.id))
                .orderBy(desc(oceanFreightRates.createdAt));
        }

        return NextResponse.json(results);
    } catch (error: unknown) {
        console.error("Ocean freight fetch error:", error);
        return NextResponse.json({ error: "Failed to fetch ocean freight rates" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const body = await request.json();
        const {
            salesRateTypeId, origin, destinationCountry, destinationPort,
            destinationPortCode, shippingLine, containerId, effectiveFrom,
            effectiveTo, freightUSD, bafUSD, ispsUSD, otherSurchargesUSD,
            rcgUSD, exchangeRate, active,
            buyFreightUSD, buyBafUSD, buyIspsUSD, buyOtherSurchargesUSD, buyRcgUSD,
        } = body;

        // Compute sell totals
        const freight = Number(freightUSD) || 0;
        const baf = Number(bafUSD) || 0;
        const isps = Number(ispsUSD) || 0;
        const other = Number(otherSurchargesUSD) || 0;
        const rcg = Number(rcgUSD) || 0;
        const rate = Number(exchangeRate) || 0;
        const totalUSD = freight + baf + isps + other + rcg;
        const totalZAR = totalUSD * rate;

        // Compute buy totals
        const bFreight = Number(buyFreightUSD) || 0;
        const bBaf = Number(buyBafUSD) || 0;
        const bIsps = Number(buyIspsUSD) || 0;
        const bOther = Number(buyOtherSurchargesUSD) || 0;
        const bRcg = Number(buyRcgUSD) || 0;
        const buyTotalUSD = bFreight + bBaf + bIsps + bOther + bRcg;
        const buyTotalZAR = buyTotalUSD * rate;

        const id = `of-${nanoid(6)}`;
        const [created] = await db
            .insert(oceanFreightRates)
            .values({
                id,
                salesRateTypeId: salesRateTypeId || "srs",
                origin,
                destinationCountry,
                destinationPort,
                destinationPortCode,
                shippingLine: shippingLine || "MSC",
                containerId,
                effectiveFrom,
                effectiveTo: effectiveTo || null,
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
                active: active !== false,
            })
            .returning();

        return NextResponse.json(created, { status: 201 });
    } catch (error: unknown) {
        console.error("Ocean freight create error:", error);
        const message = error instanceof Error ? error.message : "Failed to create ocean freight rate";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
