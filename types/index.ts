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
    commodity: string;
    commodityName?: string;
    hsCode?: string;
    commodityDescription?: string;
    nettWeight?: number;
    grossWeight?: number;
    temperature: string;
    consigneeName: string;
    consigneeAddress: string;
    hasDocs: boolean;
    containerId: string;
    vessel: string;
    agreeToTerms: boolean;
    poNumber?: string;
}

export interface ContainerSlot {
    id: string;
    vessel: string;
    preFilled: number;
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
