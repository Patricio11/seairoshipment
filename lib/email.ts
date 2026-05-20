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

const fromAddress = process.env.SMTP_FROM || "noreply@seairocargo.co.za";
const fromName = process.env.SMTP_FROM_NAME || "Seairo Cargo";
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://seairocargo.co.za";
const supportEmail = process.env.SUPPORT_EMAIL || "cat@seairocargo.co.za";

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
    replyTo,
}: {
    to: string;
    subject: string;
    html: string;
    replyTo?: string;
}) {
    await transporter.sendMail({
        from: `${fromName} <${fromAddress}>`,
        to,
        subject,
        html,
        ...(replyTo ? { replyTo } : {}),
    });
}

/* -------------------------------------------------------------------------- */
/* Auth — verification + password reset                                        */
/* -------------------------------------------------------------------------- */

export interface VerificationTemplate {
    name: string;
    url: string;
    description?: string | null;
}

export async function sendVerificationEmail(
    to: string,
    verificationUrl: string,
    templates: VerificationTemplate[] = [],
) {
    const templatesHtml = templates.length > 0 ? `
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; margin-top: 8px;">
            <p style="color: #2563eb; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 6px;">Documents to download and fill in</p>
            <p style="color: #475569; font-size: 13px; line-height: 1.55; margin: 0 0 14px;">
                Please download these templates, complete them, and upload your filled copies when you reach the documents step of onboarding.
            </p>
            ${templates.map(t => `
                <a href="${t.url}" style="display: block; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; margin-bottom: 8px; text-decoration: none;">
                    <div style="color: #1e40af; font-weight: 700; font-size: 13px;">⬇ ${escapeHtml(t.name)}</div>
                    ${t.description ? `<div style="color: #64748b; font-size: 12px; line-height: 1.5; margin-top: 3px;">${escapeHtml(t.description)}</div>` : ""}
                </a>
            `).join("")}
        </div>
    ` : "";

    await sendEmail({
        to,
        subject: "Verify your email — Seairo Cargo",
        html: emailLayout({
            heading: "Verify your email",
            intro: "Thanks for signing up. Click the button below to confirm your email address — then we'll guide you through a quick onboarding so we can unlock the dashboard for your company.",
            contentHtml: `
                ${ctaButton(verificationUrl, "Verify Email Address")}
                <p style="color: #94a3b8; font-size: 11px; line-height: 1.6; margin: 4px 0 18px; text-align: center;">
                    Button not working? Copy this link into your browser:<br>
                    <a href="${verificationUrl}" style="color: #2563eb; word-break: break-all;">${verificationUrl}</a>
                </p>
                ${templatesHtml}
                <div style="background: #eff6ff; border: 1px solid #dbeafe; border-radius: 10px; padding: 14px 16px; margin-top: 16px;">
                    <p style="color: #1e40af; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 6px;">What's next</p>
                    <p style="color: #475569; font-size: 13px; line-height: 1.55; margin: 0;">
                        After verifying, you'll be asked for your company registration details and a couple of supporting documents. Our team typically approves applications within one business day.
                    </p>
                </div>
                <p style="color: #94a3b8; font-size: 12px; line-height: 1.6; margin: 20px 0 0;">
                    This link expires in 1 hour. If you didn't create an account, you can safely ignore this email.
                </p>
                <p style="color: #94a3b8; font-size: 11px; line-height: 1.6; margin: 14px 0 0;">
                    By creating an account and using the platform you agree to our
                    <a href="${appUrl}/terms" style="color: #2563eb; text-decoration: none;">Terms &amp; Conditions</a>.
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
/* Admin notifications                                                         */
/* -------------------------------------------------------------------------- */

const adminInbox = process.env.ADMIN_NOTIFICATIONS_EMAIL || supportEmail;

/**
 * Notify the admin team that a client just submitted onboarding and is
 * waiting for review. Fires alongside the in-app `adminNotifications` row.
 */
export async function sendAdminVettingNotificationEmail(params: {
    companyName: string;
    contactName: string;
    contactEmail: string;
    userId: string;
    submittedAt?: Date;
}) {
    const { companyName, contactName, contactEmail, userId, submittedAt } = params;
    const reviewUrl = `${appUrl}/admin/users`;
    await sendEmail({
        to: adminInbox,
        subject: `New onboarding submission — ${companyName}`,
        html: emailLayout({
            heading: "New onboarding submission",
            intro: `<strong>${escapeHtml(companyName)}</strong> just submitted their onboarding application — they're waiting for review.`,
            contentHtml: `
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <tbody>
                        <tr>
                            <td style="padding: 8px 0; color: #64748b; font-weight: 600; width: 110px;">Company</td>
                            <td style="padding: 8px 0; color: #0f172a;">${escapeHtml(companyName)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Contact</td>
                            <td style="padding: 8px 0; color: #0f172a;">${escapeHtml(contactName)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Email</td>
                            <td style="padding: 8px 0; color: #0f172a;">
                                <a href="mailto:${escapeHtml(contactEmail)}" style="color: #2563eb; text-decoration: none;">${escapeHtml(contactEmail)}</a>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #64748b; font-weight: 600;">User ID</td>
                            <td style="padding: 8px 0; color: #0f172a; font-family: monospace; font-size: 12px;">${escapeHtml(userId)}</td>
                        </tr>
                        ${submittedAt ? `
                        <tr>
                            <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Submitted</td>
                            <td style="padding: 8px 0; color: #0f172a;">${submittedAt.toUTCString()}</td>
                        </tr>` : ""}
                    </tbody>
                </table>
                ${ctaButton(reviewUrl, "Open vetting queue")}
            `,
        }),
    });
}

