import { supabase, STORAGE_BUCKET, StoragePath } from './client';

export interface UploadResult {
    success: boolean;
    url?: string;
    path?: string;
    error?: string;
}

function generateUniqueFileName(originalName: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    const ext = originalName.slice(originalName.lastIndexOf('.'));
    const base = originalName
        .slice(0, originalName.lastIndexOf('.'))
        .replace(/[^a-zA-Z0-9-_]/g, '-')
        .replace(/-+/g, '-')
        .toLowerCase()
        .substring(0, 60);
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
        const fileName = customFileName || generateUniqueFileName(file.name);
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
