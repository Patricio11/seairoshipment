import type { Container } from '@/lib/types/finance';

export const MOCK_CONTAINERS: Container[] = [
    {
        id: '20ft-reefer-std',
        size: '20FT',
        type: 'REEFER',
        variant: 'STD',
        code: '20FT-REEFER-STD',
        displayName: '20ft Reefer',
        tempRangeMin: -25,
        tempRangeMax: 25,
        maxPallets: 10,
        dimensions: {
            length: 5.45,
            width: 2.29,
            height: 2.27
        },
        tareWeight: 3000,
        maxPayload: 27400,
        active: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
    },
    {
        id: '20ft-dry-std',
        size: '20FT',
        type: 'DRY',
        variant: 'STD',
        code: '20FT-DRY-STD',
        displayName: '20ft Dry Container',
        tempRangeMin: null,
        tempRangeMax: null,
        maxPallets: 10,
        dimensions: {
            length: 5.90,
            width: 2.35,
            height: 2.39
        },
        tareWeight: 2200,
        maxPayload: 28280,
        active: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
    },
    {
        id: '40ft-reefer-std',
        size: '40FT',
        type: 'REEFER',
        variant: 'STD',
        code: '40FT-REEFER-STD',
        displayName: '40ft Reefer',
        tempRangeMin: -25,
        tempRangeMax: 25,
        maxPallets: 20,
        dimensions: {
            length: 11.56,
            width: 2.29,
            height: 2.27
        },
        tareWeight: 4800,
        maxPayload: 27700,
        active: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
    },
    {
        id: '40ft-reefer-hc',
        size: '40FT',
        type: 'REEFER',
        variant: 'HC',
        code: '40FT-REEFER-HC',
        displayName: '40ft HC Reefer',
        tempRangeMin: -25,
        tempRangeMax: 25,
        maxPallets: 20,
        dimensions: {
            length: 11.56,
            width: 2.29,
            height: 2.57
        },
        tareWeight: 4850,
        maxPayload: 29150,
        active: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
    },
    {
        id: '40ft-dry-std',
        size: '40FT',
        type: 'DRY',
        variant: 'STD',
        code: '40FT-DRY-STD',
        displayName: '40ft Dry Container',
        tempRangeMin: null,
        tempRangeMax: null,
        maxPallets: 20,
        dimensions: {
            length: 12.03,
            width: 2.35,
            height: 2.39
        },
        tareWeight: 3750,
        maxPayload: 26730,
        active: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
    },
    {
        id: '40ft-dry-hc',
        size: '40FT',
        type: 'DRY',
        variant: 'HC',
        code: '40FT-DRY-HC',
        displayName: '40ft HC Dry Container',
        tempRangeMin: null,
        tempRangeMax: null,
        maxPallets: 20,
        dimensions: {
            length: 12.03,
            width: 2.35,
            height: 2.69
        },
        tareWeight: 3900,
        maxPayload: 26580,
        active: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
    }
];

export function getContainerById(id: string): Container | undefined {
    return MOCK_CONTAINERS.find(c => c.id === id);
}

export function getContainersByType(type: 'REEFER' | 'DRY'): Container[] {
    return MOCK_CONTAINERS.filter(c => c.type === type);
}

export function getActiveContainers(): Container[] {
    return MOCK_CONTAINERS.filter(c => c.active);
}
