import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { integrationByKey } from "@/lib/integrations";
import { getIntegration } from "@/lib/integrations-server";

/**
 * Test an integration's credentials against the live provider BEFORE saving.
 * Submitted values win; blank fields fall back to what's stored so an admin
 * can re-test without re-pasting secrets.
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
        const submitted: Record<string, unknown> = body.creds && typeof body.creds === "object" ? body.creds : {};
        const existing = (await getIntegration(meta.key))?.creds ?? {};
        const creds: Record<string, string> = {};
        for (const field of meta.fields) {
            const provided = typeof submitted[field.name] === "string" ? (submitted[field.name] as string).trim() : "";
            creds[field.name] = provided || existing[field.name] || "";
        }

        const result = await testIntegration(meta.key, creds);
        return NextResponse.json(result);
    } catch (err) {
        const message = err instanceof Error ? err.message : "Test failed";
        return NextResponse.json({ ok: false, detail: message });
    }
}

async function testIntegration(key: string, creds: Record<string, string>): Promise<{ ok: boolean; detail: string }> {
    if (key === "google_maps") {
        if (!creds.apiKey) return { ok: false, detail: "Enter the Maps API key." };
        try {
            // Geocoding is the cheapest universal probe - a valid key returns
            // status OK (or ZERO_RESULTS); an invalid key returns REQUEST_DENIED.
            const res = await fetch(
                `https://maps.googleapis.com/maps/api/geocode/json?address=Cape%20Town&key=${encodeURIComponent(creds.apiKey)}`
            );
            const data = await res.json();
            if (data.status === "OK" || data.status === "ZERO_RESULTS") return { ok: true, detail: "Connected to Google Maps." };
            if (data.status === "REQUEST_DENIED") return { ok: false, detail: data.error_message || "Key rejected - check the API key + enabled APIs." };
            return { ok: false, detail: `Google returned ${data.status}.` };
        } catch (e) {
            return { ok: false, detail: e instanceof Error ? e.message : "Could not reach Google Maps." };
        }
    }

    if (key === "resend") {
        if (!creds.apiKey) return { ok: false, detail: "Enter the Resend API key." };
        try {
            const res = await fetch("https://api.resend.com/domains", {
                headers: { Authorization: `Bearer ${creds.apiKey}` },
            });
            if (res.ok) return { ok: true, detail: "Connected to Resend." };
            if (res.status === 401) return { ok: false, detail: "API key rejected." };
            return { ok: false, detail: `Resend returned ${res.status}.` };
        } catch (e) {
            return { ok: false, detail: e instanceof Error ? e.message : "Could not reach Resend." };
        }
    }

    if (key === "whatsapp") {
        if (!creds.accessToken || !creds.phoneNumberId) {
            return { ok: false, detail: "Enter the access token and phone number ID." };
        }
        try {
            const res = await fetch(
                `https://graph.facebook.com/v21.0/${encodeURIComponent(creds.phoneNumberId)}?fields=display_phone_number,verified_name`,
                { headers: { Authorization: `Bearer ${creds.accessToken}` } }
            );
            const data = await res.json();
            if (res.ok && data.display_phone_number) {
                return { ok: true, detail: `Connected - ${data.verified_name || "business"} (${data.display_phone_number}).` };
            }
            if (res.status === 401 || data.error?.code === 190) return { ok: false, detail: "Access token rejected." };
            return { ok: false, detail: data.error?.message || `WhatsApp returned ${res.status}.` };
        } catch (e) {
            return { ok: false, detail: e instanceof Error ? e.message : "Could not reach the WhatsApp API." };
        }
    }

    return { ok: false, detail: "Unknown integration." };
}
