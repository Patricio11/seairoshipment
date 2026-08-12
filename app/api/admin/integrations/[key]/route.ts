import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { integrationByKey } from "@/lib/integrations";
import { getIntegration, saveIntegration } from "@/lib/integrations-server";

/**
 * Save an integration's credentials + enabled flag.
 *
 * Blank secret fields keep the stored value, so an admin can toggle the
 * enabled switch without re-pasting keys. Enabling requires every declared
 * field to be present (submitted or stored).
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ key: string }> }
) {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const { key } = await params;
        const meta = integrationByKey(key);
        if (!meta) return NextResponse.json({ error: "Unknown integration" }, { status: 404 });

        const body = await request.json().catch(() => ({}));
        const enabled = Boolean(body.enabled);
        const submitted: Record<string, unknown> = body.creds && typeof body.creds === "object" ? body.creds : {};

        const existing = (await getIntegration(meta.key))?.creds ?? {};
        const merged: Record<string, string> = {};
        for (const field of meta.fields) {
            const provided = typeof submitted[field.name] === "string" ? (submitted[field.name] as string).trim() : "";
            // Blank keeps the stored value (critical for secrets that never echo back)
            merged[field.name] = provided || existing[field.name] || "";
        }

        if (enabled) {
            const missing = meta.fields.filter(f => !merged[f.name]);
            if (missing.length > 0) {
                return NextResponse.json(
                    { error: `Add ${missing.map(f => f.label).join(" + ")} before switching it on.` },
                    { status: 400 }
                );
            }
        }

        await saveIntegration(meta.key, merged, enabled);
        return NextResponse.json({ success: true });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to save integration";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
