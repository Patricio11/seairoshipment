import { supabase, STORAGE_BUCKET, StoragePath } from './client';

export interface UploadResult {
    success: boolean;
    url?: string;
    path?: string;
    error?: string;
}

/**
 * Build a Supabase-safe storage key. Always sanitises (Supabase rejects keys
 * with spaces, parens, accents, etc.) and always adds a timestamp + random
 * suffix so retries don't trip "resource already exists" with upsert: false.
 *
 * Callers can pass a `preferredBase` (e.g. an account-prefixed filename) to
 * keep the stored key human-readable for admin browsing - it gets the same
 * sanitiser + suffix treatment as a raw filename.
 */
export function generateUniqueFileName(originalName: string, preferredBase?: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    const dotIdx = originalName.lastIndexOf('.');
    const ext = dotIdx >= 0 ? originalName.slice(dotIdx) : '';
    // Use the preferred base if given, else strip the extension off the original.
    // Either way, strip any trailing extension on the base to avoid "name.pdf-ts-rand.pdf".
    const baseSource = preferredBase ?? (dotIdx >= 0 ? originalName.slice(0, dotIdx) : originalName);
    const base = baseSource
        .replace(/\.[^.]+$/, '')
        .replace(/[^a-zA-Z0-9-_]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase()
        .substring(0, 60) || 'file';
    return `${base}-${timestamp}-${random}${ext}`;
}

export async function uploadFile(
    file: File,
    storagePath: StoragePath,
    customFileName?: string
): Promise<UploadResult> {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        console.error('[uploadFile] Supabase env vars missing', {
            hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        });
        return { success: false, error: 'Document storage is not configured (missing env vars).' };
    }
    try {
        // Always sanitise + uniquify, even when a customFileName is passed.
        // Passing the raw customFileName as a storage key (with spaces, parens,
        // accents, etc.) makes Supabase reject the upload, and an unsuffixed key
        // collides on retry because we use upsert: false.
        const fileName = generateUniqueFileName(file.name, customFileName);
        const filePath = `${storagePath}/${fileName}`;

        console.log(`[uploadFile] Uploading "${fileName}" to bucket "${STORAGE_BUCKET}" at path "${filePath}"`);

        const { data, error } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(filePath, file, { cacheControl: '3600', upsert: false });

        if (error) {
            console.error('[uploadFile] Supabase upload error:', error);
            return { success: false, error: error.message };
        }

        console.log('[uploadFile] Upload success:', data);

        const { data: urlData } = supabase.storage
            .from(STORAGE_BUCKET)
            .getPublicUrl(filePath);

        return { success: true, url: urlData.publicUrl, path: filePath };
    } catch (err) {
        console.error('[uploadFile] Exception during upload:', err);
        return { success: false, error: err instanceof Error ? err.message : 'Upload failed' };
    }
}
