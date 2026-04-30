import { NextRequest, NextResponse } from "next/server";
import { sendContactInquiryEmail, sendContactConfirmationEmail } from "@/lib/email";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FIELD_LIMITS = {
    firstName: 80,
    lastName: 80,
    email: 200,
    message: 5000,
} as const;

/**
 * Public contact form endpoint. No auth — anyone can submit.
 * Defences: honeypot, length caps, email-format check, trimming.
 * Sends two emails: support inbox + auto-reply to the sender.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}));

        // Honeypot — real users can't see this field; bots fill in everything.
        if (typeof body?.website === "string" && body.website.trim().length > 0) {
            // Pretend it worked so the bot doesn't retry
            return NextResponse.json({ success: true });
        }

        const firstName = typeof body?.firstName === "string" ? body.firstName.trim() : "";
        const lastName = typeof body?.lastName === "string" ? body.lastName.trim() : "";
        const email = typeof body?.email === "string" ? body.email.trim() : "";
        const message = typeof body?.message === "string" ? body.message.trim() : "";

        const errors: string[] = [];
        if (!firstName) errors.push("First name is required");
        if (firstName.length > FIELD_LIMITS.firstName) errors.push(`First name must be under ${FIELD_LIMITS.firstName} characters`);
        if (!lastName) errors.push("Last name is required");
        if (lastName.length > FIELD_LIMITS.lastName) errors.push(`Last name must be under ${FIELD_LIMITS.lastName} characters`);
        if (!email) errors.push("Email is required");
        else if (email.length > FIELD_LIMITS.email || !EMAIL_RE.test(email)) errors.push("Enter a valid email address");
        if (!message) errors.push("Message is required");
        if (message.length > FIELD_LIMITS.message) errors.push(`Message must be under ${FIELD_LIMITS.message} characters`);

        if (errors.length > 0) {
            return NextResponse.json({ error: errors.join("; ") }, { status: 400 });
        }

        const inquiry = { firstName, lastName, email, message };

        // Notify support — this one matters most, surface its failure to the user.
        try {
            await sendContactInquiryEmail(inquiry);
        } catch (err) {
            console.error("[contact] inquiry email failed", err);
            return NextResponse.json(
                { error: "We couldn't send your message right now. Please email us directly." },
                { status: 502 },
            );
        }

        // Auto-reply is best-effort — don't fail the request if it bounces.
        try {
            await sendContactConfirmationEmail(inquiry);
        } catch (err) {
            console.warn("[contact] auto-reply failed", err);
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to submit";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
