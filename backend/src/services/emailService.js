import nodemailer from 'nodemailer';

let transporter = null;

const PLACEHOLDER_VALUES = [
  'your-email@gmail.com',
  'your-app-password',
  'your-super-secret',
];

const isPlaceholder = (value) =>
  !value || PLACEHOLDER_VALUES.some((p) => value.toLowerCase().includes(p));

/** Email is OFF unless SMTP_ENABLED=true and credentials are set */
export const isEmailConfigured = () => {
  if (process.env.SMTP_ENABLED !== 'true') return false;
  return !isPlaceholder(process.env.SMTP_USER) && !isPlaceholder(process.env.SMTP_PASS);
};

const getTransporter = () => {
  if (!isEmailConfigured()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
};

export const sendEmail = async ({ to, subject, html, text }) => {
  if (!isEmailConfigured()) {
    return { success: true, skipped: true };
  }

  try {
    const info = await getTransporter().sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''),
    });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[Email failed] To: ${to} — ${error.message}`);
    return { success: false, error: error.message };
  }
};

export const sendVerificationEmail = async (user, token) => {
  const verifyUrl = `${process.env.FRONTEND_URL}/auth/verify-email?token=${token}`;
  return sendEmail({
    to: user.email,
    subject: 'Verify your ShiftBoard account',
    html: `
      <h2>Welcome to ShiftBoard, ${user.firstName}!</h2>
      <p>Please verify your email by clicking the link below:</p>
      <a href="${verifyUrl}">Verify Email</a>
      <p>This link expires in 24 hours.</p>
    `,
  });
};

export const sendPasswordResetEmail = async (user, token) => {
  const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${token}`;
  return sendEmail({
    to: user.email,
    subject: 'Reset your ShiftBoard password',
    html: `
      <h2>Password Reset</h2>
      <p>Hi ${user.firstName}, click the link below to reset your password:</p>
      <a href="${resetUrl}">Reset Password</a>
      <p>This link expires in 1 hour.</p>
    `,
  });
};

export const sendScheduleEmail = async (user, scheduleInfo) => {
  return sendEmail({
    to: user.email,
    subject: `Your schedule for ${scheduleInfo.dateRange}`,
    html: `
      <h2>Schedule Update</h2>
      <p>Hi ${user.firstName}, your ShiftBoard schedule for ${scheduleInfo.dateRange} is available.</p>
      <p><a href="${process.env.FRONTEND_URL}/schedule">View Schedule</a></p>
    `,
  });
};
