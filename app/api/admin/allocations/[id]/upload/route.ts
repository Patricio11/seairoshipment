import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { documents, palletAllocations, user as userTable } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { createClient } from "@supabase/supabase-js";
import { generateUniqueFileName } from "@/lib/supabase";

const BUCKET = "srs-documents";
const STORAGE_PATH = "bookings/documents";

/**
 * Admin-side file upload for a client allocation. Same shape as the client
 * route at /api/bookings/[allocationId]/upload, but:
 *   - requireAdmin instead of allocation-ownership check (admin acts on behalf
 *     of any client)
 *   - the documents row is tagged `source: "ADMIN_UPLOAD"` so the UI can
 *     surface it distinctly from client-uploaded docs
 *   - userId on the document points at the *client* who owns the allocation
 *     (so when the client opens their booking they see the admin-uploaded doc
 *     as one of their own); a separate column would be needed if we ever want
 *     to record *which admin* uploaded
 *
 * Uses the Supabase service-role key, bypassing storage RLS.
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await requireAdmin();
        if (auth.error) return auth.error;

        const { id: allocationId } = await params;

        // Verify the allocation exists; admin doesn't need to own it.
        const [allocation] = await db
            .select()
            .from(palletAllocations)
            .where(eq(palletAllocations.id, allocationId))
            .limit(1);

        if (!allocation) {
            return NextResponse.json({ error: "Allocation not found" }, { status: 404 });
        }

        // Look up the client's account number for filename prefix so the
        // stored key looks identical to a client-side upload — useful for
        // MetaShip account-prefix matching downstream.
        const [clientUser] = await db
            .select({ accountNumber: userTable.accountNumber })
            .from(userTable)
            .where(eq(userTable.id, allocation.userId))
            .limit(1);

        const accountPrefix = clientUser?.accountNumber || "UNVERIFIED";

        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const type = (formData.get("type") as string) || "OTHER";
        const documentCode = (formData.get("documentCode") as string) || null;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // Prefer service-role key (bypasses storage RLS); fall back to anon
        // key when only that's set. Anon path requires an INSERT-for-anon
        // policy on the srs-documents bucket.
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        const key = serviceKey || anonKey;

        if (!url || !key) {
            return NextResponse.json(
                { error: "Supabase is not configured on the server" },
                { status: 500 }
            );
        }

        const supabase = createClient(url, key, { auth: { persistSession: false } });

        const validTypes = ["INVOICE", "BOL", "COA", "PACKING_LIST", "OTHER"] as const;
        const docType = (validTypes.includes(type as typeof validTypes[number]) ? type : "OTHER") as "INVOICE" | "BOL" | "COA" | "PACKING_LIST" | "OTHER";

        const prefixedName = `${accountPrefix}_${file.name}`;
        const safeKey = generateUniqueFileName(file.name, prefixedName);
        const filePath = `${STORAGE_PATH}/${safeKey}`;

        const arrayBuffer = await file.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);

        const { error: uploadErr } = await supabase.storage
            .from(BUCKET)
            .upload(filePath, buffer, {
                cacheControl: "3600",
                upsert: false,
                contentType: file.type || "application/octet-stream",
            });

        if (uploadErr) {
            console.error("[admin upload] Supabase upload failed:", uploadErr);
            return NextResponse.json(
                { error: `Upload failed: ${uploadErr.message}` },
                { status: 500 }
            );
        }

        const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filePath);

        const docId = `DOC-${nanoid(10)}`;
        await db.insert(documents).values({
            id: docId,
            allocationId,
            // userId on the doc row stays the *client's* userId — the doc
            // belongs to their booking. The source enum is what flags it as
            // admin-uploaded.
            userId: allocation.userId,
            originalName: prefixedName,
            storedName: filePath,
            type: docType,
            documentCode,
            url: urlData.publicUrl,
            source: "ADMIN_UPLOAD",
            mimeType: file.type || null,
            sizeBytes: file.size,
            status: "PENDING",
        });

        return NextResponse.json({
            id: docId,
            name: prefixedName,
            url: urlData.publicUrl,
            path: filePath,
            source: "ADMIN_UPLOAD",
        }, { status: 201 });
    } catch (err: unknown) {
        console.error("[admin upload] Exception:", err);
        const message = err instanceof Error ? err.message : "Upload failed";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
