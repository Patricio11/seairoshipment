import type { DestinationCharge, DestinationChargeItem } from '@/lib/types/finance';

// London Gateway DAP Charges
const LONDON_GATEWAY_ITEMS: DestinationChargeItem[] = [
    {
        id: 'dci-lon-1',
        destinationChargeId: 'dc-lon-40hc-srs',
        chargeCode: 'DELIVERY',
        chargeName: 'Delivery to cold store Kent',
        chargeType: 'PER_CONTAINER',
        amountLocal: 560.00,
        amountZAR: 12488.00,
        sortOrder: 1,
        notes: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
    },
    {
        id: 'dci-lon-2',
        destinationChargeId: 'dc-lon-40hc-srs',
        chargeCode: 'GENSET',
        chargeName: 'Genset',
        chargeType: 'PER_CONTAINER',
        amountLocal: 280.00,
        amountZAR: 6244.00,
        sortOrder: 2,
        notes: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
    },
    {
        id: 'dci-lon-3',
        destinationChargeId: 'dc-lon-40hc-srs',
        chargeCode: 'DOCUMENTATION',
        chargeName: 'Documentation',
        chargeType: 'PER_CONTAINER',
        amountLocal: 55.00,
        amountZAR: 1226.50,
        sortOrder: 3,
        notes: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
    },
    {
        id: 'dci-lon-4',
        destinationChargeId: 'dc-lon-40hc-srs',
        chargeCode: 'PORT_CHARGES',
        chargeName: 'Port Charges',
        chargeType: 'PER_CONTAINER',
        amountLocal: 110.00,
        amountZAR: 2453.00,
        sortOrder: 4,
        notes: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
    },
    {
        id: 'dci-lon-5',
        destinationChargeId: 'dc-lon-40hc-srs',
        chargeCode: 'THC',
        chargeName: 'Terminal Handling Charge',
        chargeType: 'PER_CONTAINER',
        amountLocal: 285.00,
        amountZAR: 6355.50,
        sortOrder: 5,
        notes: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
    },
    {
        id: 'dci-lon-6',
        destinationChargeId: 'dc-lon-40hc-srs',
        chargeCode: 'CUSTOMS_ENTRY',
        chargeName: 'Customs Entry',
        chargeType: 'PER_CONTAINER',
        amountLocal: 400.00,
        amountZAR: 8920.00,
        sortOrder: 6,
        notes: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
    },
    {
        id: 'dci-lon-7',
        destinationChargeId: 'dc-lon-40hc-srs',
        chargeCode: 'CARRIER_TERMINAL',
        chargeName: 'Carrier Terminal Fees',
        chargeType: 'PER_CONTAINER',
        amountLocal: 100.00,
        amountZAR: 2230.00,
        sortOrder: 7,
        notes: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
    },
    {
        id: 'dci-lon-8',
        destinationChargeId: 'dc-lon-40hc-srs',
        chargeCode: 'UNPACK',
        chargeName: 'Unpack',
        chargeType: 'PER_CONTAINER',
        amountLocal: 385.00,
        amountZAR: 8585.50,
        sortOrder: 8,
        notes: 'Container devanning and pallet handling',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
    }
];

// Dublin DAP Charges (EUR)
const DUBLIN_ITEMS: DestinationChargeItem[] = [
    {
        id: 'dci-dub-1',
        destinationChargeId: 'dc-dub-40hc-srs',
        chargeCode: 'DELIVERY',
        chargeName: 'Delivery to cold store Dublin',
        chargeType: 'PER_CONTAINER',
        amountLocal: 520.00,
        amountZAR: 10608.00,
        sortOrder: 1,
        notes: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
    },
    {
        id: 'dci-dub-2',
        destinationChargeId: 'dc-dub-40hc-srs',
        chargeCode: 'THC',
        chargeName: 'Terminal Handling Charge',
        chargeType: 'PER_CONTAINER',
        amountLocal: 295.00,
        amountZAR: 6019.00,
        sortOrder: 2,
        notes: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
    },
    {
        id: 'dci-dub-3',
        destinationChargeId: 'dc-dub-40hc-srs',
        chargeCode: 'CUSTOMS_ENTRY',
        chargeName: 'Customs Entry',
        chargeType: 'PER_CONTAINER',
        amountLocal: 380.00,
        amountZAR: 7752.00,
        sortOrder: 3,
        notes: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
    },
    {
        id: 'dci-dub-4',
        destinationChargeId: 'dc-dub-40hc-srs',
        chargeCode: 'UNPACK',
        chargeName: 'Unpack',
        chargeType: 'PER_CONTAINER',
        amountLocal: 350.00,
        amountZAR: 7140.00,
        sortOrder: 4,
        notes: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
    }
];

export const MOCK_DESTINATION_CHARGES: DestinationCharge[] = [
    {
        id: 'dc-lon-40hc-srs',
        salesRateTypeId: 'srs',
        salesRateTypeName: 'SRS',
        destinationId: 'lon',
        destinationName: 'London Gateway',
        destinationPortCode: 'GBLON',
        containerId: '40ft-reefer-hc',
        containerDisplayName: '40ft HC Reefer',
        currency: 'GBP',
        exchangeRateToZAR: 22.30,
        effectiveFrom: '2024-01-01',
        effectiveTo: '2024-12-31',
        items: LONDON_GATEWAY_ITEMS,
        active: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
    },
    {
        id: 'dc-dub-40hc-srs',
        salesRateTypeId: 'srs',
        salesRateTypeName: 'SRS',
        destinationId: 'dub',
        destinationName: 'Dublin',
        destinationPortCode: 'IEDUB',
        containerId: '40ft-reefer-hc',
        containerDisplayName: '40ft HC Reefer',
        currency: 'EUR',
        exchangeRateToZAR: 20.40,
        effectiveFrom: '2024-01-01',
        effectiveTo: '2024-12-31',
        items: DUBLIN_ITEMS,
        active: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
    },
    {
        id: 'dc-goa-40hc-srs',
        salesRateTypeId: 'srs',
        salesRateTypeName: 'SRS',
        destinationId: 'goa',
        destinationName: 'Genoa',
        destinationPortCode: 'ITGOA',
        containerId: '40ft-reefer-hc',
        containerDisplayName: '40ft HC Reefer',
        currency: 'EUR',
        exchangeRateToZAR: 20.40,
        effectiveFrom: '2024-01-01',
        effectiveTo: '2024-12-31',
        items: [],
        active: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
    },
    {
        id: 'dc-leh-40hc-srs',
        salesRateTypeId: 'srs',
        salesRateTypeName: 'SRS',
        destinationId: 'leh',
        destinationName: 'Le Havre',
        destinationPortCode: 'FRLEH',
        containerId: '40ft-reefer-hc',
        containerDisplayName: '40ft HC Reefer',
        currency: 'EUR',
        exchangeRateToZAR: 20.40,
        effectiveFrom: '2024-01-01',
        effectiveTo: '2024-12-31',
        items: [],
        active: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
    }
];

export function getDestinationChargeById(id: string): DestinationCharge | undefined {
    return MOCK_DESTINATION_CHARGES.find(dc => dc.id === id);
}

export function getDestinationChargesByDestination(destinationId: string): DestinationCharge[] {
    return MOCK_DESTINATION_CHARGES.filter(dc => dc.destinationId === destinationId);
}

export function getActiveDestinationCharges(): DestinationCharge[] {
    return MOCK_DESTINATION_CHARGES.filter(dc => dc.active);
}
