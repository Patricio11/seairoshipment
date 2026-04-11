import type { SalesRateType } from '@/lib/types/finance';

export const MOCK_SALES_RATE_TYPES: SalesRateType[] = [
    {
        id: 'srs',
        code: 'SRS',
        name: 'Shared Reefer Services',
        description: 'SRS consolidation service for refrigerated cargo',
        active: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
    },
    {
        id: 'scs',
        code: 'SCS',
        name: 'Shared Container Service',
        description: 'Shared container service for consolidated cargo',
        active: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
    }
];

export function getSalesRateTypeById(id: string): SalesRateType | undefined {
    return MOCK_SALES_RATE_TYPES.find(srt => srt.id === id);
}
