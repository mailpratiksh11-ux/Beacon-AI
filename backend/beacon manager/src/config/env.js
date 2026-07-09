import dotenv from 'dotenv';

dotenv.config();

const required = ['MONGODB_URI'];
for (const key of required) {
  if (!process.env[key]) {
    // eslint-disable-next-line no-console
    console.error(`✖ Missing required env var: ${key}`);
    process.exit(1);
  }
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  mongoUri: process.env.MONGODB_URI,
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:4200')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  isProd: (process.env.NODE_ENV || 'development') === 'production',
  gmailUser: process.env.GMAIL_USER || '',
  gmailAppPassword: (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, ''),
  // Generic SMTP (Brevo, Mailtrap, Outlook, Resend SMTP, etc.) — an alternative to Gmail
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  mailFrom: process.env.MAIL_FROM || '',
  // Google OAuth 2.0 (Gmail API) — send from the signed-in user's own Gmail
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5050/api/auth/google/callback',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:4200',
  jwtSecret: process.env.JWT_SECRET || 'dev-insecure-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '30d',
  // Key for encrypting per-user secrets at rest (falls back to JWT_SECRET in dev).
  encryptionKey: process.env.ENCRYPTION_KEY || '',
  // Redis — used for caching + Socket.IO pub/sub adapter. Set REDIS_URL='' to disable.
  redisUrl: process.env.REDIS_URL === undefined ? 'redis://127.0.0.1:6379' : process.env.REDIS_URL,
  // AI (OpenAI-compatible). Default: Groq — free Qwen3-32B, reliable free limits.
  // Free key at https://console.groq.com  (set AI_API_KEY).
  aiApiKey: process.env.AI_API_KEY || '',
  aiModel: process.env.AI_MODEL || 'qwen/qwen3-32b',
  aiBaseUrl: process.env.AI_BASE_URL || 'https://api.groq.com/openai/v1',
  appUrl: process.env.APP_URL || 'http://localhost:51378',
};
