import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { roadRates, user } from "@/lib/db/schema";
import { and, eq, isNull, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { isRoadRoute, ROAD_TRUCK_MAX_PALLETS } from "@/lib/road";

/**
 * Road freight rate lines - tiered per pallet-count band per (customer,
 * route), plus default lines (userId NULL) covering everyone else. Each band
 * carries per-pallet price, drops included, additional-drop rate, and the
 * overhang fee per pallet. All ZAR. Modelled on the Britos rate card.
 */
export async function GET() {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const rows = await db
            .select({
                rate: roadRates,
                customerName: user.name,
                customerEmail: user.email,
                customerCompany: user.companyName,
                accountNumber: user.accountNumber,
            })
            .from(roadRates)
            .leftJoin(user, eq(roadRates.userId, user.id))
            .orderBy(desc(roadRates.updatedAt));

        return NextResponse.json(rows.map(r => ({
            ...r.rate,
            customerName: r.customerName,
            customerEmail: r.customerEmail,
            customerCompany: r.customerCompany,
            accountNumber: r.accountNumber,
        })));
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load road rates";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const body = await request.json();
        const {
            userId,           // null/"" = default rate line for the route
            route,
            minPallets: minRaw,
            maxPallets: maxRaw,
            transportCostPerPallet,
            dropsIncluded: dropsIncludedRaw,
            additionalDropFee,
            overhangFeePerPallet,
        } = body;

        if (!route || !isRoadRoute(route)) {
            return NextResponse.json({ error: "Pick a valid road route corridor" }, { status: 400 });
        }
        const transport = Number(transportCostPerPallet);
        if (!(transport > 0)) {
            return NextResponse.json({ error: "Transport cost per pallet must be greater than 0" }, { status: 400 });
        }
        const minPallets = Math.floor(Number(minRaw)) || 1;
        const maxPallets = Math.floor(Number(maxRaw)) || ROAD_TRUCK_MAX_PALLETS;
        if (minPallets < 1 || maxPallets < minPallets) {
            return NextResponse.json({ error: "Pallet band is invalid - max must be ≥ min and min ≥ 1" }, { status: 400 });
        }
        const dropsIncluded = Math.max(1, Math.floor(Number(dropsIncludedRaw)) || 1);
        const dropFee = Number(additionalDropFee) >= 0 ? Number(additionalDropFee) : 0;
        const overhangFee = Number(overhangFeePerPallet) >= 0 ? Number(overhangFeePerPallet) : 0;

        const targetUserId: string | null = userId?.trim() ? userId.trim() : null;

        if (targetUserId) {
            const [u] = await db.select({ id: user.id, role: user.role }).from(user).where(eq(user.id, targetUserId)).limit(1);
            if (!u) return NextResponse.json({ error: "Customer not found" }, { status: 400 });
            if (u.role !== "client") return NextResponse.json({ error: "Rates can only be assigned to client accounts" }, { status: 400 });
        }

        // Overlap guard: no existing line for this (customer, route) may share
        // any pallet count with the new band. (The DB unique on minPallets
        // can't catch range overlap, and NULL userIds are distinct anyway.)
        const siblings = await db
            .select({ id: roadRates.id, minPallets: roadRates.minPallets, maxPallets: roadRates.maxPallets })
            .from(roadRates)
            .where(and(
                eq(roadRates.route, route),
                targetUserId ? eq(roadRates.userId, targetUserId) : isNull(roadRates.userId),
            ));
        const clash = siblings.find(s => minPallets <= s.maxPallets && maxPallets >= s.minPallets);
        if (clash) {
            return NextResponse.json(
                { error: `This band overlaps an existing line (${clash.minPallets}-${clash.maxPallets} pallets) - adjust the range or edit that line` },
                { status: 400 }
            );
        }

        const [created] = await db
            .insert(roadRates)
            .values({
                id: `RRT-${nanoid(10)}`,
                userId: targetUserId,
                route,
                minPallets,
                maxPallets,
                transportCostPerPallet: transport.toFixed(2),
                dropsIncluded,
                additionalDropFee: dropFee.toFixed(2),
                overhangFeePerPallet: overhangFee.toFixed(2),
                active: true,
            })
            .returning();

        return NextResponse.json(created, { status: 201 });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to create road rate";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
