import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { palletAllocations, containers, invoices, sailings } from "@/lib/db/schema";
import { and, asc, eq, gt, gte, inArray, sql } from "drizzle-orm";

function deriveBookingStatus(
    allocationStatus: string,
    containerStatus: string,
    depositInvoiceStatus: string | null,
): "PENDING" | "DEPOSIT_PAID" | "CONFIRMED" | "SAILING" | "DELIVERED" | "CANCELLED" {
    if (allocationStatus === "CANCELLED") return "CANCELLED";
    if (containerStatus === "DELIVERED") return "DELIVERED";
    if (containerStatus === "SAILING") return "SAILING";
    if (allocationStatus === "CONFIRMED") return "CONFIRMED";
    if (depositInvoiceStatus === "PAID") return "DEPOSIT_PAID";
    return "PENDING";
}

const ACTIVE_STATUSES = new Set<ReturnType<typeof deriveBookingStatus>>([
    "PENDING",
    "DEPOSIT_PAID",
    "CONFIRMED",
    "SAILING",
]);

/**
 * Cut-off is industry-standard 48 hours before ETD when no explicit cutoffAt
 * column exists on the sailing. If we add a real cutoff column later, swap
 * `cutoffFromEtd` for that.
 */
const CUTOFF_LEAD_HOURS = 48;
function cutoffFromEtd(etd: Date): Date {
    return new Date(etd.getTime() - CUTOFF_LEAD_HOURS * 60 * 60 * 1000);
}

function startOfMonth(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), 1);
}

function startOfPrevMonth(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth() - 1, 1);
}

function avgDaysBetween(rows: Array<{ etd: Date | null; eta: Date | null }>): number | null {
    const valid = rows
        .map(r => (r.etd && r.eta ? (r.eta.getTime() - r.etd.getTime()) / (1000 * 60 * 60 * 24) : null))
        .filter((d): d is number => d !== null && d > 0);
    if (valid.length === 0) return null;
    return valid.reduce((s, n) => s + n, 0) / valid.length;
}

