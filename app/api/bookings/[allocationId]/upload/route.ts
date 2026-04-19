import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { documents, palletAllocations, user as userTable } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "srs-documents";
const STORAGE_PATH = "bookings/documents";

/**
 * Server-side file upload endpoint.
 * Receives a multipart/form-data POST with the file, uploads to Supabase using the
 * service role key (bypasses RLS), then saves the document record.
 *
 * Falls back to anon key if SUPABASE_SERVICE_ROLE_KEY is not set.
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ allocationId: string }> }
) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { allocationId } = await params;

        // Verify the allocation belongs to this user
        const [allocation] = await db
            .select()
            .from(palletAllocations)
            .where(eq(palletAllocations.id, allocationId))
            .limit(1);

        if (!allocation || allocation.userId !== session.user.id) {
            return NextResponse.json({ error: "Allocation not found" }, { status: 404 });
        }

        // Lookup account number for filename prefix
        const [dbUser] = await db
            .select({ accountNumber: userTable.accountNumber })
            .from(userTable)
            .where(eq(userTable.id, session.user.id))
            .limit(1);

        const accountPrefix = dbUser?.accountNumber || "UNVERIFIED";

        // Parse multipart form
        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const type = (formData.get("type") as string) || "OTHER";
        const documentCode = (formData.get("documentCode") as string) || null;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // Check Supabase env
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

        // Validate type against document enum
        const validTypes = ["INVOICE", "BOL", "COA", "PACKING_LIST", "OTHER"] as const;
        const docType = (validTypes.includes(type as typeof validTypes[number]) ? type : "OTHER") as "INVOICE" | "BOL" | "COA" | "PACKING_LIST" | "OTHER";

        const prefixedName = `${accountPrefix}_${file.name}`;
        const filePath = `${STORAGE_PATH}/${prefixedName}`;

        // Convert file to ArrayBuffer for upload
        const arrayBuffer = await file.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);

        const { error: uploadErr } = await supabase.storage
            .from(BUCKET)
            .upload(filePath, buffer, {
                cacheControl: "3600",
                upsert: true,
                contentType: file.type || "application/octet-stream",
            });

        if (uploadErr) {
            console.error("[upload] Supabase upload failed:", uploadErr);
            return NextResponse.json(
                { error: `Upload failed: ${uploadErr.message}` },
                { status: 500 }
            );
        }

        const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filePath);

        // Save document record
        const docId = `DOC-${nanoid(10)}`;
        await db.insert(documents).values({
            id: docId,
            allocationId,
            userId: session.user.id,
            originalName: prefixedName,
            storedName: filePath,
            type: docType,
            documentCode,
            url: urlData.publicUrl,
            status: "PENDING",
        });

        return NextResponse.json({
            id: docId,
            name: prefixedName,
            url: urlData.publicUrl,
            path: filePath,
        }, { status: 201 });
    } catch (err: unknown) {
        console.error("[upload] Exception:", err);
        const message = err instanceof Error ? err.message : "Upload failed";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
