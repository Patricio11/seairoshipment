import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { containers, palletAllocations, adminNotifications, invoices, products, cargoCalculations } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { calculateQuote, calculateCubeQuote } from "@/lib/rates";
import { calculateRoadQuote } from "@/lib/road-pricing";
import { totalCbm, totalWeight, volumetricWeightSea } from "@/lib/cbm";
import type { CargoItem, CollectionAddress, PalletDimensions } from "@/lib/db/schema/pallet-allocations";

/** Sanitise an address list from the client - drops empties, caps length,
 *  keeps optional label + maps link. Shared by collection + delivery lists. */
function cleanAddresses(raw: unknown, max = 5): CollectionAddress[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .map((a: unknown) => {
            if (!a || typeof a !== "object") return null;
            const row = a as { label?: unknown; address?: unknown; mapsLink?: unknown };
            const address = typeof row.address === "string" ? row.address.trim() : "";
            if (!address) return null;
            const out: CollectionAddress = { address };
            if (typeof row.label === "string" && row.label.trim()) out.label = row.label.trim();
            if (typeof row.mapsLink === "string" && row.mapsLink.trim()) out.mapsLink = row.mapsLink.trim();
            return out;
        })
        .filter((a): a is CollectionAddress => a !== null)
        .slice(0, max);
}

function deriveBookingStatus(
    allocationStatus: string,
    containerStatus: string,
    depositInvoiceStatus: string | null
): "PENDING" | "DEPOSIT_PAID" | "CONFIRMED" | "SAILING" | "DELIVERED" | "CANCELLED" {
    if (allocationStatus === "CANCELLED") return "CANCELLED";
    if (containerStatus === "DELIVERED") return "DELIVERED";
    if (containerStatus === "SAILING") return "SAILING";
    if (allocationStatus === "CONFIRMED") return "CONFIRMED";
    if (depositInvoiceStatus === "PAID") return "DEPOSIT_PAID";
    return "PENDING";
}

