import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db"; // Your Drizzle instance
import * as schema from "@/lib/db/schema"; // Your Drizzle schema

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg", // or "mysql", "sqlite"
        schema: schema,
    }),
    emailAndPassword: {
        enabled: true,
    },
});
