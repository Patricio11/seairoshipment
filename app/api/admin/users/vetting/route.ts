import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { user, companyDocuments, onboardingRequirements } from "@/lib/db/schema";
import { desc, eq, inArray } from "drizzle-orm";

/**
 * Admin-only list of client users grouped by their vetting state.
 * Returns the company info + uploaded documents needed to render the
 * Review Modal without a second round-trip.
 */
export async function GET() {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const rows = await db
            .select({
                id: user.id,
                name: user.name,
                email: user.email,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
                accountNumber: user.accountNumber,
                companyName: user.companyName,
                companyReg: user.companyReg,
                companyAddress: user.companyAddress,
                companyCountry: user.companyCountry,
                vatNumber: user.vatNumber,
                vettingStatus: user.vettingStatus,
                vettingRejectionReason: user.vettingRejectionReason,
                vettingAdminNote: user.vettingAdminNote,
                vettingReviewedAt: user.vettingReviewedAt,
                vettingReviewedBy: user.vettingReviewedBy,
                emailVerified: user.emailVerified,
            })
            .from(user)
            .where(eq(user.role, "client"))
            .orderBy(desc(user.updatedAt));

        // Pull every document for the visible users in one query
        const userIds = rows.map(r => r.id);
        const docs = userIds.length > 0
            ? await db.select().from(companyDocuments).where(inArray(companyDocuments.userId, userIds))
            : [];

        // Resolve requirement names for the docs that have a requirementId.
        // Inactive rows are included on purpose — old uploads may reference
        // requirements that an admin has since hidden, and we still want a
        // meaningful label rather than the legacy enum.
        const reqIds = Array.from(new Set(docs.map(d => d.requirementId).filter((id): id is string => !!id)));
        const requirements = reqIds.length > 0
            ? await db.select({ id: onboardingRequirements.id, name: onboardingRequirements.name })
                .from(onboardingRequirements)
                .where(inArray(onboardingRequirements.id, reqIds))
            : [];
        const requirementNameById = new Map(requirements.map(r => [r.id, r.name]));

        const docsByUser = new Map<string, typeof docs>();
        for (const d of docs) {
            const list = docsByUser.get(d.userId) ?? [];
            list.push(d);
            docsByUser.set(d.userId, list);
        }

        const users = rows.map(r => ({
            ...r,
            documents: (docsByUser.get(r.id) ?? []).map(d => ({
                id: d.id,
                type: d.type,
                requirementId: d.requirementId,
                requirementName: d.requirementId ? requirementNameById.get(d.requirementId) ?? null : null,
                originalName: d.originalName,
                url: d.url,
                mimeType: d.mimeType,
                sizeBytes: d.sizeBytes,
                uploadedAt: d.uploadedAt,
            })),
        }));

        return NextResponse.json({ users });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load vetting queue";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
