const nodemailer = require("nodemailer");
const config = require("../config");

function createTransporter() {
  const { smtpHost, smtpUser, smtpPass } = config.email;
  if (!smtpHost || !smtpUser || !smtpPass) {
    return null;
  }
  return nodemailer.createTransport({
    host: smtpHost,
    port: config.email.smtpPort,
    secure: config.email.smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass },
  });
}

async function sendPasswordResetEmail(toEmail, resetUrl) {
  const transporter = createTransporter();

  const htmlBody = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>TrueLense - Reset Your Password</title></head><body style="margin:0;padding:0;background:#0f1117;font-family:'Segoe UI',Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#0f1117;padding:40px 16px;"><tr><td align="center"><table width="100%" style="max-width:480px;background:#1a1d27;border:1px solid #2a2d3e;border-radius:12px;padding:36px 32px;" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding-bottom:24px;border-bottom:1px solid #2a2d3e;"><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:linear-gradient(135deg,#6c7cff,#2dd4bf);margin-right:8px;vertical-align:middle;"></span><span style="font-size:20px;font-weight:700;color:#e8eaf6;letter-spacing:-0.02em;vertical-align:middle;">TrueLense</span></td></tr><tr><td style="padding-top:28px;padding-bottom:8px;"><h1 style="margin:0;font-size:22px;font-weight:600;color:#e8eaf6;letter-spacing:-0.01em;">Reset your password</h1></td></tr><tr><td style="padding-top:12px;padding-bottom:28px;"><p style="margin:0;font-size:14px;color:#9da3b4;line-height:1.6;">We received a request to reset the password for the TrueLense account associated with <strong style="color:#c5c9db;">${toEmail}</strong>.</p><p style="margin:16px 0 0;font-size:14px;color:#9da3b4;line-height:1.6;">Click the button below to set a new password. This link will expire in <strong style="color:#c5c9db;">15 minutes</strong>.</p></td></tr><tr><td align="center" style="padding-bottom:28px;"><a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#6c7cff,#5061ff);color:#fff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;box-shadow:0 4px 12px rgba(108,124,255,0.3);">Reset Password</a></td></tr><tr><td style="padding-bottom:28px;border-bottom:1px solid #2a2d3e;"><p style="margin:0;font-size:12px;color:#616880;line-height:1.6;">If the button does not work, copy and paste this link into your browser:<br/><a href="${resetUrl}" style="color:#6c7cff;word-break:break-all;">${resetUrl}</a></p></td></tr><tr><td style="padding-top:20px;"><p style="margin:0;font-size:12px;color:#616880;line-height:1.6;">If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.</p></td></tr></table></td></tr></table></body></html>`;

  const textBody = [
    "TrueLense - Reset Your Password",
    "",
    "We received a request to reset the password for " + toEmail + ".",
    "Click the link below to set a new password. This link expires in 15 minutes.",
    "",
    resetUrl,
    "",
    "If you did not request this, ignore this email.",
  ].join("\n");

  if (!transporter) {
    console.log("\n" + "=".repeat(62));
    console.log("  TrueLense - DEV MODE: password reset link (no SMTP configured)");
    console.log("  To:", toEmail);
    console.log("  Link:", resetUrl);
    console.log("=".repeat(62) + "\n");
    return { devMode: true };
  }

  const fromAddress = config.email.emailFrom || '"TrueLense" <noreply@truelense.app>';
  await transporter.sendMail({
    from: fromAddress,
    to: toEmail,
    subject: "Reset your TrueLense password",
    text: textBody,
    html: htmlBody,
  });
  return { sent: true };
}

module.exports = { sendPasswordResetEmail };