export async function GET() {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get all allocations for this user with container data
        const allocations = await db
            .select({
                allocation: palletAllocations,
                container: containers,
            })
            .from(palletAllocations)
            .innerJoin(containers, eq(palletAllocations.containerId, containers.id))
            .where(eq(palletAllocations.userId, session.user.id))
            .orderBy(desc(palletAllocations.createdAt));

        // Get all invoices for this user
        const userInvoices = await db
            .select()
            .from(invoices)
            .where(eq(invoices.userId, session.user.id));

        // Group invoices by allocationId
        const invoicesByAllocation = new Map<string, {
            bookingRef: string;
            routeLabel: string;
            deposit: typeof userInvoices[0] | null;
            balance: typeof userInvoices[0] | null;
        }>();

        for (const inv of userInvoices) {
            if (!inv.allocationId) continue;
            if (!invoicesByAllocation.has(inv.allocationId)) {
                invoicesByAllocation.set(inv.allocationId, {
                    bookingRef: inv.bookingRef,
                    routeLabel: inv.route,
                    deposit: null,
                    balance: null,
                });
            }
            const group = invoicesByAllocation.get(inv.allocationId)!;
            if (inv.type === "DEPOSIT") group.deposit = inv;
            else group.balance = inv;
        }

        // Shape the response
        const bookings = allocations.map(({ allocation, container }) => {
            const invGroup = invoicesByAllocation.get(allocation.id);
            return {
                id: allocation.id,
                bookingRef: invGroup?.bookingRef || "N/A",
                status: deriveBookingStatus(
                    allocation.status,
                    container.status,
                    invGroup?.deposit?.status || null
                ),
                palletCount: allocation.palletCount,
                cargoType: allocation.cargoType,
                cbmVolume: allocation.cbmVolume,
                commodityName: allocation.commodityName,
                temperature: allocation.temperature,
                consigneeName: allocation.consigneeName,
                consigneeAddress: allocation.consigneeAddress,
                collectionAddresses: allocation.collectionAddresses ?? [],
                transportMode: container.transportMode ?? "SEA",
                deliveryAddresses: allocation.deliveryAddresses ?? [],
                palletDimensions: allocation.palletDimensions ?? null,
                overhang: allocation.overhang ?? false,
                vessel: container.vessel,
                voyageNumber: container.voyageNumber,
                route: container.route,
                routeLabel: invGroup?.routeLabel || container.route,
                containerType: container.type,
                etd: container.etd,
                eta: container.eta,
                containerStatus: container.status,
                containerId: container.id,
                trackingStatus: container.trackingStatus,
                metashipOrderNo: container.metashipOrderNo,
                lastEventDescription: container.lastEventDescription,
                lastEventAt: container.lastEventAt,
                lastPositionLat: container.lastPositionLat,
                lastPositionLng: container.lastPositionLng,
                rejectionReason: allocation.rejectionReason || null,
                depositStatus: invGroup?.deposit?.status || null,
                balanceStatus: invGroup?.balance?.status || null,
                depositAmount: invGroup?.deposit?.amountZAR || null,
                balanceAmount: invGroup?.balance?.amountZAR || null,
                totalAmount: invGroup?.deposit?.subtotalZAR || null,
                createdAt: allocation.createdAt,
            };
        });

        return NextResponse.json(bookings);
    } catch (error: unknown) {
        console.error("Fetch bookings error:", error);
        const message =
            error instanceof Error ? error.message : "Failed to fetch bookings";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const {
            origin,
            destination,
            sailingScheduleId,
            vessel,
            voyageNumber,
            etd,
            eta,
            palletCount,
            productId,
            commodityName,
            hsCode,
            nettWeight,
            grossWeight,
            temperature,
            consigneeName,
            consigneeAddress,
            collectionAddresses,
            containerId: requestedContainerId,
            poNumber,
            salesRateTypeId,
            // Cube booking fields - present only when cargoType === "CUBE"
            cargoType: cargoTypeRaw,
            calculationId,
            // Road freight fields - present only when transportMode === "ROAD"
            transportMode,
            deliveryAddresses,
            palletDimensions,
            overhang,
        } = body;

        // ── ROAD branch: refrigerated road freight booking onto a truck ──
        if (transportMode === "ROAD") {
            if (!requestedContainerId) {
                return NextResponse.json({ error: "Select a truck" }, { status: 400 });
            }
            const pallets = Math.floor(Number(palletCount));
            if (!(pallets >= 1)) {
                return NextResponse.json({ error: "At least 1 pallet is required" }, { status: 400 });
            }

            const cleanCollection = cleanAddresses(collectionAddresses);
            if (cleanCollection.length === 0) {
                return NextResponse.json({ error: "A collection address is required" }, { status: 400 });
            }
            const cleanDelivery = cleanAddresses(deliveryAddresses);
            if (cleanDelivery.length === 0) {
                return NextResponse.json({ error: "A delivery address is required" }, { status: 400 });
            }

            // Pallet dimensions - required for packing-list verification
            const dims = palletDimensions as PalletDimensions | undefined;
            const dimsClean: PalletDimensions | null =
                dims && Number(dims.lengthCm) > 0 && Number(dims.widthCm) > 0 && Number(dims.heightCm) > 0
                    ? { lengthCm: Number(dims.lengthCm), widthCm: Number(dims.widthCm), heightCm: Number(dims.heightCm) }
                    : null;
            if (!dimsClean) {
                return NextResponse.json({ error: "Pallet dimensions (length, width, height) are required" }, { status: 400 });
            }

            const [truck] = await db
                .select()
                .from(containers)
                .where(eq(containers.id, requestedContainerId))
                .limit(1);
            if (!truck || truck.transportMode !== "ROAD") {
                return NextResponse.json({ error: "Truck not found" }, { status: 400 });
            }
            if (truck.status !== "OPEN") {
                return NextResponse.json({ error: "This truck is no longer open for bookings" }, { status: 400 });
            }

            // Product must belong to the truck's category (consolidation rule)
            if (productId && truck.categoryId) {
                const [productRow] = await db
                    .select({ categoryId: products.categoryId })
                    .from(products)
                    .where(eq(products.id, productId))
                    .limit(1);
                if (!productRow) {
                    return NextResponse.json({ error: "Selected product not found" }, { status: 400 });
                }
                if (productRow.categoryId !== truck.categoryId) {
                    return NextResponse.json(
                        { error: "This product can't be loaded on the selected truck (category mismatch). Please pick a different truck." },
                        { status: 400 }
                    );
                }
            }

            // Capacity check incl. pending allocations. Road bookings start at
            // 1 pallet - no minimum-5 rule.
            const pendingRoadAllocs = await db
                .select()
                .from(palletAllocations)
                .where(and(
                    eq(palletAllocations.containerId, truck.id),
                    eq(palletAllocations.status, "PENDING"),
                ));
            const pendingPallets = pendingRoadAllocs.reduce((sum, a) => sum + (a.palletCount || 0), 0);
            const remaining = truck.maxCapacity - truck.totalPallets - pendingPallets;
            if (pallets > remaining) {
                return NextResponse.json(
                    { error: `Truck only has ${remaining} pallet space${remaining !== 1 ? "s" : ""} remaining (including pending requests)` },
                    { status: 400 }
                );
            }

            // Price via the customer's road rate card (default fallback)
            const quote = await calculateRoadQuote(
                session.user.id,
                truck.route,
                pallets,
                cleanDelivery.length,
                Boolean(overhang),
            );
            if (!quote) {
                return NextResponse.json(
                    { error: "No road rates are loaded for this route yet. Please contact us for a quote." },
                    { status: 422 }
                );
            }

            const roadAllocationId = `ALC-${nanoid(10)}`;
            await db.insert(palletAllocations).values({
                id: roadAllocationId,
                containerId: truck.id,
                userId: session.user.id,
                palletCount: pallets,
                productId: productId || null,
                commodityName: commodityName || null,
                hsCode: hsCode || null,
                nettWeight: nettWeight?.toString() || null,
                grossWeight: grossWeight?.toString() || null,
                temperature: temperature || truck.temperature || null,
                consigneeName: null,   // road uses delivery addresses instead
                consigneeAddress: null,
                collectionAddresses: cleanCollection,
                deliveryAddresses: cleanDelivery,
                palletDimensions: dimsClean,
                overhang: Boolean(overhang),
                salesRateTypeId: "srs",
                cargoType: "PALLET",
                status: "PENDING",
            });

            await db.insert(adminNotifications).values({
                id: `NTF-${nanoid(10)}`,
                type: "BOOKING_CREATED",
                title: "New Road Freight Request",
                message: `New ${pallets}-pallet road booking on ${quote.routeLabel} (${truck.vessel}${truck.fileNumber ? ` · File ${truck.fileNumber}` : ""}). Awaiting review.`,
                containerId: truck.id,
                isRead: false,
            });

            const bookingRefRoad = `SRS-${nanoid(6).toUpperCase()}`;
            const yearRoad = new Date().getFullYear();
            const roadDepositId = `INV-${yearRoad}-${nanoid(6).toUpperCase()}`;
            const roadBalanceId = `INV-${yearRoad}-${nanoid(6).toUpperCase()}`;
            const roadDepositDue = new Date();
            roadDepositDue.setDate(roadDepositDue.getDate() + 7);
            const roadBalanceDue = truck.etd
                ? new Date(truck.etd.getTime() - 2 * 24 * 60 * 60 * 1000)
                : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

            // Invoice line mapping for road (the columns are sea-named but the
            // amounts are exact): originCharges = transport, oceanFreight =
            // additional drop fee, destinationCharges = overhang fee.
            const invoiceBase = {
                allocationId: roadAllocationId,
                userId: session.user.id,
                bookingRef: bookingRefRoad,
                route: quote.routeLabel,
                cargoType: "PALLET" as const,
                palletCount: pallets,
                cbmVolume: null,
                originChargesZAR: quote.transportTotal.toFixed(2),
                oceanFreightZAR: quote.additionalDropFee.toFixed(2),
                destinationChargesZAR: quote.overhangTotal.toFixed(2),
                subtotalZAR: quote.totalCost.toFixed(2),
                poNumber: poNumber || null,
            };
            await db.insert(invoices).values([
                {
                    ...invoiceBase,
                    id: roadDepositId,
                    type: "DEPOSIT",
                    status: "PENDING",
                    percentage: quote.depositPercentage,
                    amountZAR: quote.depositAmount.toFixed(2),
                    dueDate: roadDepositDue,
                },
                {
                    ...invoiceBase,
                    id: roadBalanceId,
                    type: "BALANCE",
                    status: "PENDING",
                    percentage: 100 - quote.depositPercentage,
                    amountZAR: quote.balanceAmount.toFixed(2),
                    dueDate: roadBalanceDue,
                },
            ]);

            return NextResponse.json({
                success: true,
                bookingReference: bookingRefRoad,
                allocationId: roadAllocationId,
                containerId: truck.id,
                cargoType: "PALLET",
                transportMode: "ROAD",
                totalPallets: pallets,
                totalCBM: 0,
                invoices: {
                    deposit: { id: roadDepositId },
                    balance: { id: roadBalanceId },
                },
            });
        }

        // ── SEA branch (existing behaviour, unchanged) ──
        const cargoType: "PALLET" | "CUBE" = cargoTypeRaw === "CUBE" ? "CUBE" : "PALLET";

        // Sanitise collection addresses - at least 1 required, max 5, drop empties
        const cleanCollectionAddresses: Array<{ label?: string; address: string }> = Array.isArray(collectionAddresses)
            ? collectionAddresses
                .map((a: unknown) => {
                    if (!a || typeof a !== "object") return null;
                    const row = a as { label?: unknown; address?: unknown };
                    const address = typeof row.address === "string" ? row.address.trim() : "";
                    if (!address) return null;
                    const label = typeof row.label === "string" && row.label.trim() ? row.label.trim() : undefined;
                    return label ? { label, address } : { address };
                })
                .filter((a): a is { label?: string; address: string } => a !== null)
                .slice(0, 5)
            : [];
        if (cleanCollectionAddresses.length === 0) {
            return NextResponse.json(
                { error: "At least one collection / loading address is required" },
                { status: 400 }
            );
        }

        if (!origin || !destination) {
            return NextResponse.json(
                { error: "Origin and destination are required" },
                { status: 400 }
            );
        }
        if (cargoType === "PALLET" && (!palletCount || palletCount < 1)) {
            return NextResponse.json(
                { error: "At least 1 pallet is required for a Pallet booking" },
                { status: 400 }
            );
        }
        if (cargoType === "CUBE" && !calculationId) {
            return NextResponse.json(
                { error: "A saved calculation is required for a Cube booking" },
                { status: 400 }
            );
        }

        const route = `${origin}-${destination}`;

        // Find an existing OPEN container - only admins can create containers
        let containerId = requestedContainerId;
        let container;

        if (containerId) {
            const existing = await db
                .select()
                .from(containers)
                .where(eq(containers.id, containerId))
                .limit(1);
            container = existing[0];
        }

        if (!container) {
            // Find open container for same route, service type, cargo type, and sailing.
            // Cube bookings MUST come in with an explicit containerId - auto-find
            // doesn't apply because the user picked their specific container in
            // the Smart-match panel or wizard.
            if (cargoType === "CUBE") {
                return NextResponse.json(
                    { error: "Cube bookings require an explicit container selection. Pick one from the Smart-match panel or the container list." },
                    { status: 400 }
                );
            }
            const openContainers = await db
                .select()
                .from(containers)
                .where(
                    and(
                        eq(containers.route, route),
                        eq(containers.status, "OPEN"),
                        eq(containers.salesRateTypeId, salesRateTypeId || "srs"),
                        eq(containers.cargoType, "PALLET"),
                        sailingScheduleId
                            ? eq(containers.sailingScheduleId, sailingScheduleId)
                            : undefined
                    )
                )
                .limit(1);

            if (openContainers.length > 0) {
                container = openContainers[0];
                containerId = container.id;
            } else {
                return NextResponse.json(
                    { error: "No containers are currently available for this route. Please contact us or check back later." },
                    { status: 404 }
                );
            }
        }

        // Cargo-type match is non-negotiable: a CUBE allocation can't sit on a
        // PALLET container (or vice versa).
        if (container.cargoType !== cargoType) {
            return NextResponse.json(
                { error: `This container is ${container.cargoType.toLowerCase()}-only; switch cargo type to continue.` },
                { status: 400 }
            );
        }

        // Validate the chosen product's category matches the container's category.
        // This enforces the consolidation rule: a "Frozen Seafood" container only
        // accepts products in that category.
        if (productId && container.categoryId) {
            const [productRow] = await db
                .select({ categoryId: products.categoryId })
                .from(products)
                .where(eq(products.id, productId))
                .limit(1);
            if (!productRow) {
                return NextResponse.json({ error: "Selected product not found" }, { status: 400 });
            }
            if (!productRow.categoryId) {
                return NextResponse.json(
                    { error: "Selected product is not assigned to any category - please choose a different product or contact support." },
                    { status: 400 }
                );
            }
            if (productRow.categoryId !== container.categoryId) {
                return NextResponse.json(
                    { error: "This product can't be shipped on the selected container (category mismatch). Please pick a different container." },
                    { status: 400 }
                );
            }
        }

        // Capacity check - branches by cargo type. PALLET uses palletCount
        // against container.maxCapacity; CUBE uses cbmVolume against
        // container.maxCapacityCBM. Both factor in pending allocations so an
        // unconfirmed but live request can't be over-booked.
        const pendingAllocs = await db
            .select()
            .from(palletAllocations)
            .where(
                and(
                    eq(palletAllocations.containerId, container.id),
                    eq(palletAllocations.status, "PENDING")
                )
            );

        // Resolved Cube fields populated only on the CUBE path
        let cubeSnapshotItems: CargoItem[] | null = null;
        let cubeTotalCBM = 0;
        let cubeVolumetricKg = 0;
        let cubeTotalWeightKg = 0;

        if (cargoType === "PALLET") {
            const pendingPallets = pendingAllocs.reduce((sum, a) => sum + (a.palletCount || 0), 0);
            const reserved = container.totalPallets + pendingPallets;
            const remaining = container.maxCapacity - reserved;
            const minRequired = remaining < 5 ? 1 : 5;
            if (palletCount < minRequired) {
                return NextResponse.json(
                    { error: `Minimum booking is ${minRequired} pallet${minRequired > 1 ? "s" : ""} for this container` },
                    { status: 400 }
                );
            }
            const newTotal = reserved + palletCount;
            if (newTotal > container.maxCapacity) {
                return NextResponse.json(
                    { error: `Container only has ${remaining} pallet space${remaining !== 1 ? "s" : ""} remaining (including pending requests)` },
                    { status: 400 }
                );
            }
        } else {
            // CUBE - fetch the calc, verify ownership, recompute totals from
            // its items (server-side trust). Snapshot those into the allocation.
            const [calc] = await db
                .select()
                .from(cargoCalculations)
                .where(and(
                    eq(cargoCalculations.id, calculationId),
                    eq(cargoCalculations.userId, session.user.id),
                ))
                .limit(1);
            if (!calc) {
                return NextResponse.json(
                    { error: "Calculation not found or not yours" },
                    { status: 400 }
                );
            }
            const items = (calc.cargoItems ?? []) as CargoItem[];
            if (items.length === 0) {
                return NextResponse.json(
                    { error: "Calculation has no cargo items" },
                    { status: 400 }
                );
            }
            cubeSnapshotItems = items;
            cubeTotalCBM = totalCbm(items);
            cubeTotalWeightKg = totalWeight(items);
            cubeVolumetricKg = volumetricWeightSea(cubeTotalCBM);

            const containerMaxCBM = container.maxCapacityCBM ? Number(container.maxCapacityCBM) : 0;
            if (containerMaxCBM <= 0) {
                return NextResponse.json(
                    { error: "This container has no CBM capacity configured. Contact admin." },
                    { status: 400 }
                );
            }
            const pendingCBM = pendingAllocs.reduce((sum, a) => sum + Number(a.cbmVolume ?? 0), 0);
            const reservedCBM = Number(container.totalCBM ?? 0) + pendingCBM;
            const remainingCBM = containerMaxCBM - reservedCBM;
            if (cubeTotalCBM > remainingCBM + 0.0001) {
                return NextResponse.json(
                    { error: `Container only has ${remainingCBM.toFixed(2)} m³ space remaining (including pending requests); your cargo needs ${cubeTotalCBM.toFixed(2)} m³.` },
                    { status: 400 }
                );
            }
        }

        // Create allocation - starts as PENDING. Container totals (totalPallets
        // / totalCBM) are NOT updated here - only confirmed allocations count
        // against capacity. Admin approves in the Pending Requests tab.
        const allocationId = `ALC-${nanoid(10)}`;
        await db.insert(palletAllocations).values({
            id: allocationId,
            containerId: containerId!,
            userId: session.user.id,
            palletCount: cargoType === "CUBE" ? 0 : palletCount,
            productId: productId || null,
            commodityName: commodityName || null,
            hsCode: hsCode || null,
            nettWeight: nettWeight?.toString() || null,
            grossWeight: grossWeight?.toString() || null,
            // SCS carries no temperature regime; force null even if client sent
            // a stale string from an earlier wizard state.
            temperature: salesRateTypeId === "scs" ? null : (temperature || null),
            consigneeName: consigneeName || null,
            consigneeAddress: consigneeAddress || null,
            collectionAddresses: cleanCollectionAddresses,
            salesRateTypeId: salesRateTypeId || "srs",
            cargoType,
            cbmVolume: cargoType === "CUBE" ? cubeTotalCBM.toFixed(4) : null,
            volumetricWeightKg: cargoType === "CUBE" ? cubeVolumetricKg.toFixed(4) : null,
            cargoItems: cargoType === "CUBE" ? cubeSnapshotItems : null,
            calculationId: cargoType === "CUBE" ? calculationId : null,
            status: "PENDING",
        });

        // Silence unused-var warning for cubeTotalWeightKg - captured into the
        // sustainability/invoice future fields but not persisted on the allocation row.
        void cubeTotalWeightKg;

        // Note: container.totalPallets is NOT updated here - it only reflects CONFIRMED allocations.
        // The admin must approve this request in the Pending Requests tab for it to count.

        // Notify admin of new pending request
        const summary = cargoType === "CUBE"
            ? `${cubeTotalCBM.toFixed(2)} m³ Cube`
            : `${palletCount}-pallet`;
        await db.insert(adminNotifications).values({
            id: `NTF-${nanoid(10)}`,
            type: "BOOKING_CREATED",
            title: "New Booking Request",
            message: `New ${summary} booking request on route ${route} (${container.vessel}). Awaiting review.`,
            containerId: containerId!,
            isRead: false,
        });

        // Generate booking reference
        const bookingRef = `SRS-${nanoid(6).toUpperCase()}`;

        // Generate invoices (60% deposit + 40% balance)
        // Rate resolver needs both the service type (SRS/SCS) and the container type
        // so per-equipment pricing flows through end-to-end.
        if (!container.containerTypeId) {
            return NextResponse.json(
                { error: "Container has no container-type assigned - admin must set one before bookings can be priced" },
                { status: 422 }
            );
        }

        const year = new Date().getFullYear();
        const depositId = `INV-${year}-${nanoid(6).toUpperCase()}`;
        const balanceId = `INV-${year}-${nanoid(6).toUpperCase()}`;

        const depositDue = new Date();
        depositDue.setDate(depositDue.getDate() + 7);

        const balanceDue = etd
            ? new Date(new Date(etd).getTime() - 7 * 24 * 60 * 60 * 1000)
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        if (cargoType === "PALLET") {
            const quote = await calculateQuote(
                origin,
                destination,
                palletCount,
                body.salesRateTypeId || "srs",
                container.containerTypeId,
            );
            const routeLabel = `${quote.originName} → ${quote.destinationName}`;
            await db.insert(invoices).values([
                {
                    id: depositId,
                    allocationId,
                    userId: session.user.id,
                    type: "DEPOSIT",
                    status: "PENDING",
                    bookingRef,
                    route: routeLabel,
                    cargoType: "PALLET",
                    palletCount,
                    cbmVolume: null,
                    originChargesZAR: (quote.originPerPallet * palletCount).toFixed(2),
                    oceanFreightZAR: (quote.oceanPerPallet * palletCount).toFixed(2),
                    destinationChargesZAR: (quote.destinationPerPallet * palletCount).toFixed(2),
                    subtotalZAR: quote.totalCost.toFixed(2),
                    percentage: 60,
                    amountZAR: quote.depositAmount.toFixed(2),
                    poNumber: poNumber || null,
                    dueDate: depositDue,
                },
                {
                    id: balanceId,
                    allocationId,
                    userId: session.user.id,
                    type: "BALANCE",
                    status: "PENDING",
                    bookingRef,
                    route: routeLabel,
                    cargoType: "PALLET",
                    palletCount,
                    cbmVolume: null,
                    originChargesZAR: (quote.originPerPallet * palletCount).toFixed(2),
                    oceanFreightZAR: (quote.oceanPerPallet * palletCount).toFixed(2),
                    destinationChargesZAR: (quote.destinationPerPallet * palletCount).toFixed(2),
                    subtotalZAR: quote.totalCost.toFixed(2),
                    percentage: 40,
                    amountZAR: quote.balanceAmount.toFixed(2),
                    poNumber: poNumber || null,
                    dueDate: balanceDue,
                },
            ]);
        } else {
            // CUBE - price per m³. Quote may fail gracefully (zero amounts)
            // when admin hasn't loaded a CUBE rate card yet; we still create
            // the invoices so admin sees the booking request, just with zero
            // totals that they can adjust manually.
            const cubeQuote = await calculateCubeQuote(
                origin,
                destination,
                cubeTotalCBM,
                body.salesRateTypeId || "scs",
                container.containerTypeId,
            ).catch(() => null);
            const routeLabel = cubeQuote
                ? `${cubeQuote.originName} → ${cubeQuote.destinationName}`
                : `${origin} → ${destination}`;
            const originCost = cubeQuote ? cubeQuote.originPerCBM * cubeTotalCBM : 0;
            const oceanCost = cubeQuote ? cubeQuote.oceanPerCBM * cubeTotalCBM : 0;
            const destinationCost = cubeQuote ? cubeQuote.destinationPerCBM * cubeTotalCBM : 0;
            const totalCost = cubeQuote?.totalCost ?? 0;
            const depositAmount = cubeQuote?.depositAmount ?? 0;
            const balanceAmount = cubeQuote?.balanceAmount ?? 0;

            await db.insert(invoices).values([
                {
                    id: depositId,
                    allocationId,
                    userId: session.user.id,
                    type: "DEPOSIT",
                    status: "PENDING",
                    bookingRef,
                    route: routeLabel,
                    cargoType: "CUBE",
                    palletCount: 0,
                    cbmVolume: cubeTotalCBM.toFixed(4),
                    originChargesZAR: originCost.toFixed(2),
                    oceanFreightZAR: oceanCost.toFixed(2),
                    destinationChargesZAR: destinationCost.toFixed(2),
                    subtotalZAR: totalCost.toFixed(2),
                    percentage: 60,
                    amountZAR: depositAmount.toFixed(2),
                    poNumber: poNumber || null,
                    dueDate: depositDue,
                },
                {
                    id: balanceId,
                    allocationId,
                    userId: session.user.id,
                    type: "BALANCE",
                    status: "PENDING",
                    bookingRef,
                    route: routeLabel,
                    cargoType: "CUBE",
                    palletCount: 0,
                    cbmVolume: cubeTotalCBM.toFixed(4),
                    originChargesZAR: originCost.toFixed(2),
                    oceanFreightZAR: oceanCost.toFixed(2),
                    destinationChargesZAR: destinationCost.toFixed(2),
                    subtotalZAR: totalCost.toFixed(2),
                    percentage: 40,
                    amountZAR: balanceAmount.toFixed(2),
                    poNumber: poNumber || null,
                    dueDate: balanceDue,
                },
            ]);
        }

        return NextResponse.json({
            success: true,
            bookingReference: bookingRef,
            allocationId,
            containerId,
            cargoType,
            // Mode-specific volume figure the wizard's success toast prints
            totalPallets: cargoType === "PALLET" ? palletCount : 0,
            totalCBM: cargoType === "CUBE" ? cubeTotalCBM : 0,
            invoices: {
                deposit: { id: depositId },
                balance: { id: balanceId },
            },
        });
    } catch (error: unknown) {
        console.error("Create booking error:", error);
        const message =
            error instanceof Error ? error.message : "Failed to create booking";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
