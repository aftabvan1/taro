import { Resend } from "resend";

let _resend: Resend | null = null;

const getResend = (): Resend => {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
};

const FROM_EMAIL = process.env.FROM_EMAIL || "Taro <noreply@taroagent.com>";

export const sendWelcomeEmail = async (email: string, name: string) => {
  await getResend().emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Welcome to Taro",
    html: `
      <h2>Welcome to Taro, ${name}!</h2>
      <p>Your account is ready. Deploy your first OpenClaw instance in seconds.</p>
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard">Go to Dashboard</a></p>
    `,
  });
};

export const sendPasswordResetEmail = async (
  email: string,
  resetToken: string
) => {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`;
  await getResend().emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Reset your Taro password",
    html: `
      <h2>Password Reset</h2>
      <p>Click the link below to reset your password. This link expires in 1 hour.</p>
      <p><a href="${resetUrl}">Reset Password</a></p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `,
  });
};
