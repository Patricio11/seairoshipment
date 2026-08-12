/**
 * Catalogue of the platform's external integrations, shown in the admin
 * Integrations console (/admin/integrations). Server-safe data (no icons)
 * so it's importable from both the page and the API routes.
 *
 * Pattern mirrors the Philasa build: credentials live encrypted in the
 * `integrations` table (lib/crypto.ts), per-provider save/test endpoints,
 * an enabled switch, and features that stay dormant until switched on.
 */
export type IntegrationKey = "google_maps" | "resend" | "whatsapp";

export interface IntegrationMeta {
    key: IntegrationKey;
    name: string;
    category: string;
    description: string;
    /** Credential fields rendered in the config dialog. `secret` fields show
     *  a "blank keeps the stored value" hint and never echo back. */
    fields: Array<{ name: string; label: string; secret?: boolean; placeholder?: string }>;
}

export const INTEGRATIONS: IntegrationMeta[] = [
    {
        key: "google_maps",
        name: "Google Maps",
        category: "Maps",
        description: "Places autocomplete + map pins for road freight collection & delivery addresses.",
        fields: [
            { name: "apiKey", label: "Maps API Key", secret: true, placeholder: "AIza…" },
        ],
    },
    {
        key: "resend",
        name: "Resend",
        category: "Email",
        description: "Send platform email (verification, invoices, booking updates) through Resend instead of SMTP.",
        fields: [
            { name: "apiKey", label: "API Key", secret: true, placeholder: "re_…" },
            { name: "from", label: "From address", placeholder: "Seairo Cargo <noreply@seairo.com>" },
        ],
    },
    {
        key: "whatsapp",
        name: "WhatsApp Business",
        category: "Messaging",
        description: "Truck progress updates to customers over the WhatsApp Business Cloud API.",
        fields: [
            { name: "accessToken", label: "Access Token", secret: true, placeholder: "EAAG…" },
            { name: "phoneNumberId", label: "Phone Number ID", placeholder: "1234567890" },
        ],
    },
];

export function integrationByKey(key: string): IntegrationMeta | undefined {
    return INTEGRATIONS.find(i => i.key === key);
}
