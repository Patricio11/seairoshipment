import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { user, companyDocuments, adminNotifications, onboardingRequirements } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { sendOnboardingSubmittedEmail, sendAdminVettingNotificationEmail } from "@/lib/email";

interface SubmittedDoc {
    /** Stable id of the onboarding_requirements row this upload answers. */
    requirementId: string;
    originalName: string;
    url: string;
    mimeType?: string;
    sizeBytes?: number;
    storedName?: string;
}

type CompanyDocumentType =
    | "COMPANY_REG_CERT"
    | "PROOF_OF_ADDRESS"
    | "RLA_EXPORT_CERT"
    | "BANK_CONFIRMATION"
    | "DIRECTOR_ID"
    | "TAX_CLEARANCE"
    | "VAT_CERT"
    | "OTHER";

/**
 * Map seeded requirement IDs to the legacy `company_documents.type` enum so
 * existing queries keyed on `type` keep working alongside the new
 * requirementId link. Anything custom the admin adds maps to OTHER.
 */
const SEED_TYPE_MAP: Record<string, CompanyDocumentType> = {
    "req-company-reg": "COMPANY_REG_CERT",
    "req-proof-of-address": "PROOF_OF_ADDRESS",
    "req-rla-export": "RLA_EXPORT_CERT",
    "req-tax-clearance": "TAX_CLEARANCE",
    "req-bank-confirmation": "BANK_CONFIRMATION",
    "req-director-id": "DIRECTOR_ID",
    "req-vat-cert": "VAT_CERT",
};

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

        // Active requirements drive the form. Inactive ones are never returned —
        // existing in-flight users still see their previously-uploaded docs via
        // the documents array (which carries the original requirementId).
        const requirements = await db
            .select()
            .from(onboardingRequirements)
            .where(eq(onboardingRequirements.active, true))
            .orderBy(asc(onboardingRequirements.sortOrder));

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
            requirements: requirements.map(r => ({
                id: r.id,
                name: r.name,
                description: r.description,
                templateUrl: r.templateUrl,
                templateOriginalName: r.templateOriginalName,
                templateMimeType: r.templateMimeType,
                templateSizeBytes: r.templateSizeBytes,
                required: r.required,
                sortOrder: r.sortOrder,
            })),
            documents: docs.map(d => ({
                id: d.id,
                type: d.type,
                requirementId: d.requirementId,
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

        // Validate uploaded documents against the active requirement set.
        // Every active+required requirement must have a matching upload by requirementId.
        const docs = Array.isArray(documents) ? documents : [];
        const activeRequirements = await db
            .select()
            .from(onboardingRequirements)
            .where(eq(onboardingRequirements.active, true));

        const submittedReqIds = new Set(
            docs
                .filter(d => typeof d.url === "string" && d.url && typeof d.requirementId === "string")
                .map(d => d.requirementId),
        );
        for (const r of activeRequirements) {
            if (r.required && !submittedReqIds.has(r.id)) {
                errors.push(`${r.name} is required`);
            }
        }

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
            .filter(d => typeof d.url === "string" && d.url && typeof d.requirementId === "string")
            .map(d => ({
                id: `CDOC-${nanoid(10)}`,
                userId: row.id,
                requirementId: d.requirementId,
                type: SEED_TYPE_MAP[d.requirementId] ?? "OTHER",
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

        // Notify admin by email too — in-app notification fires above, this is the
        // out-of-band nudge so admins don't miss submissions when not logged in.
        try {
            await sendAdminVettingNotificationEmail({
                companyName: companyName!.trim(),
                contactName: row.name,
                contactEmail: row.email,
                userId: row.id,
                submittedAt: new Date(),
            });
        } catch (mailErr) {
            console.warn("[onboarding] admin notification email failed", mailErr);
        }

        return NextResponse.json({ success: true, status: "PENDING_REVIEW" });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to submit onboarding";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
