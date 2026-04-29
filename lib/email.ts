import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

const fromAddress = process.env.SMTP_FROM || "noreply@seairocargo.com";
const fromName = process.env.SMTP_FROM_NAME || "Seairo Cargo";
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://seairocargo.com";
const supportEmail = process.env.SUPPORT_EMAIL || "hello@seairocargo.com";

/* -------------------------------------------------------------------------- */
/* Shared layout                                                               */
/* -------------------------------------------------------------------------- */

interface LayoutOptions {
    heading: string;
    intro?: string;
    contentHtml: string;
    accentColor?: string;
}

function emailLayout({ heading, intro, contentHtml, accentColor = "#2563eb" }: LayoutOptions): string {
    return `
        <div style="background: #f1f5f9; padding: 32px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(15,23,42,0.08);">
                <div style="background: linear-gradient(135deg, ${accentColor} 0%, #06b6d4 100%); padding: 28px 32px; color: white;">
                    <div style="font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; opacity: 0.85;">Seairo Cargo</div>
                    <div style="font-size: 22px; font-weight: 800; margin-top: 4px;">${heading}</div>
                </div>
                <div style="padding: 32px;">
                    ${intro ? `<p style="color: #475569; font-size: 14px; line-height: 1.65; margin: 0 0 20px;">${intro}</p>` : ""}
                    ${contentHtml}
                </div>
                <div style="padding: 20px 32px; border-top: 1px solid #e2e8f0; background: #f8fafc;">
                    <p style="color: #94a3b8; font-size: 11px; line-height: 1.6; margin: 0;">
                        Need a hand? Email us at <a href="mailto:${supportEmail}" style="color: ${accentColor}; text-decoration: none;">${supportEmail}</a>.
                    </p>
                    <p style="color: #cbd5e1; font-size: 10px; line-height: 1.6; margin: 8px 0 0;">
                        © Seairo Cargo · Cape Town · ${new Date().getFullYear()}
                    </p>
                </div>
            </div>
        </div>
    `;
}

function ctaButton(href: string, label: string, color = "#2563eb"): string {
    return `
        <div style="text-align: center; margin: 28px 0;">
            <a href="${href}"
               style="background: ${color}; color: white; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 14px; display: inline-block; letter-spacing: 0.2px;">
                ${label}
            </a>
        </div>
    `;
}

/* -------------------------------------------------------------------------- */
/* Core sender                                                                 */
/* -------------------------------------------------------------------------- */

export async function sendEmail({
    to,
    subject,
    html,
}: {
    to: string;
    subject: string;
    html: string;
}) {
    await transporter.sendMail({
        from: `${fromName} <${fromAddress}>`,
        to,
        subject,
        html,
    });
}

/* -------------------------------------------------------------------------- */
/* Auth — verification + password reset                                        */
/* -------------------------------------------------------------------------- */

export async function sendVerificationEmail(to: string, verificationUrl: string) {
    await sendEmail({
        to,
        subject: "Verify your email — Seairo Cargo",
        html: emailLayout({
            heading: "Verify your email",
            intro: "Thanks for signing up. Click the button below to confirm your email address — then we'll guide you through a quick onboarding so we can unlock the dashboard for your company.",
            contentHtml: `
                ${ctaButton(verificationUrl, "Verify Email Address")}
                <div style="background: #eff6ff; border: 1px solid #dbeafe; border-radius: 10px; padding: 14px 16px; margin-top: 8px;">
                    <p style="color: #1e40af; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 6px;">What's next</p>
                    <p style="color: #475569; font-size: 13px; line-height: 1.55; margin: 0;">
                        After verifying, you'll be asked for your company registration details and a couple of supporting documents. Our team typically approves applications within one business day.
                    </p>
                </div>
                <p style="color: #94a3b8; font-size: 12px; line-height: 1.6; margin: 20px 0 0;">
                    If you didn't create an account, you can safely ignore this email.
                </p>
            `,
        }),
    });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
    await sendEmail({
        to,
        subject: "Reset your password — Seairo Cargo",
        html: emailLayout({
            heading: "Reset your password",
            intro: "We received a request to reset the password for your account. Click below to set a new one.",
            contentHtml: `
                ${ctaButton(resetUrl, "Reset Password")}
                <p style="color: #94a3b8; font-size: 12px; line-height: 1.6; margin: 0;">
                    This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email — your account is still secure.
                </p>
            `,
        }),
    });
}

/* -------------------------------------------------------------------------- */
/* Onboarding & vetting flow                                                   */
/* -------------------------------------------------------------------------- */

