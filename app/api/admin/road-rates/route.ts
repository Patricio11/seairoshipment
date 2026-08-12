import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { roadRates, user } from "@/lib/db/schema";
import { and, eq, isNull, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { isRoadRoute } from "@/lib/road";

/**
 * Road freight rate cards - one row per (customer, route) plus a default row
 * per route (userId NULL) that applies to every customer without their own.
 * The 3 cost lines per the plan: transport per pallet, additional drop fee,
 * overhang fee per pallet. All ZAR.
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
            userId,           // null/"" = default rate card for the route
            route,
            transportCostPerPallet,
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
        const dropFee = Number(additionalDropFee) >= 0 ? Number(additionalDropFee) : 0;
        const overhangFee = Number(overhangFeePerPallet) >= 0 ? Number(overhangFeePerPallet) : 0;

        const targetUserId: string | null = userId?.trim() ? userId.trim() : null;

        if (targetUserId) {
            const [u] = await db.select({ id: user.id, role: user.role }).from(user).where(eq(user.id, targetUserId)).limit(1);
            if (!u) return NextResponse.json({ error: "Customer not found" }, { status: 400 });
            if (u.role !== "client") return NextResponse.json({ error: "Rates can only be assigned to client accounts" }, { status: 400 });
        }

        // Guard duplicates explicitly - the DB unique treats NULLs as distinct,
        // so two "default" rows for the same route would slip through it.
        const [existing] = await db
            .select({ id: roadRates.id })
            .from(roadRates)
            .where(and(
                eq(roadRates.route, route),
                targetUserId ? eq(roadRates.userId, targetUserId) : isNull(roadRates.userId),
            ))
            .limit(1);
        if (existing) {
            return NextResponse.json(
                { error: targetUserId ? "This customer already has a rate card for this route - edit it instead" : "A default rate card for this route already exists - edit it instead" },
                { status: 400 }
            );
        }

        const [created] = await db
            .insert(roadRates)
            .values({
                id: `RRT-${nanoid(10)}`,
                userId: targetUserId,
                route,
                transportCostPerPallet: transport.toFixed(2),
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
