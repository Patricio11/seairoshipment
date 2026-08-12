import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { INTEGRATIONS } from "@/lib/integrations";
import { getIntegrationStatus } from "@/lib/integrations-server";

/** Safe status list for the Integrations console - never returns credentials. */
export async function GET() {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const statuses = await Promise.all(
            INTEGRATIONS.map(async (meta) => {
                const status = await getIntegrationStatus(meta.key);
                return { key: meta.key, ...status };
            })
        );

        return NextResponse.json({ statuses });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load integrations";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
