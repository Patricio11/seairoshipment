'use client';

import { createAuthClient } from "better-auth/react";
import { twoFactorClient } from "better-auth/client/plugins";
import type { User } from "@/types"; // Ensure you have shared types

export const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    plugins: [
        // Mirrors the server twoFactor plugin so authClient.twoFactor.* methods
        // (enable, disable, verifyTotp, verifyBackupCode, getTotpUri, ...) exist
        // on the client and sign-in returns the `twoFactorRedirect` signal that
        // /auth/2fa keys off.
        twoFactorClient(),
    ],
})

export const useAuth = () => {
    const { data: session, isPending } = authClient.useSession();
    return {
        user: session?.user as User | undefined,
        session,
        isLoading: isPending,
        isAuthenticated: !!session,
        signIn: authClient.signIn,
        signOut: authClient.signOut,
        signUp: authClient.signUp,
    };
};

export const useRole = () => {
    const { user } = useAuth();
    return {
        role: user?.role || 'client',
        isAdmin: user?.role === 'admin',
        isClient: user?.role === 'client',
    };
};
