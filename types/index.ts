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
