// Finance-related TypeScript interfaces and types

export type ContainerSize = '20FT' | '40FT';
export type ContainerType = 'REEFER' | 'DRY';
export type ContainerVariant = 'STD' | 'HC';

export interface Container {
    id: string;
    size: ContainerSize;
    type: ContainerType;
    variant: ContainerVariant | null;
    code: string;              // "40FT-REEFER-HC"
    displayName: string;       // "40ft HC Reefer"
    tempRangeMin: number | null;
    tempRangeMax: number | null;
    maxPallets: number;
    dimensions: {
        length: number;
        width: number;
        height: number;
    };
    tareWeight: number;
    maxPayload: number;
    active: boolean;
    createdAt: string;
    updatedAt: string;
}

export type ChargeCategory =
    | 'COLLECTION'
    | 'STORAGE'
    | 'HANDLING'
    | 'TRANSPORT'
    | 'REGULATORY'
    | 'DOCUMENTATION'
    | 'CUSTOMS'
    | 'INSURANCE'
    | 'OTHER';

export type ChargeType = 'PER_PALLET' | 'PER_CONTAINER' | 'FIXED';

export interface OriginChargeItem {
    id: string;
    originChargeId: string;
    chargeCode: string;
    chargeName: string;
    chargeType: ChargeType;
    category: ChargeCategory;
    unitCost: number | null;        // per pallet
    containerCost: number | null;   // per container
    mandatory: boolean;
    sortOrder: number;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface OriginCharge {
    id: string;
    salesRateTypeId: string;
    salesRateTypeName: string;
    originId: string;
    originName: string;
    containerId: string;
    containerDisplayName: string;
    effectiveFrom: string;
    effectiveTo: string | null;
    currency: 'ZAR';
    items: OriginChargeItem[];
    active: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface OceanFreightRate {
    id: string;
    salesRateTypeId: string;
    salesRateTypeName: string;
    origin: string;              // Port of Load
    destinationCountry: string;
    destinationPort: string;
    destinationPortCode: string;
    shippingLine: string;
    containerId: string;
    containerDisplayName: string; // Equipment Type
    effectiveFrom: string;
    effectiveTo: string | null;
    freightUSD: number;
    bafUSD: number;
    ispsUSD: number;
    otherSurchargesUSD: number;
    rcgUSD: number;
    totalUSD: number;
    exchangeRate: number;
    totalZAR: number;
    active: boolean;
    createdAt: string;
    updatedAt: string;
}

export type Currency = 'ZAR' | 'USD' | 'GBP' | 'EUR';

export interface DestinationChargeItem {
    id: string;
    destinationChargeId: string;
    chargeCode: string;
    chargeName: string;
    chargeType: 'PER_CONTAINER' | 'FIXED';
    amountLocal: number;
    amountZAR: number;
    sortOrder: number;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface DestinationCharge {
    id: string;
    salesRateTypeId: string;
    salesRateTypeName: string;
    destinationId: string;
    destinationName: string;
    destinationPortCode: string;
    containerId: string;
    containerDisplayName: string;
    currency: 'GBP' | 'EUR' | 'USD';
    exchangeRateToZAR: number;
    effectiveFrom: string;
    effectiveTo: string | null;
    items: DestinationChargeItem[];
    active: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface ExchangeRate {
    id: string;
    fromCurrency: Currency;
    toCurrency: 'ZAR';
    rate: number;
    source: 'SARB' | 'MANUAL' | 'API';
    effectiveDate: string;
    createdAt: string;
}

export interface FinanceSettings {
    id: string;
    primeLendingRate: number;
    financeMargin: number;
    depositPercentage: number;
    balancePercentage: number;
    vatRate: number;
    defaultCurrency: 'ZAR';
    effectiveFrom: string;
    createdAt: string;
    updatedAt: string;
}

export interface SalesRateType {
    id: string;
    code: string;
    name: string;
    description: string;
    active: boolean;
    createdAt: string;
    updatedAt: string;
}
