import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { integrations } from "@/lib/db/schema";
import { encryptField, decryptField } from "@/lib/crypto";

/**
 * Server-side access to integration credentials. Mirrors the Philasa
 * platform-integrations queries: decrypted creds never leave the server,
 * the UI only ever sees { enabled, configured }.
 */

/** Decrypted credentials + enabled flag. Server-only. */
export async function getIntegration(key: string): Promise<{ enabled: boolean; creds: Record<string, string> } | null> {
    const [row] = await db.select().from(integrations).where(eq(integrations.key, key)).limit(1);
    if (!row) return null;
    let creds: Record<string, string> = {};
    if (row.credentialsEnc) {
        try { creds = JSON.parse(decryptField(row.credentialsEnc)) as Record<string, string>; } catch { creds = {}; }
    }
    return { enabled: row.enabled, creds };
}

/** Decrypted creds only when the integration is configured AND switched on. */
export async function getEnabledIntegration(key: string): Promise<Record<string, string> | null> {
    const it = await getIntegration(key);
    if (!it || !it.enabled) return null;
    return it.creds;
}

/** Safe status for the UI - never exposes the credentials. */
export async function getIntegrationStatus(key: string): Promise<{ enabled: boolean; configured: boolean }> {
    const [row] = await db
        .select({ enabled: integrations.enabled, enc: integrations.credentialsEnc })
        .from(integrations)
        .where(eq(integrations.key, key))
        .limit(1);
    if (!row) return { enabled: false, configured: false };
    return { enabled: row.enabled, configured: Boolean(row.enc) };
}

export async function saveIntegration(key: string, creds: Record<string, string>, enabled: boolean): Promise<void> {
    const enc = encryptField(JSON.stringify(creds));
    const now = new Date();
    await db.insert(integrations).values({ key, credentialsEnc: enc, enabled, updatedAt: now })
        .onConflictDoUpdate({ target: integrations.key, set: { credentialsEnc: enc, enabled, updatedAt: now } });
}