/* -------------------------------------------------------------------------- */
/* Contact form                                                                */
/* -------------------------------------------------------------------------- */

const contactInbox = process.env.CONTACT_INBOX_EMAIL || supportEmail;

export interface ContactInquiry {
    firstName: string;
    lastName: string;
    email: string;
    message: string;
}

/**
 * Inbound contact form → fires to the support inbox. Reply-To is set to the
 * sender so admin can hit reply directly. Body shows the message in a quoted
 * block and dumps the raw fields below for searchability.
 */
export async function sendContactInquiryEmail(inquiry: ContactInquiry) {
    const fullName = `${inquiry.firstName} ${inquiry.lastName}`.trim();
    await sendEmail({
        to: contactInbox,
        replyTo: inquiry.email,
        subject: `New inquiry from ${fullName} — Seairo Cargo`,
        html: emailLayout({
            heading: "New contact form inquiry",
            intro: `<strong>${escapeHtml(fullName)}</strong> just sent you a message via seairo.com.`,
            contentHtml: `
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px 18px; margin-bottom: 18px;">
                    <p style="color: #64748b; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 8px;">Message</p>
                    <p style="color: #0f172a; font-size: 14px; line-height: 1.65; margin: 0; white-space: pre-wrap;">${escapeHtml(inquiry.message)}</p>
                </div>
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <tbody>
                        <tr>
                            <td style="padding: 8px 0; color: #64748b; font-weight: 600; width: 90px;">Name</td>
                            <td style="padding: 8px 0; color: #0f172a;">${escapeHtml(fullName)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Email</td>
                            <td style="padding: 8px 0; color: #0f172a;">
                                <a href="mailto:${escapeHtml(inquiry.email)}" style="color: #2563eb; text-decoration: none;">${escapeHtml(inquiry.email)}</a>
                            </td>
                        </tr>
                    </tbody>
                </table>
                <p style="color: #94a3b8; font-size: 12px; line-height: 1.6; margin: 18px 0 0;">
                    Reply directly to this email to respond — it will go straight to ${escapeHtml(inquiry.email)}.
                </p>
            `,
        }),
    });
}

/**
 * Auto-reply to the sender confirming we got their message.
 */
