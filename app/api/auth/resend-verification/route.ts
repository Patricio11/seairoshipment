import { NextRequest, NextResponse } from 'next/server';
import { auth, getSession } from '@/lib/auth/server';

/**
 * Resend the verification email. Email may come from the request body
 * (e.g. /auth/check-email after signup, where the user has no session yet)
 * or be derived from the session (e.g. EmailPendingScreen on /auth/onboarding).
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => ({}));
        let email: string | undefined = typeof body?.email === 'string' ? body.email.trim() : undefined;

        if (!email) {
            const session = await getSession();
            if (session?.user?.email) email = session.user.email;
        }

        if (!email) {
            return NextResponse.json(
                { error: 'Email is required' },
                { status: 400 }
            );
        }

        const baseURL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

        await auth.api.sendVerificationEmail({
            body: {
                email,
                callbackURL: `${baseURL}/auth/verified`,
            },
        });

        return NextResponse.json({
            success: true,
            message: 'Verification email sent successfully',
        });
    } catch (error: unknown) {
        console.error('Error resending verification email:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to resend verification email';
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}
