import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { pgTable, text, timestamp, boolean, integer, pgEnum } from "drizzle-orm/pg-core";
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

export const containerStatusEnum = pgEnum("container_status", [
    "OPEN", "THRESHOLD_REACHED", "BOOKED", "SAILING", "DELIVERED",
]);

export const containerTypeEnum = pgEnum("container_type", ["20FT", "40FT"]);

export const containers = pgTable("containers", {
    id: text("id").primaryKey(),
    route: text("route").notNull(),
    vessel: text("vessel").notNull(),
    voyageNumber: text("voyage_number"),
    sailingScheduleId: text("sailing_schedule_id"),
    type: containerTypeEnum("type").default("40FT").notNull(),
    etd: timestamp("etd"),
    eta: timestamp("eta"),
    totalPallets: integer("total_pallets").default(0).notNull(),
    maxCapacity: integer("max_capacity").default(20).notNull(),
    status: containerStatusEnum("status").default("OPEN").notNull(),
    metashipOrderNo: text("metaship_order_no"),
    metashipReference: text("metaship_reference"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const palletAllocationStatusEnum = pgEnum("pallet_allocation_status", [
    "PENDING", "CONFIRMED", "CANCELLED",
]);

export const palletAllocations = pgTable("pallet_allocations", {
    id: text("id").primaryKey(),
    containerId: text("container_id").notNull(),
    userId: text("user_id").notNull(),
    palletCount: integer("pallet_count").notNull(),
    productId: text("product_id"),
    commodityName: text("commodity_name"),
    hsCode: text("hs_code"),
    nettWeight: text("nett_weight"),
    grossWeight: text("gross_weight"),
    temperature: text("temperature"),
    consigneeName: text("consignee_name"),
    consigneeAddress: text("consignee_address"),
    status: palletAllocationStatusEnum("status").default("PENDING").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// --- DB Connect ---
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema: { user, containers, palletAllocations } });

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
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            console.error(`   ❌ Error: ${errorMessage}`);
        }
    }
    // --- Seed Containers ---
    console.log("\n📦 Seeding containers...");

    // Get the client user ID for allocations
    const clientUsers = await db.select().from(user).where(eq(user.email, "client@srs.com"));
    const clientUserId = clientUsers[0]?.id;

    const seedContainers = [
        {
            id: "CNT-SEED-001",
            route: "ZACPT-NLRTM",
            vessel: "MSC Orchestra",
            voyageNumber: "VO2401",
            type: "40FT" as const,
            etd: new Date("2025-11-15"),
            eta: new Date("2025-12-01"),
            totalPallets: 14,
            maxCapacity: 20,
            status: "OPEN" as const,
        },
        {
            id: "CNT-SEED-002",
            route: "ZACPT-NLRTM",
            vessel: "COSCO Shipping",
            voyageNumber: "VO2402",
            type: "40FT" as const,
            etd: new Date("2025-11-22"),
            eta: new Date("2025-12-08"),
            totalPallets: 0,
            maxCapacity: 20,
            status: "OPEN" as const,
        },
        {
            id: "CNT-SEED-003",
            route: "ZACPT-GBLND",
            vessel: "Atlantic Star",
            voyageNumber: "VO2403",
            type: "40FT" as const,
            etd: new Date("2025-11-18"),
            eta: new Date("2025-12-04"),
            totalPallets: 10,
            maxCapacity: 20,
            status: "OPEN" as const,
        },
        {
            id: "CNT-SEED-004",
            route: "ZADUR-SGSIN",
            vessel: "One Integrity",
            voyageNumber: "VO2404",
            type: "40FT" as const,
            etd: new Date("2025-11-25"),
            eta: new Date("2025-12-15"),
            totalPallets: 0,
            maxCapacity: 20,
            status: "OPEN" as const,
        },
        {
            id: "CNT-SEED-005",
            route: "ZACPT-NLRTM",
            vessel: "Hapag Lloyd Express",
            voyageNumber: "VO2405",
            type: "40FT" as const,
            etd: new Date("2025-12-01"),
            eta: new Date("2025-12-17"),
            totalPallets: 16,
            maxCapacity: 20,
            status: "THRESHOLD_REACHED" as const,
        },
    ];

    for (const containerData of seedContainers) {
        const existing = await db.select().from(containers).where(eq(containers.id, containerData.id));
        if (existing.length === 0) {
            await db.insert(containers).values(containerData);
            console.log(`   ✅ Container ${containerData.id}: ${containerData.route} (${containerData.vessel})`);
        } else {
            console.log(`   ℹ️  Container ${containerData.id} exists.`);
        }
    }

    // --- Seed Pallet Allocations (for pre-filled containers) ---
    if (clientUserId) {
        console.log("\n📋 Seeding pallet allocations...");

        const seedAllocations = [
            {
                id: "ALC-SEED-001",
                containerId: "CNT-SEED-001",
                userId: clientUserId,
                palletCount: 8,
                commodityName: "Fresh Citrus",
                hsCode: "0805.10",
                nettWeight: "8000",
                grossWeight: "8800",
                temperature: "chilled",
                consigneeName: "Rotterdam Fresh Imports",
                consigneeAddress: "Port of Rotterdam, NL",
                status: "PENDING" as const,
            },
            {
                id: "ALC-SEED-002",
                containerId: "CNT-SEED-001",
                userId: clientUserId,
                palletCount: 6,
                commodityName: "Table Grapes",
                hsCode: "0806.10",
                nettWeight: "5400",
                grossWeight: "6000",
                temperature: "chilled",
                consigneeName: "EU Fruits BV",
                consigneeAddress: "Amsterdam, NL",
                status: "PENDING" as const,
            },
            {
                id: "ALC-SEED-003",
                containerId: "CNT-SEED-003",
                userId: clientUserId,
                palletCount: 10,
                commodityName: "Frozen Hake Fillets",
                hsCode: "0304.71",
                nettWeight: "10000",
                grossWeight: "11000",
                temperature: "frozen",
                consigneeName: "UK Seafood Ltd",
                consigneeAddress: "London Gateway, GB",
                status: "PENDING" as const,
            },
            {
                id: "ALC-SEED-004",
                containerId: "CNT-SEED-005",
                userId: clientUserId,
                palletCount: 10,
                commodityName: "Avocados",
                hsCode: "0804.40",
                nettWeight: "9000",
                grossWeight: "10000",
                temperature: "chilled",
                consigneeName: "Fresh Europe GmbH",
                consigneeAddress: "Rotterdam, NL",
                status: "PENDING" as const,
            },
            {
                id: "ALC-SEED-005",
                containerId: "CNT-SEED-005",
                userId: clientUserId,
                palletCount: 6,
                commodityName: "Blueberries",
                hsCode: "0810.40",
                nettWeight: "3600",
                grossWeight: "4200",
                temperature: "chilled",
                consigneeName: "Berry Direct NL",
                consigneeAddress: "Barendrecht, NL",
                status: "PENDING" as const,
            },
        ];

        for (const allocData of seedAllocations) {
            const existing = await db.select().from(palletAllocations).where(eq(palletAllocations.id, allocData.id));
            if (existing.length === 0) {
                await db.insert(palletAllocations).values(allocData);
                console.log(`   ✅ Allocation ${allocData.id}: ${allocData.palletCount} pallets of ${allocData.commodityName}`);
            } else {
                console.log(`   ℹ️  Allocation ${allocData.id} exists.`);
            }
        }
    } else {
        console.log("\n⚠️  No client user found — skipping pallet allocation seeds.");
    }

    console.log("\n✅ Done.");
    process.exit(0);
}

main();
