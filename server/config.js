require('dotenv').config();

const rawAdminEmails = process.env.ADMIN_EMAILS || 'admin1@example.com,admin2@example.com,admin3@example.com';
const adminEmails = rawAdminEmails
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

module.exports = {
  port: process.env.PORT || 5000,
  detectorProvider: process.env.DETECTOR_PROVIDER || 'sightengine',
  sightengine: {
    apiUser: process.env.SIGHTENGINE_API_USER || '',
    apiSecret: process.env.SIGHTENGINE_API_SECRET || '',
  },
  hfToken: process.env.HF_TOKEN || '',
  videoSampleFrames: parseInt(process.env.VIDEO_SAMPLE_FRAMES || '8', 10),
  maxUploadMb: parseInt(process.env.MAX_UPLOAD_MB || '100', 10),
  jwtSecret: process.env.JWT_SECRET || 'truelense_super_secure_jwt_secret_key_2026_x9k!',
  adminEmails,
  isAdminEmail: (email) => {
    if (!email) return false;
    return adminEmails.includes(email.trim().toLowerCase());
  },
  admin: {
    email: adminEmails[0] || 'admin1@example.com',
    password: process.env.ADMIN_PASSWORD || 'Admin@TrueLense2026!',
    name: process.env.ADMIN_NAME || 'System Admin',
  },
  // Email / SMTP settings for password-reset emails
  // Leave SMTP_HOST blank to run in dev mode (reset link is printed to console)
  email: {
    smtpHost: process.env.SMTP_HOST || '',
    smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
    smtpUser: process.env.SMTP_USER || '',
    smtpPass: process.env.SMTP_PASS || '',
    emailFrom: process.env.EMAIL_FROM || '"TrueLense" <noreply@truelense.app>',
    appUrl: process.env.APP_URL || 'http://localhost:5173',
  },
};


