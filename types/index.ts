export type UserRole = "admin" | "client";

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
    temperature: string;
    consigneeName: string;
    consigneeAddress: string;
    collectionAddresses: Array<{ label?: string; address: string }>;
    hasDocs: boolean;
    containerId: string;
    vessel: string;
    agreeToTerms: boolean;
    poNumber?: string;
    salesRateTypeId?: string;
    files?: File[];                                 // legacy — raw file list
    fileEntries?: Array<{ file: File; documentCode: string }>;  // preferred — file + which required-doc slot it fills
}

export interface ContainerSlot {
    id: string;
    vessel: string;
    preFilled: number;
    maxCapacity: number;
    date: string;
    type: "20FT" | "40FT";
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

export interface CostBreakdown {
    originPerPallet: number;
    oceanPerPallet: number;
    destinationPerPallet: number;
    totalPerPallet: number;
    totalCost: number;
    depositAmount: number;
    balanceAmount: number;
    palletCount: number;
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
    commodityName: string | null;
    temperature: string | null;
    consigneeName: string | null;
    consigneeAddress: string | null;
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
