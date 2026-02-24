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

export async function sendVerificationEmail(to: string, verificationUrl: string) {
    await sendEmail({
        to,
        subject: "Verify your email — Seairo Cargo",
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                <div style="text-align: center; margin-bottom: 32px;">
                    <h1 style="color: #1e293b; font-size: 24px; margin: 0;">Seairo Cargo</h1>
                </div>
                <div style="background: #f8fafc; border-radius: 12px; padding: 32px; border: 1px solid #e2e8f0;">
                    <h2 style="color: #1e293b; font-size: 20px; margin: 0 0 16px;">Verify your email address</h2>
                    <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
                        Thanks for signing up! Please click the button below to verify your email address and activate your account.
                    </p>
                    <div style="text-align: center; margin: 32px 0;">
                        <a href="${verificationUrl}"
                           style="background: #2563eb; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block;">
                            Verify Email Address
                        </a>
                    </div>
                    <p style="color: #94a3b8; font-size: 12px; line-height: 1.6; margin: 0;">
                        If you didn't create an account, you can safely ignore this email.
                    </p>
                </div>
            </div>
        `,
    });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
    await sendEmail({
        to,
        subject: "Reset your password — Seairo Cargo",
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                <div style="text-align: center; margin-bottom: 32px;">
                    <h1 style="color: #1e293b; font-size: 24px; margin: 0;">Seairo Cargo</h1>
                </div>
                <div style="background: #f8fafc; border-radius: 12px; padding: 32px; border: 1px solid #e2e8f0;">
                    <h2 style="color: #1e293b; font-size: 20px; margin: 0 0 16px;">Reset your password</h2>
                    <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
                        We received a request to reset the password for your account. Click the button below to set a new password.
                    </p>
                    <div style="text-align: center; margin: 32px 0;">
                        <a href="${resetUrl}"
                           style="background: #2563eb; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block;">
                            Reset Password
                        </a>
                    </div>
                    <p style="color: #94a3b8; font-size: 12px; line-height: 1.6; margin: 0;">
                        This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.
                    </p>
                </div>
            </div>
        `,
    });
}
