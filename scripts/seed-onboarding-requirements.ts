/**
 * Seed the initial 7 onboarding requirements.
 * Run once after `npm run db:push`:
 *   npx tsx scripts/seed-onboarding-requirements.ts
 *
 * Idempotent — uses stable ids so re-running is a no-op.
 *
 * NOTE: dotenv must run before lib/db is loaded (the Neon client reads
 * DATABASE_URL at import time). Static imports get hoisted in ESM, so
 * we dynamic-import lib/db inside main() after dotenv.config has run.
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const SEED: Array<{
    id: string;
    name: string;
    description: string;
    required: boolean;
    sortOrder: number;
}> = [
    {
        id: "req-company-reg",
        name: "Company Registration Certificate",
        description: "CIPC certificate or equivalent for your country",
        required: true,
        sortOrder: 10,
    },
    {
        id: "req-proof-of-address",
        name: "Proof of Address",
        description: "Utility bill, lease, or bank statement (last 3 months)",
        required: true,
        sortOrder: 20,
    },
    {
        id: "req-rla-export",
        name: "RLA Export Certificate",
        description: "Registered Letter of Authority for export",
        required: true,
        sortOrder: 30,
    },
    {
        id: "req-tax-clearance",
        name: "Tax Clearance Certificate",
        description: "SARS tax clearance pin or certificate",
        required: true,
        sortOrder: 40,
    },
    {
        id: "req-bank-confirmation",
        name: "Bank Confirmation Letter",
        description: "From your bank, not older than 3 months",
        required: true,
        sortOrder: 50,
    },
    {
        id: "req-director-id",
        name: "Director's ID",
        description: "Copy of ID document for at least one director",
        required: true,
        sortOrder: 60,
    },
    {
        id: "req-vat-cert",
        name: "VAT Certificate",
        description: "Optional — speeds up tax setup",
        required: false,
        sortOrder: 70,
    },
];

async function main() {
    if (!process.env.DATABASE_URL) {
        console.error("[seed] DATABASE_URL not loaded — check .env.local exists at the project root");
        process.exit(1);
    }

    // Lazy-import so dotenv runs before lib/db init
    const { db } = await import("@/lib/db");
    const { onboardingRequirements } = await import("@/lib/db/schema");
    const { eq } = await import("drizzle-orm");

    let inserted = 0;
    let skipped = 0;
    for (const row of SEED) {
        const [existing] = await db
            .select({ id: onboardingRequirements.id })
            .from(onboardingRequirements)
            .where(eq(onboardingRequirements.id, row.id))
            .limit(1);
        if (existing) {
            skipped++;
            continue;
        }
        await db.insert(onboardingRequirements).values({
            ...row,
            active: true,
        });
        inserted++;
    }
    console.log(`[seed] onboarding_requirements: ${inserted} inserted, ${skipped} already existed`);
    process.exit(0);
}

main().catch((err) => {
    console.error("[seed] onboarding-requirements failed", err);
    process.exit(1);
});
