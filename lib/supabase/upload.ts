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
        return { success: false, error: 'Document storage is not configured.' };
    }
    try {
        const fileName = customFileName || generateUniqueFileName(file.name);
        const filePath = `${storagePath}/${fileName}`;

        const { error } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(filePath, file, { cacheControl: '3600', upsert: false });

        if (error) {
            return { success: false, error: error.message };
        }

        const { data: urlData } = supabase.storage
            .from(STORAGE_BUCKET)
            .getPublicUrl(filePath);

        return { success: true, url: urlData.publicUrl, path: filePath };
    } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Upload failed' };
    }
}
