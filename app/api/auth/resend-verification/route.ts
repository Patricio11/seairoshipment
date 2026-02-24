import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email } = body;

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