export async function GET() {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const userId = session.user.id;
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        const oneEightyDaysAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        const monthStart = startOfMonth(now);
        const prevMonthStart = startOfPrevMonth(now);

        // --- All allocations for this user with their containers ---------------
        const allocationsRaw = await db
            .select({ allocation: palletAllocations, container: containers })
            .from(palletAllocations)
            .innerJoin(containers, eq(palletAllocations.containerId, containers.id))
            .where(eq(palletAllocations.userId, userId));

        // --- All invoices for this user (small set; one query is fine) ---------
        const userInvoices = await db
            .select()
            .from(invoices)
            .where(eq(invoices.userId, userId));

        const depositStatusByAllocation = new Map<string, string>();
        for (const inv of userInvoices) {
            if (inv.type === "DEPOSIT" && inv.allocationId) {
                depositStatusByAllocation.set(inv.allocationId, inv.status);
            }
        }

        // --- Active Shipments --------------------------------------------------
        const allocationsWithStatus = allocationsRaw.map(({ allocation, container }) => ({
            allocation,
            container,
            derivedStatus: deriveBookingStatus(
                allocation.status,
                container.status,
                depositStatusByAllocation.get(allocation.id) ?? null,
            ),
        }));
        const activeAllocations = allocationsWithStatus.filter(a => ACTIVE_STATUSES.has(a.derivedStatus));
        const activeWeekDelta = activeAllocations.filter(a => a.allocation.createdAt >= sevenDaysAgo).length;

        // --- Pending Tasks -----------------------------------------------------
        // V1 scope: overdue invoices + invoices due within next 7 days.
        // Missing-docs detection deferred until we have a per-shipment required-docs concept.
        const overdueInvoices = userInvoices.filter(i => i.status === "OVERDUE").length;
        const dueSoonCutoff = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const dueSoonInvoices = userInvoices.filter(i =>
            i.status === "PENDING" && i.dueDate >= now && i.dueDate <= dueSoonCutoff,
        ).length;
        const pendingTasksCount = overdueInvoices + dueSoonInvoices;

        // --- Monthly Spend -----------------------------------------------------
        const paidThisMonth = userInvoices
            .filter(i => i.status === "PAID" && i.paidAt && i.paidAt >= monthStart)
            .reduce((s, i) => s + Number(i.amountZAR), 0);
        const paidPrevMonth = userInvoices
            .filter(i => i.status === "PAID" && i.paidAt && i.paidAt >= prevMonthStart && i.paidAt < monthStart)
            .reduce((s, i) => s + Number(i.amountZAR), 0);
        const monthlySpendDelta = paidPrevMonth > 0
            ? ((paidThisMonth - paidPrevMonth) / paidPrevMonth) * 100
            : null;

        // --- Avg Transit Time --------------------------------------------------
        // Window over the user's delivered containers (last 90 days vs prior 90).
        const userContainerIds = Array.from(new Set(allocationsRaw.map(a => a.container.id)));
        const deliveredContainers = userContainerIds.length > 0
            ? await db
                .select({ id: containers.id, etd: containers.etd, eta: containers.eta, updatedAt: containers.updatedAt })
                .from(containers)
                .where(and(
                    inArray(containers.id, userContainerIds),
                    eq(containers.status, "DELIVERED"),
                    gte(containers.updatedAt, oneEightyDaysAgo),
                ))
            : [];
        const recent = deliveredContainers.filter(c => c.updatedAt >= ninetyDaysAgo);
        const prior = deliveredContainers.filter(c => c.updatedAt < ninetyDaysAgo);
        const avgRecent = avgDaysBetween(recent);
        const avgPrior = avgDaysBetween(prior);

        // --- Next Cut-off ------------------------------------------------------
        // Prefer a sailing whose route the client already books on; fall back to
        // the next global active sailing so first-time users still see context.
        const userRoutes = Array.from(new Set(allocationsRaw.map(a => a.container.route).filter(Boolean)));

        const findNextSailing = async (routeFilter: string[] | null) => {
            const baseConds = [eq(sailings.active, true), gt(sailings.etd, now)];
            // Sailings store route via portOfLoadValue + portOfDischargeValue, but
            // containers store a single `route` string ("ZACPT-NLRTM"). Match on
            // the concatenation so route-aware filtering works.
            if (routeFilter && routeFilter.length > 0) {
                const concat = sql<string>`${sailings.portOfLoadValue} || '-' || ${sailings.portOfDischargeValue}`;
                baseConds.push(inArray(concat, routeFilter));
            }
            const [row] = await db
                .select()
                .from(sailings)
                .where(and(...baseConds))
                .orderBy(asc(sailings.etd))
                .limit(1);
            return row ?? null;
        };

        let cutoffSailing = userRoutes.length > 0 ? await findNextSailing(userRoutes) : null;
        if (!cutoffSailing) cutoffSailing = await findNextSailing(null);

        const nextCutoff = cutoffSailing ? (() => {
            const cutoffAt = cutoffFromEtd(cutoffSailing.etd);
            const hoursToCutoff = (cutoffAt.getTime() - now.getTime()) / (1000 * 60 * 60);
            const hoursToEtd = (cutoffSailing.etd.getTime() - now.getTime()) / (1000 * 60 * 60);
            return {
                sailingId: cutoffSailing.id,
                vesselName: cutoffSailing.vesselName,
                voyageNumber: cutoffSailing.voyageNumber || null,
                portOfLoad: cutoffSailing.portOfLoadCity || cutoffSailing.portOfLoadValue,
                portOfDischarge: cutoffSailing.portOfDischargeCity || cutoffSailing.portOfDischargeValue,
                etd: cutoffSailing.etd.toISOString(),
                cutoffAt: cutoffAt.toISOString(),
                hoursRemaining: Math.max(0, hoursToCutoff),
                hoursToEtd: Math.max(0, hoursToEtd),
                cutoffPassed: hoursToCutoff <= 0,
                isClientRoute: userRoutes.includes(`${cutoffSailing.portOfLoadValue}-${cutoffSailing.portOfDischargeValue}`),
            };
        })() : null;

        // --- Upcoming bookings (for the bookings widget) -----------------------
        const upcomingRaw = activeAllocations
            .filter(a => a.container.etd && a.container.etd >= now)
            .sort((a, b) => (a.container.etd!.getTime() - b.container.etd!.getTime()))
            .slice(0, 3);
        // If we have fewer than 3 upcoming, pad with the most recently created active allocations
        if (upcomingRaw.length < 3) {
            const padded = activeAllocations
                .filter(a => !upcomingRaw.includes(a))
                .sort((a, b) => b.allocation.createdAt.getTime() - a.allocation.createdAt.getTime())
                .slice(0, 3 - upcomingRaw.length);
            upcomingRaw.push(...padded);
        }

        const invoiceBookingRefByAllocation = new Map<string, string>();
        for (const inv of userInvoices) {
            if (inv.allocationId && !invoiceBookingRefByAllocation.has(inv.allocationId)) {
                invoiceBookingRefByAllocation.set(inv.allocationId, inv.bookingRef);
            }
        }

        const upcomingBookings = upcomingRaw.map(({ allocation, container, derivedStatus }) => ({
            id: allocation.id,
            bookingRef: invoiceBookingRefByAllocation.get(allocation.id) ?? "—",
            status: derivedStatus,
            palletCount: allocation.palletCount,
            vessel: container.vessel,
            voyageNumber: container.voyageNumber,
            route: container.route,
            etd: container.etd?.toISOString() ?? null,
            eta: container.eta?.toISOString() ?? null,
        }));

        return NextResponse.json({
            stats: {
                activeShipments: {
                    count: activeAllocations.length,
                    weekDelta: activeWeekDelta,
                },
                pendingTasks: {
                    count: pendingTasksCount,
                    breakdown: {
                        overdueInvoices,
                        dueSoonInvoices,
                    },
                },
                monthlySpend: {
                    currentZAR: paidThisMonth,
                    previousZAR: paidPrevMonth,
                    deltaPercent: monthlySpendDelta,
                },
                avgTransitTime: {
                    currentDays: avgRecent,
                    previousDays: avgPrior,
                    deltaDays: avgRecent !== null && avgPrior !== null ? avgRecent - avgPrior : null,
                    sampleSize: recent.length,
                },
            },
            nextCutoff,
            upcomingBookings,
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load dashboard overview";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
