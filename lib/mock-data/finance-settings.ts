import type { ExchangeRate, FinanceSettings } from '@/lib/types/finance';

// Current exchange rates (as of Jan 2024)
export const MOCK_EXCHANGE_RATES: ExchangeRate[] = [
    {
        id: 'exr-usd-zar',
        fromCurrency: 'USD',
        toCurrency: 'ZAR',
        rate: 18.95,
        source: 'SARB',
        effectiveDate: '2024-01-27',
        createdAt: '2024-01-27T00:00:00Z'
    },
    {
        id: 'exr-gbp-zar',
        fromCurrency: 'GBP',
        toCurrency: 'ZAR',
        rate: 24.15,
        source: 'SARB',
        effectiveDate: '2024-01-27',
        createdAt: '2024-01-27T00:00:00Z'
    },
    {
        id: 'exr-eur-zar',
        fromCurrency: 'EUR',
        toCurrency: 'ZAR',
        rate: 20.68,
        source: 'SARB',
        effectiveDate: '2024-01-27',
        createdAt: '2024-01-27T00:00:00Z'
    }
];

// Historical rates for charting
export const MOCK_HISTORICAL_RATES: ExchangeRate[] = [
    // USD/ZAR - Last 30 days
    { id: 'h-1', fromCurrency: 'USD', toCurrency: 'ZAR', rate: 18.42, source: 'SARB', effectiveDate: '2024-01-01', createdAt: '2024-01-01T00:00:00Z' },
    { id: 'h-2', fromCurrency: 'USD', toCurrency: 'ZAR', rate: 18.55, source: 'SARB', effectiveDate: '2024-01-05', createdAt: '2024-01-05T00:00:00Z' },
    { id: 'h-3', fromCurrency: 'USD', toCurrency: 'ZAR', rate: 18.68, source: 'SARB', effectiveDate: '2024-01-10', createdAt: '2024-01-10T00:00:00Z' },
    { id: 'h-4', fromCurrency: 'USD', toCurrency: 'ZAR', rate: 18.75, source: 'SARB', effectiveDate: '2024-01-15', createdAt: '2024-01-15T00:00:00Z' },
    { id: 'h-5', fromCurrency: 'USD', toCurrency: 'ZAR', rate: 18.82, source: 'SARB', effectiveDate: '2024-01-20', createdAt: '2024-01-20T00:00:00Z' },
    { id: 'h-6', fromCurrency: 'USD', toCurrency: 'ZAR', rate: 18.95, source: 'SARB', effectiveDate: '2024-01-27', createdAt: '2024-01-27T00:00:00Z' },

    // GBP/ZAR - Last 30 days
    { id: 'h-7', fromCurrency: 'GBP', toCurrency: 'ZAR', rate: 23.45, source: 'SARB', effectiveDate: '2024-01-01', createdAt: '2024-01-01T00:00:00Z' },
    { id: 'h-8', fromCurrency: 'GBP', toCurrency: 'ZAR', rate: 23.68, source: 'SARB', effectiveDate: '2024-01-05', createdAt: '2024-01-05T00:00:00Z' },
    { id: 'h-9', fromCurrency: 'GBP', toCurrency: 'ZAR', rate: 23.85, source: 'SARB', effectiveDate: '2024-01-10', createdAt: '2024-01-10T00:00:00Z' },
    { id: 'h-10', fromCurrency: 'GBP', toCurrency: 'ZAR', rate: 24.02, source: 'SARB', effectiveDate: '2024-01-15', createdAt: '2024-01-15T00:00:00Z' },
    { id: 'h-11', fromCurrency: 'GBP', toCurrency: 'ZAR', rate: 24.08, source: 'SARB', effectiveDate: '2024-01-20', createdAt: '2024-01-20T00:00:00Z' },
    { id: 'h-12', fromCurrency: 'GBP', toCurrency: 'ZAR', rate: 24.15, source: 'SARB', effectiveDate: '2024-01-27', createdAt: '2024-01-27T00:00:00Z' }
];

export function getCurrentExchangeRate(fromCurrency: 'USD' | 'GBP' | 'EUR'): ExchangeRate | undefined {
    return MOCK_EXCHANGE_RATES.find(r => r.fromCurrency === fromCurrency);
}

export function getHistoricalRates(fromCurrency: 'USD' | 'GBP' | 'EUR'): ExchangeRate[] {
    return MOCK_HISTORICAL_RATES.filter(r => r.fromCurrency === fromCurrency);
}

// Finance Settings
export const MOCK_FINANCE_SETTINGS: FinanceSettings = {
    id: 'fs-1',
    primeLendingRate: 11.75,
    financeMargin: 2.0,
    depositPercentage: 60,
    balancePercentage: 40,
    vatRate: 15,
    defaultCurrency: 'ZAR',
    effectiveFrom: '2024-01-01',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
};

export function getFinanceSettings(): FinanceSettings {
    return MOCK_FINANCE_SETTINGS;
}

export function getTotalFinanceRate(): number {
    return MOCK_FINANCE_SETTINGS.primeLendingRate + MOCK_FINANCE_SETTINGS.financeMargin;
}