export async function sendContactConfirmationEmail(inquiry: ContactInquiry) {
    await sendEmail({
        to: inquiry.email,
        subject: "We got your message — Seairo Cargo",
        html: emailLayout({
            heading: "Thanks for reaching out",
            intro: `Hi ${escapeHtml(inquiry.firstName)}, your message just landed in our inbox.`,
            contentHtml: `
                <p style="color: #475569; font-size: 14px; line-height: 1.65; margin: 0 0 16px;">
                    Our team will review it and reply within one business day. In the meantime, here's a copy of what you sent:
                </p>
                <div style="background: #f8fafc; border-left: 3px solid #2563eb; border-radius: 6px; padding: 14px 18px; margin: 16px 0;">
                    <p style="color: #0f172a; font-size: 14px; line-height: 1.65; margin: 0; white-space: pre-wrap;">${escapeHtml(inquiry.message)}</p>
                </div>
                <p style="color: #94a3b8; font-size: 12px; line-height: 1.6; margin: 18px 0 0;">
                    Need to add something? Just reply to this email.
                </p>
            `,
        }),
    });
}

/* -------------------------------------------------------------------------- */
/* CBM share-link guest actions                                                */
/* -------------------------------------------------------------------------- */

export interface CbmShareNotificationParams {
    to: string;
    ownerName?: string | null;
    calculationName: string;
    calculationId: string;
    guestName: string;
    guestEmail: string;
    note?: string | null;
}

/**
 * Sent to the calc owner when a share-link guest clicks Approve.
 * In-app bell notification fires alongside this email.
 */
export async function sendCbmShareApprovedEmail(params: CbmShareNotificationParams) {
    const { to, ownerName, calculationName, calculationId, guestName, guestEmail, note } = params;
    const calcUrl = `${appUrl}/dashboard/tools/cbm-calculator/${encodeURIComponent(calculationId)}`;
    await sendEmail({
        to,
        replyTo: guestEmail,
        subject: `${guestName} approved your calculation — ${calculationName}`,
        html: emailLayout({
            accentColor: "#10b981",
            heading: "Your calculation was approved",
            intro: `Hi${ownerName ? ` ${escapeHtml(ownerName)}` : ""}, <strong>${escapeHtml(guestName)}</strong> just approved your shared calculation <strong>${escapeHtml(calculationName)}</strong>.`,
            contentHtml: `
                <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 16px;">
                    <tbody>
                        <tr>
                            <td style="padding: 8px 0; color: #64748b; font-weight: 600; width: 110px;">Approver</td>
                            <td style="padding: 8px 0; color: #0f172a;">${escapeHtml(guestName)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Email</td>
                            <td style="padding: 8px 0; color: #0f172a;">
                                <a href="mailto:${escapeHtml(guestEmail)}" style="color: #2563eb; text-decoration: none;">${escapeHtml(guestEmail)}</a>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Calculation</td>
                            <td style="padding: 8px 0; color: #0f172a;">${escapeHtml(calculationName)}</td>
                        </tr>
                    </tbody>
                </table>
                ${note ? `
                <div style="background: #ecfdf5; border-left: 3px solid #10b981; border-radius: 6px; padding: 14px 18px; margin: 16px 0;">
                    <p style="color: #065f46; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 6px;">Note from ${escapeHtml(guestName)}</p>
                    <p style="color: #0f172a; font-size: 14px; line-height: 1.65; margin: 0; white-space: pre-wrap;">${escapeHtml(note)}</p>
                </div>` : ""}
                ${ctaButton(calcUrl, "View calculation", "#10b981")}
                <p style="color: #94a3b8; font-size: 12px; line-height: 1.6; margin: 18px 0 0;">
                    Reply to this email to talk to ${escapeHtml(guestName)} directly — we've set the reply-to to their address.
                </p>
            `,
        }),
    });
}

/**
 * Sent to the calc owner when a share-link guest saves edits.
 * In-app bell notification fires alongside this email.
 */
