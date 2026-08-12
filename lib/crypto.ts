import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Field-level encryption (AES-256-GCM) for integration credentials - anything
 * we must store but never expose in the clear. The envelope is
 * `v1.<iv>.<tag>.<ciphertext>`, all base64url, so the version and parameters
 * travel with the data.
 *
 * The key comes from `SRS_FIELD_KEY` (base64, 32 bytes). In production a
 * missing key is fatal - we never silently store plaintext. In dev we fall
 * back to an ephemeral per-process key so the flow is exercised without a
 * stable secret; saved credentials won't survive a dev-server restart, which
 * is fine for local testing.
 *
 * Generate a key: `openssl rand -base64 32`
 */
const ALGO = "aes-256-gcm";
const VERSION = "v1";

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
    if (cachedKey) return cachedKey;
    const raw = process.env.SRS_FIELD_KEY;
    if (raw) {
        const key = Buffer.from(raw, "base64");
        if (key.length !== 32)
            throw new Error("SRS_FIELD_KEY must decode to 32 bytes (base64).");
        cachedKey = key;
        return key;
    }
    if (process.env.NODE_ENV === "production")
        throw new Error("SRS_FIELD_KEY is required in production - refusing to store plaintext credentials.");

    cachedKey = randomBytes(32);
    return cachedKey;
}

export function encryptField(plaintext: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv(ALGO, getKey(), iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [VERSION, iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptField(envelope: string): string {
    const parts = envelope.split(".");
    if (parts.length !== 4 || parts[0] !== VERSION)
        throw new Error("Malformed or unsupported ciphertext envelope.");
    const iv = Buffer.from(parts[1], "base64url");
    const tag = Buffer.from(parts[2], "base64url");
    const ciphertext = Buffer.from(parts[3], "base64url");
    const decipher = createDecipheriv(ALGO, getKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