export async function sendOnboardingSubmittedEmail(to: string, companyName: string) {
    await sendEmail({
        to,
        subject: "We received your application — Seairo Cargo",
        html: emailLayout({
            heading: "Application received",
            intro: `Thanks ${companyName ? `<strong>${escapeHtml(companyName)}</strong>` : "for getting in touch"} — your onboarding application is in our queue.`,
            contentHtml: `
                <div style="background: #fefce8; border: 1px solid #fde68a; border-radius: 10px; padding: 16px 18px; margin-bottom: 20px;">
                    <p style="color: #92400e; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 6px;">Under review</p>
                    <p style="color: #78350f; font-size: 13px; line-height: 1.55; margin: 0;">
                        Our team is verifying your details. You'll get an email the moment your account is approved — usually within one business day.
                    </p>
                </div>
                <p style="color: #475569; font-size: 14px; line-height: 1.65; margin: 0 0 12px;">
                    No action needed from you right now. You can close the tab and we'll be in touch.
                </p>
                ${ctaButton(`${appUrl}/auth/onboarding`, "Check application status")}
            `,
        }),
    });
}

export async function sendApprovalEmail(to: string, accountNumber: string, companyName: string) {
    await sendEmail({
        to,
        subject: "🎉 You're approved — welcome to Seairo Cargo",
        html: emailLayout({
            accentColor: "#10b981",
            heading: "You're approved!",
            intro: `Welcome aboard${companyName ? `, <strong>${escapeHtml(companyName)}</strong>` : ""}. Your Seairo dashboard is unlocked.`,
            contentHtml: `
                <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 18px; text-align: center; margin-bottom: 20px;">
                    <p style="color: #065f46; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 8px;">Account number</p>
                    <p style="color: #047857; font-size: 20px; font-weight: 800; font-family: 'Courier New', monospace; margin: 0;">${escapeHtml(accountNumber)}</p>
                </div>
                <p style="color: #475569; font-size: 14px; line-height: 1.65; margin: 0 0 16px;">
                    You can now create bookings, track shipments and access all the tools we've built for verified shippers.
                </p>
                ${ctaButton(`${appUrl}/dashboard`, "Go to dashboard", "#10b981")}
                <p style="color: #94a3b8; font-size: 12px; line-height: 1.6; margin: 12px 0 0; text-align: center;">
                    Questions? We're a quick reply away.
                </p>
            `,
        }),
    });
}

export async function sendRejectionEmail(to: string, reason: string, companyName: string) {
    await sendEmail({
        to,
        subject: "Update on your Seairo Cargo application",
        html: emailLayout({
            accentColor: "#ef4444",
            heading: "Application not approved",
            intro: `Thanks ${companyName ? `<strong>${escapeHtml(companyName)}</strong>` : ""} for your application. Unfortunately we weren't able to approve it at this time.`,
            contentHtml: `
                <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 16px 18px; margin-bottom: 20px;">
                    <p style="color: #991b1b; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 6px;">Reason</p>
                    <p style="color: #7f1d1d; font-size: 14px; line-height: 1.55; margin: 0;">${escapeHtml(reason)}</p>
                </div>
                <p style="color: #475569; font-size: 14px; line-height: 1.65; margin: 0 0 12px;">
                    If you believe this is a mistake, or you'd like to provide additional information, please reach out — we're always happy to take another look.
                </p>
                <p style="color: #475569; font-size: 14px; line-height: 1.65; margin: 0;">
                    Email us at <a href="mailto:${supportEmail}" style="color: #2563eb; text-decoration: none; font-weight: 600;">${supportEmail}</a> and we'll respond personally.
                </p>
            `,
        }),
    });
}

export async function sendRequestChangesEmail(to: string, adminNote: string, companyName: string) {
    await sendEmail({
        to,
        subject: "Action needed on your Seairo Cargo application",
        html: emailLayout({
            accentColor: "#f59e0b",
            heading: "We need a few changes",
            intro: `Thanks ${companyName ? `<strong>${escapeHtml(companyName)}</strong>` : ""} — our team reviewed your application and needs a small update before we can approve.`,
            contentHtml: `
                <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 16px 18px; margin-bottom: 20px;">
                    <p style="color: #92400e; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 6px;">What we need</p>
                    <p style="color: #78350f; font-size: 14px; line-height: 1.55; margin: 0;">${escapeHtml(adminNote)}</p>
                </div>
                <p style="color: #475569; font-size: 14px; line-height: 1.65; margin: 0 0 16px;">
                    Click below to open your application and make the changes — your existing details are saved, you only need to update what's flagged above.
                </p>
                ${ctaButton(`${appUrl}/auth/onboarding`, "Update your application", "#f59e0b")}
            `,
        }),
    });
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
