'use client';

import { createAuthClient } from "better-auth/react";
import type { User } from "@/types"; // Ensure you have shared types

export const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
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
