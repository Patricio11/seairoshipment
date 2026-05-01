import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { and, asc, eq, isNotNull } from "drizzle-orm";
import { headers } from "next/headers";
import { cache } from "react";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { sendVerificationEmail, sendPasswordResetEmail, type VerificationTemplate } from "@/lib/email";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const auth = betterAuth({
    baseURL: appUrl,
    trustedOrigins: [appUrl, "http://localhost:3000", "http://localhost:3001"],
    database: drizzleAdapter(db, {
        provider: "pg",
        schema: {
            user: schema.user,
            session: schema.session,
            account: schema.account,
            verification: schema.verification
        },
    }),
    session: {
        expiresIn: 60 * 60 * 24 * 30, // 30 days
        updateAge: 60 * 60 * 4, // refresh session every 4 hours
        cookieCache: {
            enabled: true,
            maxAge: 5 * 60, // 5 minutes — reduces DB lookups
        },
    },
    databaseHooks: {
        user: {
            create: {
                before: async (user) => {
                    return {
                        data: {
                            ...user,
                            accountNumber: `SRS-${nanoid(8).toUpperCase()}`,
                        },
                    };
                },
            },
        },
    },
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: true,
        sendResetPassword: async ({ user, url }) => {
            await sendPasswordResetEmail(user.email, url);
        },
    },
    emailVerification: {
        sendOnSignUp: true,
        autoSignInAfterVerification: true,
        // After clicking the verify link, Better Auth lands the user here.
        // Without this, it defaults to "/" (landing page), forcing a manual login.
        callbackURL: `${appUrl}/auth/verified`,
        sendVerificationEmail: async ({ user, url }) => {
            // Belt-and-braces: the URL Better Auth hands us already includes
            // a callbackURL query — make absolutely sure it points at /auth/verified
            // so the post-verify redirect can never silently fall back to "/".
            let finalUrl = url;
            try {
                const u = new URL(url);
                u.searchParams.set("callbackURL", "/auth/verified");
                finalUrl = u.toString();
            } catch { /* malformed URL, send as-is */ }

            // Pull active fillable templates so the verification email can list
            // them inline. Failure to load templates must not block sending —
            // the email is critical, the template list is a nice-to-have.
            let templates: VerificationTemplate[] = [];
            try {
                const rows = await db
                    .select({
                        name: schema.onboardingRequirements.name,
                        url: schema.onboardingRequirements.templateUrl,
                        description: schema.onboardingRequirements.description,
                    })
                    .from(schema.onboardingRequirements)
                    .where(and(
                        eq(schema.onboardingRequirements.active, true),
                        isNotNull(schema.onboardingRequirements.templateUrl),
                    ))
                    .orderBy(asc(schema.onboardingRequirements.sortOrder));
                templates = rows
                    .filter((r): r is { name: string; url: string; description: string | null } => !!r.url)
                    .map(r => ({ name: r.name, url: r.url, description: r.description }));
            } catch (err) {
                console.warn("[auth] failed to load fillable templates for verification email", err);
            }

            await sendVerificationEmail(user.email, finalUrl, templates);
        },
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
            accountNumber: {
                type: "string",
                required: false,
            },
            companyName: {
                type: "string",
                required: false,
            },
        },
    },
});

export const getSession = cache(async () => {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        });
        return session;
    } catch (error) {
        console.error("[auth] Failed to get session:", error);
        return null;
    }
});

/**
 * Require admin role for API routes.
 * Returns the session if valid admin, or a NextResponse error.
 */
export async function requireAdmin(): Promise<
    | { session: NonNullable<Awaited<ReturnType<typeof getSession>>>; error?: never }
    | { session?: never; error: NextResponse }
> {
    const session = await getSession();
    if (!session) {
        return {
            error: NextResponse.json(
                { error: "Not authenticated — please sign in again" },
                { status: 401 }
            ),
        };
    }
    if ((session.user.role as string) !== "admin") {
        return {
            error: NextResponse.json(
                { error: "Admin access required" },
                { status: 403 }
            ),
        };
    }
    return { session };
}

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
 * Require specific role - redirects to dashboard if role doesn't match.
 *
 * Clients additionally must be `vettingStatus = APPROVED` to enter `/dashboard/*`.
 * Anyone in EMAIL_PENDING / ONBOARDING_PENDING / PENDING_REVIEW / REJECTED is
 * redirected to `/auth/onboarding` which renders the right sub-view for their state.
 */
export async function requireRole(allowedRoles: Array<"admin" | "client">) {
    const session = await requireAuth();
    const userRole = session.user.role as "admin" | "client";

    if (!allowedRoles.includes(userRole)) {
        if (userRole === "admin") {
            redirect("/admin");
        } else {
            redirect("/dashboard");
        }
    }

    // Vetting gate — only applies when the page asks for client access
    if (userRole === "client" && allowedRoles.includes("client")) {
        const [row] = await db
            .select({
                vettingStatus: schema.user.vettingStatus,
                emailVerified: schema.user.emailVerified,
            })
            .from(schema.user)
            .where(eq(schema.user.id, session.user.id))
            .limit(1);

        if (!row || row.vettingStatus !== "APPROVED") {
            redirect("/auth/onboarding");
        }
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
