import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        const bucketName = "srs-documents";

        const checks: Record<string, unknown> = {
            envVars: {
                NEXT_PUBLIC_SUPABASE_URL: !!url,
                NEXT_PUBLIC_SUPABASE_ANON_KEY: !!anonKey,
                SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
            },
            bucket: bucketName,
        };

        if (!url || !anonKey) {
            checks.status = "MISSING_ENV";
            checks.message = "Supabase env vars are not set. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.";
            return NextResponse.json(checks, { status: 500 });
        }

        const supabase = createClient(url, anonKey, { auth: { persistSession: false } });

        // Check if bucket exists
        const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
        if (listErr) {
            checks.status = "LIST_BUCKETS_FAILED";
            checks.listBucketsError = listErr.message;
            return NextResponse.json(checks, { status: 500 });
        }

        checks.allBuckets = buckets?.map(b => ({ name: b.name, public: b.public })) || [];

        const targetBucket = buckets?.find(b => b.name === bucketName);
        if (!targetBucket) {
            checks.status = "BUCKET_NOT_FOUND";
            checks.message = `Bucket "${bucketName}" does not exist. Create it in your Supabase dashboard → Storage.`;
            return NextResponse.json(checks, { status: 404 });
        }

        checks.bucketInfo = { public: targetBucket.public };

        // Try uploading a small test file to verify permissions
        const testPath = `_diagnostic/test-${Date.now()}.txt`;
        const testContent = new Blob(["diagnostic test"], { type: "text/plain" });
        const { error: uploadErr } = await supabase.storage
            .from(bucketName)
            .upload(testPath, testContent, { upsert: true });

        if (uploadErr) {
            checks.status = "UPLOAD_BLOCKED";
            checks.uploadError = uploadErr.message;
            checks.message = "Anon key cannot upload to this bucket. Either make the bucket public, or add an RLS policy allowing INSERT for the anon role.";
            return NextResponse.json(checks, { status: 403 });
        }

        // Clean up test file
        await supabase.storage.from(bucketName).remove([testPath]);

        checks.status = "OK";
        checks.message = `All checks passed. Bucket "${bucketName}" is reachable and uploads work.`;
        return NextResponse.json(checks);
    } catch (err) {
        return NextResponse.json(
            { status: "EXCEPTION", error: err instanceof Error ? err.message : "Unknown error" },
            { status: 500 }
        );
    }
}
