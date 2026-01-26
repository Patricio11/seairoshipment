import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { headers } from "next/headers";
import { cache } from "react";
import { redirect } from "next/navigation";

export const auth = betterAuth({
    baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    database: drizzleAdapter(db, {
        provider: "pg",
        schema: {
            user: schema.user,
            session: schema.session,
            account: schema.account,
            verification: schema.verification
        },
    }),
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: true,
    },
    emailVerification: {
        sendOnSignUp: true,
        autoSignInAfterVerification: true,
        sendVerificationEmail: async ({ user, url }) => {
            console.log("---- MOCK EMAIL SERVICE ----");
            console.log(`To: ${user.email}`);
            console.log(`Subject: Verify your email`);
            console.log(`Link: ${url}`);
            console.log("----------------------------");
        }
    },
    user: {
        additionalFields: {
            role: {
                type: "string",
                required: false,
                defaultValue: "client",
            },
            isVetted: {
                type: "boolean",
                required: false,
                defaultValue: false,
            },
        },
    },
});

export const getSession = cache(async () => {
    const session = await auth.api.getSession({
        headers: await headers()
    });
    return session;
});

/**
 * Require authentication - redirects to home if not authenticated
 */
export async function requireAuth() {
    const session = await getSession();
    if (!session) {
        redirect("/");
    }
    return session;
}

/**
 * Require specific role - redirects to dashboard if role doesn't match
 */
export async function requireRole(allowedRoles: Array<"admin" | "client">) {
    const session = await requireAuth();
    const userRole = session.user.role as "admin" | "client";

    if (!allowedRoles.includes(userRole)) {
        redirect("/dashboard");
    }
    return session;
}

/**
 * Get user role from session
 */
export async function getUserRole() {
    const session = await getSession();
    if (!session) return null;
    return session.user.role as "admin" | "client" | null;
}
