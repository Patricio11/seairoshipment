import { db } from "../lib/db";
import { user } from "../lib/db/schema";
import { eq } from "drizzle-orm";
import * as dotenv from "dotenv";

// Load from root .env.local
dotenv.config({ path: ".env.local" });

const seedUsers = [
    {
        name: "Admin User",
        email: "admin@srs.com",
        password: "password123",
        role: "admin",
        isVetted: true,
        accountNumber: "SRS-ADMIN-001"
    },
    {
        name: "Test Client",
        email: "client@srs.com",
        password: "password123",
        role: "client",
        isVetted: true,
        accountNumber: "SRS-CLI-001",
        companyName: "Global Fruits",
        companyReg: "2024/001"
    }
];

async function main() {
    console.log("🌱 Starting seed via scripts/seed.ts...");
    const baseURL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
    console.log(`🔗 API Base URL: ${baseURL}`);

    for (const userData of seedUsers) {
        console.log(`\n👤 Checking: ${userData.email}`);

        try {
            const existing = await db.select().from(user).where(eq(user.email, userData.email));

            if (existing.length === 0) {
                console.log(`   🔸 Creating via API...`);
                // Use API for creation (Auth)
                const res = await fetch(`${baseURL}/api/auth/sign-up/email`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: userData.email,
                        password: userData.password,
                        name: userData.name,
                    }),
                });

                if (!res.ok) {
                    const txt = await res.text();
                    console.error(`   ❌ Failed: ${res.status} ${txt}`);
                    continue;
                }

                console.log(`   ✅ API Success.`);

                // Update DB for roles
                console.log(`   🔸 Updating User Details in DB...`);
                await db.update(user).set({
                    role: userData.role as "admin" | "client",
                    isVetted: userData.isVetted,
                    accountNumber: userData.accountNumber,
                    companyName: userData.companyName,
                    companyReg: userData.companyReg,
                    emailVerified: true
                }).where(eq(user.email, userData.email));
                console.log(`   ✅ DB Updated.`);
            } else {
                console.log(`   ℹ️  Exists.`);
            }
        } catch (err: any) {
            console.error(`   ❌ Exception: ${err.message}`);
        }
    }
    console.log("\n✅ Done.");
    process.exit(0);
}

main();