export async function sendCbmShareEditedEmail(params: CbmShareNotificationParams) {
    const { to, ownerName, calculationName, calculationId, guestName, guestEmail, note } = params;
    const calcUrl = `${appUrl}/dashboard/tools/cbm-calculator/${encodeURIComponent(calculationId)}`;
    await sendEmail({
        to,
        replyTo: guestEmail,
        subject: `${guestName} edited your calculation — ${calculationName}`,
        html: emailLayout({
            accentColor: "#f59e0b",
            heading: "Your calculation was edited",
            intro: `Hi${ownerName ? ` ${escapeHtml(ownerName)}` : ""}, <strong>${escapeHtml(guestName)}</strong> just saved changes to your shared calculation <strong>${escapeHtml(calculationName)}</strong>.`,
            contentHtml: `
                <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 16px;">
                    <tbody>
                        <tr>
                            <td style="padding: 8px 0; color: #64748b; font-weight: 600; width: 110px;">Edited by</td>
                            <td style="padding: 8px 0; color: #0f172a;">${escapeHtml(guestName)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Email</td>
                            <td style="padding: 8px 0; color: #0f172a;">
                                <a href="mailto:${escapeHtml(guestEmail)}" style="color: #2563eb; text-decoration: none;">${escapeHtml(guestEmail)}</a>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Calculation</td>
                            <td style="padding: 8px 0; color: #0f172a;">${escapeHtml(calculationName)}</td>
                        </tr>
                    </tbody>
                </table>
                ${note ? `
                <div style="background: #fffbeb; border-left: 3px solid #f59e0b; border-radius: 6px; padding: 14px 18px; margin: 16px 0;">
                    <p style="color: #92400e; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 6px;">Note from ${escapeHtml(guestName)}</p>
                    <p style="color: #0f172a; font-size: 14px; line-height: 1.65; margin: 0; white-space: pre-wrap;">${escapeHtml(note)}</p>
                </div>` : ""}
                <div style="background: #fef3c7; border: 1px solid #fde68a; border-radius: 10px; padding: 14px 16px; margin: 16px 0;">
                    <p style="color: #92400e; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 6px;">Need to undo?</p>
                    <p style="color: #78350f; font-size: 13px; line-height: 1.55; margin: 0;">
                        Open the calculation, scroll to the Activity timeline, and click <em>Revert</em> on this entry to restore the items as they were before this edit.
                    </p>
                </div>
                ${ctaButton(calcUrl, "Review changes", "#f59e0b")}
            `,
        }),
    });
}

/* -------------------------------------------------------------------------- */
/* Two-factor authentication                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Confirmation to the user that 2FA is now enabled on their account. Fired
 * from POST /api/auth/events when a TWO_FACTOR_ENABLED event lands.
 */
export async function sendTwoFactorEnabledEmail(to: string, name: string | null) {
    const greeting = name ? `Hi ${escapeHtml(name)},` : "Hi,";
    await sendEmail({
        to,
        subject: "Two-factor authentication is now active — Seairo Cargo",
        html: emailLayout({
            accentColor: "#10b981",
            heading: "Two-factor authentication is on",
            intro: `${greeting} two-factor authentication has just been enabled on your Seairo account.`,
            contentHtml: `
                <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 16px 18px; margin-bottom: 20px;">
                    <p style="color: #065f46; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 6px;">What changes</p>
                    <p style="color: #064e3b; font-size: 13px; line-height: 1.55; margin: 0;">
                        From now on, signing in asks for a 6-digit code from your authenticator app after your password. If you ever lose the app, use one of the backup codes you saved during setup — each one works once.
                    </p>
                </div>
                <p style="color: #475569; font-size: 14px; line-height: 1.65; margin: 0 0 12px;">
                    Misplaced your backup codes? Go to <strong>Settings → Security</strong> and click <strong>Regenerate backup codes</strong> to issue a fresh set (the old ones stop working immediately).
                </p>
                ${ctaButton(`${appUrl}/dashboard/settings`, "Open settings", "#10b981")}
                <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 14px 16px; margin-top: 16px;">
                    <p style="color: #991b1b; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 6px;">Wasn't you?</p>
                    <p style="color: #7f1d1d; font-size: 13px; line-height: 1.55; margin: 0;">
                        If you didn't enable this, change your password immediately and contact <a href="mailto:${supportEmail}" style="color: #991b1b;">${supportEmail}</a> — someone may have access to your account.
                    </p>
                </div>
            `,
        }),
    });
}

