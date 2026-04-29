import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { user, companyDocuments, adminNotifications } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { sendOnboardingSubmittedEmail } from "@/lib/email";

interface SubmittedDoc {
    type: "COMPANY_REG_CERT" | "PROOF_OF_ADDRESS" | "VAT_CERT" | "OTHER";
    originalName: string;
    url: string;
    mimeType?: string;
    sizeBytes?: number;
    storedName?: string;
}

/**
 * Fetch the current user's onboarding state. Page renders a different sub-view
 * depending on `status`:
 *   EMAIL_PENDING       — verify-email holding screen
 *   ONBOARDING_PENDING  — show the form (pre-fill from user row + companyName from signup)
 *   PENDING_REVIEW      — application-under-review screen
 *   APPROVED            — auto-redirect to /dashboard
 *   REJECTED            — read-only rejection screen with reason
 *
 * Lazy-bumps EMAIL_PENDING → ONBOARDING_PENDING the first time a verified user
 * hits this endpoint, so we don't depend on the verify-page flow being updated.
 */
export async function GET() {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const [row] = await db
            .select()
            .from(user)
            .where(eq(user.id, session.user.id))
            .limit(1);

        if (!row) return NextResponse.json({ error: "User not found" }, { status: 404 });

        let status = row.vettingStatus;
        if (status === "EMAIL_PENDING" && row.emailVerified) {
            await db
                .update(user)
                .set({ vettingStatus: "ONBOARDING_PENDING", updatedAt: new Date() })
                .where(eq(user.id, row.id));
            status = "ONBOARDING_PENDING";
        }

        const docs = await db
            .select()
            .from(companyDocuments)
            .where(eq(companyDocuments.userId, row.id));

        return NextResponse.json({
            status,
            email: row.email,
            emailVerified: row.emailVerified,
            accountNumber: row.accountNumber,
            fields: {
                companyName: row.companyName ?? "",
                companyReg: row.companyReg ?? "",
                companyAddress: row.companyAddress ?? "",
                companyCountry: row.companyCountry ?? "",
                vatNumber: row.vatNumber ?? "",
            },
            rejectionReason: row.vettingRejectionReason,
            adminNote: row.vettingAdminNote,
            documents: docs.map(d => ({
                id: d.id,
                type: d.type,
                originalName: d.originalName,
                url: d.url,
                uploadedAt: d.uploadedAt,
            })),
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load onboarding state";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

/**
 * Submit (or re-submit) the onboarding form. Allowed when the user is in
 * ONBOARDING_PENDING (fresh or admin-reopened). Rejected when already in
 * PENDING_REVIEW / APPROVED / REJECTED — those have their own paths.
 */
export async function POST(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const {
            companyName,
            companyReg,
            companyAddress,
            companyCountry,
            vatNumber,
            documents,
        } = body as {
            companyName?: string;
            companyReg?: string;
            companyAddress?: string;
            companyCountry?: string;
            vatNumber?: string;
            documents?: SubmittedDoc[];
        };

        const [row] = await db
            .select()
            .from(user)
            .where(eq(user.id, session.user.id))
            .limit(1);

        if (!row) return NextResponse.json({ error: "User not found" }, { status: 404 });
        if (!row.emailVerified) {
            return NextResponse.json(
                { error: "Verify your email before submitting your onboarding application." },
                { status: 400 }
            );
        }
        if (row.vettingStatus !== "ONBOARDING_PENDING") {
            return NextResponse.json(
                { error: `Onboarding cannot be submitted in current state (${row.vettingStatus}).` },
                { status: 400 }
            );
        }

        // Validate text fields
        const errors: string[] = [];
        if (!companyName?.trim()) errors.push("Legal company name is required");
        if (!companyReg?.trim()) errors.push("Company registration number is required");
        if (!companyAddress?.trim()) errors.push("Physical address is required");
        if (!companyCountry?.trim() || companyCountry.length !== 2) errors.push("Country must be a 2-letter ISO code");

        // Documents — require at least one COMPANY_REG_CERT and one PROOF_OF_ADDRESS
        const docs = Array.isArray(documents) ? documents : [];
        const hasReg = docs.some(d => d.type === "COMPANY_REG_CERT" && typeof d.url === "string" && d.url);
        const hasPoA = docs.some(d => d.type === "PROOF_OF_ADDRESS" && typeof d.url === "string" && d.url);
        if (!hasReg) errors.push("Company registration certificate is required");
        if (!hasPoA) errors.push("Proof of address is required");

        if (errors.length > 0) {
            return NextResponse.json({ error: errors.join("; ") }, { status: 400 });
        }

        // Persist user fields + flip status
        await db
            .update(user)
            .set({
                companyName: companyName!.trim(),
                companyReg: companyReg!.trim(),
                companyAddress: companyAddress!.trim(),
                companyCountry: companyCountry!.trim().toUpperCase(),
                vatNumber: vatNumber?.trim() || null,
                vettingStatus: "PENDING_REVIEW",
                vettingAdminNote: null, // clear any prior admin note when re-submitting
                updatedAt: new Date(),
            })
            .where(eq(user.id, row.id));

        // Replace existing onboarding documents with the latest set so resubmit doesn't pile up duplicates
        await db.delete(companyDocuments).where(eq(companyDocuments.userId, row.id));

        const docInserts = docs
            .filter(d => typeof d.url === "string" && d.url)
            .map(d => ({
                id: `CDOC-${nanoid(10)}`,
                userId: row.id,
                type: d.type,
                originalName: d.originalName ?? "untitled",
                storedName: d.storedName ?? null,
                url: d.url,
                mimeType: d.mimeType ?? null,
                sizeBytes: typeof d.sizeBytes === "number" ? d.sizeBytes : null,
            }));
        if (docInserts.length > 0) {
            await db.insert(companyDocuments).values(docInserts);
        }

        // Notify admin
        await db.insert(adminNotifications).values({
            id: `NTF-${nanoid(10)}`,
            type: "DOCUMENT_UPLOADED",
            title: "New Onboarding Submission",
            message: `${companyName} (${row.email}) submitted onboarding for review.`,
            isRead: false,
        });

        // Confirm submission to the client (best-effort — email failures shouldn't fail the request)
        try {
            await sendOnboardingSubmittedEmail(row.email, companyName!.trim());
        } catch (mailErr) {
            console.warn("[onboarding] confirmation email failed", mailErr);
        }

        return NextResponse.json({ success: true, status: "PENDING_REVIEW" });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to submit onboarding";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
