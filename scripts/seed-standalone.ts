import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { pgTable, text, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";
import { eq } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// --- Schema Definitions (Inline) ---
export const roleEnum = pgEnum("role", ["admin", "client"]);

export const user = pgTable("user", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("emailVerified").notNull(),
    image: text("image"),
    createdAt: timestamp("createdAt").notNull(),
    updatedAt: timestamp("updatedAt").notNull(),
    role: roleEnum("role").default("client").notNull(),
    isVetted: boolean("isVetted").default(false).notNull(),
    accountNumber: text("accountNumber"),
    companyName: text("companyName"),
    companyReg: text("companyReg"),
});

// --- DB Connect ---
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema: { user } });

// --- Seed Logic ---
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
    console.log("🌱 Starting seed (Standalone)...");
    const baseURL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
    console.log(`🔗 API: ${baseURL}`);

    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL is missing!");
    }

    for (const userData of seedUsers) {
        console.log(`\n👤 User: ${userData.email}`);

        try {
            const existing = await db.select().from(user).where(eq(user.email, userData.email));

            if (existing.length === 0) {
                console.log(`   🔸 Creating via API...`);
                const res = await fetch(`${baseURL}/api/auth/sign-up/email`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Origin': baseURL
                    },
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

                console.log(`   🔸 Updating DB...`);
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
            console.error(`   ❌ Error: ${err.message}`);
        }
    }
    console.log("\n✅ Done.");
    process.exit(0);
}

main();