/**
 * Confirmation to the user that 2FA was disabled on their account. Triggered
 * both when the user disables it from Settings (self-action) and when an
 * admin break-glass disables it (`reason: "admin-reset"`).
 */
export async function sendTwoFactorDisabledEmail(
    to: string,
    name: string | null,
    reason: "self" | "admin-reset" = "self",
) {
    const greeting = name ? `Hi ${escapeHtml(name)},` : "Hi,";
    const introCopy = reason === "admin-reset"
        ? `${greeting} our support team has just reset the two-factor authentication on your Seairo account at your request.`
        : `${greeting} two-factor authentication has just been turned off on your Seairo account.`;
    const explainerCopy = reason === "admin-reset"
        ? "Sign in with your password as usual, then head straight to Settings → Security to re-enable 2FA with a fresh authenticator setup."
        : "Sign-ins will now only require your password. We strongly recommend re-enabling 2FA — it's the single biggest defence against a compromised password.";
    return await sendEmail({
        to,
        subject: reason === "admin-reset"
            ? "Two-factor authentication reset — Seairo Cargo"
            : "Two-factor authentication turned off — Seairo Cargo",
        html: emailLayout({
            accentColor: "#f59e0b",
            heading: reason === "admin-reset" ? "2FA reset by support" : "Two-factor authentication is off",
            intro: introCopy,
            contentHtml: `
                <p style="color: #475569; font-size: 14px; line-height: 1.65; margin: 0 0 16px;">
                    ${explainerCopy}
                </p>
                ${ctaButton(`${appUrl}/dashboard/settings`, "Re-enable 2FA", "#f59e0b")}
                ${reason === "self" ? `
                <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 14px 16px; margin-top: 16px;">
                    <p style="color: #991b1b; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 6px;">Wasn't you?</p>
                    <p style="color: #7f1d1d; font-size: 13px; line-height: 1.55; margin: 0;">
                        If you didn't disable 2FA, change your password immediately and contact <a href="mailto:${supportEmail}" style="color: #991b1b;">${supportEmail}</a>. We can lock the account while we investigate.
                    </p>
                </div>` : ""}
            `,
        }),
    });
}

/**
 * Heads-up to the security inbox that an admin user has finished 2FA
 * enrollment. Fires once per admin per enrollment. If ADMIN_ALERT_EMAIL is
 * unset, the function logs and returns — no error — so missing config never
 * breaks the user flow.
 */
export async function sendAdminTwoFactorEnabledEmail(adminName: string, adminEmail: string) {
    const securityInbox = process.env.ADMIN_ALERT_EMAIL;
    if (!securityInbox) {
        console.log("[email] ADMIN_ALERT_EMAIL unset — skipping admin 2FA notification");
        return;
    }
    await sendEmail({
        to: securityInbox,
        subject: `Admin enrolled in 2FA — ${adminName}`,
        html: emailLayout({
            accentColor: "#10b981",
            heading: "Admin enrolled in 2FA",
            intro: `<strong>${escapeHtml(adminName)}</strong> (${escapeHtml(adminEmail)}) just completed two-factor enrollment on their admin account.`,
            contentHtml: `
                <p style="color: #475569; font-size: 14px; line-height: 1.65; margin: 0 0 12px;">
                    This is an informational alert — no action required. We send one of these every time an admin completes the forced 2FA setup so the security team can see new admin sessions hardening.
                </p>
                <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin: 16px 0;">
                    <tbody>
                        <tr><td style="padding: 6px 0; color: #64748b; font-weight: 600; width: 120px;">Admin</td><td style="padding: 6px 0; color: #0f172a;">${escapeHtml(adminName)}</td></tr>
                        <tr><td style="padding: 6px 0; color: #64748b; font-weight: 600;">Email</td><td style="padding: 6px 0; color: #0f172a;">${escapeHtml(adminEmail)}</td></tr>
                        <tr><td style="padding: 6px 0; color: #64748b; font-weight: 600;">When</td><td style="padding: 6px 0; color: #0f172a;">${new Date().toISOString()}</td></tr>
                    </tbody>
                </table>
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
