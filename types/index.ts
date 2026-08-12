export type UserRole = "admin" | "client";

export type VettingStatus =
    | "EMAIL_PENDING"
    | "ONBOARDING_PENDING"
    | "PENDING_REVIEW"
    | "APPROVED"
    | "REJECTED";

export interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    image?: string;
    emailVerified: boolean;
    isVetted: boolean;
    accountNumber?: string;
    companyName?: string;
    companyReg?: string;
    vettingStatus: VettingStatus;
    vettingRejectionReason?: string | null;
    vettingAdminNote?: string | null;
    vettingReviewedAt?: Date | null;
    vettingReviewedBy?: string | null;
    companyAddress?: string | null;
    companyCountry?: string | null;
    vatNumber?: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface Booking {
    id: string;
    reference: string;
    clientName: string;
    vessel: string;
    route: string; // e.g., "CPT-LND"
    etd: string;
    eta: string;
    status: 'PENDING' | 'DEPOSIT_PAID' | 'CONFIRMED' | 'GATE_IN' | 'LOADED' | 'SAILING' | 'ARRIVED' | 'DELIVERED';
    depositPaid: boolean;
    palletCount: number;
    documents: Document[];
    createdAt: Date;
    updatedAt: Date;
}

export interface Document {
    id: string;
    name: string;
    type: 'INVOICE' | 'PACKING_LIST' | 'COA' | 'HEALTH_CERT' | 'HBL' | 'MBL' | 'OTHER';
    url: string;
    uploadedAt: Date;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface ShipmentUpdate {
    timestamp: Date;
    status: string;
    location?: string;
    description: string;
}

export interface Location {
    code: string;
    name: string;
    country: string;
    type: 'ORIGIN' | 'DESTINATION' | 'HUB';
    coordinates?: string;
}

export interface BookingFormData {
    origin: string;
    destination: string;
    date: string | undefined;
    sailingDate?: string;
    sailingScheduleId?: string;
    voyageNumber?: string;
    vesselName?: string;
    palletCount: number;
    commodity: string;           // product id
    commodityName?: string;
    hsCode?: string;
    commodityDescription?: string;
    categoryId?: string;         // product's category id (derived, used by docs step)
    categoryName?: string;       // for display
    nettWeight?: number;
    grossWeight?: number;
    temperature: string | null;   // null = SCS / dry container; "" = SRS not yet picked
    // Cargo type - Pallet keeps the existing palletCount flow; Cube uses
    // calculationId + cargoItems + cbmVolume below. SRS bookings are always
    // PALLET; SCS bookings can be either. Defaults to "PALLET".
    cargoType?: "PALLET" | "CUBE";
    calculationId?: string;        // FK soft-reference to cargo_calculations
    cbmVolume?: number;            // total volume in m³ (server recomputes from calc)
    volumetricWeightKg?: number;   // sea volumetric weight (cbm × 1000)
    cargoItems?: Array<{           // snapshot from the calc at booking time
        id: string;
        label?: string;
        lengthMm: number;
        widthMm: number;
        heightMm: number;
        weightKg: number;
        quantity: number;
    }>;
    consigneeName: string;
    consigneeAddress: string;
    collectionAddresses: Array<{ label?: string; address: string }>;
    hasDocs: boolean;
    containerId: string;
    vessel: string;
    agreeToTerms: boolean;
    poNumber?: string;
    salesRateTypeId?: string;
    files?: File[];                                 // legacy - raw file list
    fileEntries?: Array<{ file: File; documentCode: string }>;  // preferred - file + which required-doc slot it fills
}

export interface ContainerSlot {
    id: string;
    vessel: string;
    preFilled: number;
    maxCapacity: number;
    date: string;
    type: "20FT" | "40FT";
    cargoType?: "PALLET" | "CUBE";
    totalCBM?: number;
    maxCapacityCBM?: number | null;
}

export interface SailingSchedule {
    id: string;
    vesselName: string;
    voyageNumber: string;
    portOfLoadValue: string;
    portOfLoadName: string;
    finalDestinationValue: string;
    finalDestinationName: string;
    etd: string;
    eta: string;
    transitTime: number;
    serviceType: string;
}

export interface MetaShipProduct {
    id: string | number;
    name: string;
    hsCode: string;
    description: string;
}

/**
 * Quote response from /api/rates/quote - polymorphic shape:
 *   - PALLET quotes carry per-pallet fields and `palletCount`
 *   - CUBE quotes carry per-CBM fields and `cbmVolume`
 * The `cargoType` discriminator field lets the renderer pick the right
 * accessor without inferring.
 */
export interface CostBreakdown {
    cargoType?: "PALLET" | "CUBE";
    // PALLET-only fields
    originPerPallet?: number;
    oceanPerPallet?: number;
    destinationPerPallet?: number;
    totalPerPallet?: number;
    palletCount?: number;
    // CUBE-only fields
    originPerCBM?: number;
    oceanPerCBM?: number;
    destinationPerCBM?: number;
    totalPerCBM?: number;
    cbmVolume?: number;
    containerVolumeCBM?: number;
    // Shared
    totalCost: number;
    depositAmount: number;
    balanceAmount: number;
    originName: string;
    destinationName: string;
    hasOriginRates: boolean;
    hasOceanRates: boolean;
    hasDestinationRates: boolean;
}

export interface ClientBooking {
    id: string;
    bookingRef: string;
    status: "PENDING" | "DEPOSIT_PAID" | "CONFIRMED" | "SAILING" | "DELIVERED" | "CANCELLED";
    palletCount: number;
    cargoType?: "PALLET" | "CUBE" | null;
    cbmVolume?: string | null;
    commodityName: string | null;
    temperature: string | null;
    consigneeName: string | null;
    consigneeAddress: string | null;
    collectionAddresses?: Array<{ label?: string; address: string; mapsLink?: string }>;
    // Road freight fields - SEA bookings carry the defaults
    transportMode?: "SEA" | "ROAD";
    deliveryAddresses?: Array<{ label?: string; address: string; mapsLink?: string }>;
    palletDimensions?: { lengthCm: number; widthCm: number; heightCm: number } | null;
    overhang?: boolean;
    vessel: string;
    voyageNumber: string | null;
    route: string;
    routeLabel: string;
    containerType: "20FT" | "40FT";
    etd: string | null;
    eta: string | null;
    containerStatus: string;
    containerId?: string;
    trackingStatus?: "NONE" | "SUBSCRIBED" | "FAILED" | "UNSUBSCRIBED" | null;
    metashipOrderNo?: string | null;
    lastEventDescription?: string | null;
    lastEventAt?: string | null;
    lastPositionLat?: number | null;
    lastPositionLng?: number | null;
    depositStatus: string | null;
    balanceStatus: string | null;
    depositAmount: string | null;
    balanceAmount: string | null;
    totalAmount: string | null;
    rejectionReason?: string | null;
    createdAt: string;
}

export interface Invoice {
    id: string;
    type: "DEPOSIT" | "BALANCE";
    status: "PENDING" | "PAID" | "OVERDUE" | "CANCELLED";
    bookingRef: string;
    route: string;
    palletCount: number;
    cargoType?: "PALLET" | "CUBE" | null;
    cbmVolume?: string | null;
    originChargesZAR?: number;
    oceanFreightZAR?: number;
    destinationChargesZAR?: number;
    subtotalZAR: number;
    percentage: number;
    amountZAR: number;
    poNumber?: string;
    reminderSentAt?: string;
    dueDate: string;
    paidAt: string | null;
    createdAt: string;
    companyName?: string;
    clientName?: string;
    userId?: string;
}
