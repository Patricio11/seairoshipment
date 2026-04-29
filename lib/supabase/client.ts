import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder', {
    auth: { persistSession: false },
});

export const STORAGE_BUCKET = 'srs-documents';

export const STORAGE_PATHS = {
    BOOKING_DOCUMENTS: 'bookings/documents',
    COMPANY_DOCUMENTS: 'company/documents',
} as const;

export type StoragePath = typeof STORAGE_PATHS[keyof typeof STORAGE_PATHS];
