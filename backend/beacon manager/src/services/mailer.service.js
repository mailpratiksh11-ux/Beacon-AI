import nodemailer from 'nodemailer';
import MailComposer from 'nodemailer/lib/mail-composer/index.js';
import { google } from 'googleapis';
import { env } from '../config/env.js';
import { googleService } from './google.service.js';
import { microsoftService } from './microsoft.service.js';
import { graphService } from './graph.service.js';
import { decryptSecret } from '../utils/crypto.js';

// Send via the Gmail API (works with the gmail.send scope — SMTP XOAUTH2 would need full mailbox access).
async function sendViaGmailApi(user, { from, to, subject, html, text, attachments }) {
  const auth = new google.auth.OAuth2(env.googleClientId, env.googleClientSecret, env.googleRedirectUri);
  auth.setCredentials({ refresh_token: decryptSecret(user.googleRefreshToken) });
  const gmail = google.gmail({ version: 'v1', auth });

  const mail = new MailComposer({ from, to, subject, html, text, attachments });
  const mime = await new Promise((res, rej) => mail.compile().build((err, msg) => (err ? rej(err) : res(msg))));
  const raw = mime.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const { data } = await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });
  return { messageId: data.id };
}

let etherealTransporter = null;
let etherealAccount = null;

async function ethereal() {
  if (!etherealTransporter) {
    etherealAccount = await nodemailer.createTestAccount();
    etherealTransporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: etherealAccount.user, pass: etherealAccount.pass },
    });
  }
  return { mode: 'ethereal', from: (etherealAccount && etherealAccount.user) || 'no-reply@coldmailer.local', transporter: etherealTransporter };
}

// Build a transport for a specific user, in priority order.
// `user` must be loaded with secrets (mailPassword, googleRefreshToken).
async function resolveTransport(user) {
  // 1) User's own Google OAuth (send from their Gmail via the Gmail API)
  if (googleService.isConfigured() && user?.googleRefreshToken && user.email) {
    return {
      mode: 'gmail-oauth',
      from: user.name ? `"${user.name}" <${user.email}>` : user.email,
      gmailApi: true,
    };
  }

  // 2) User's own Microsoft OAuth (send from their Outlook via Microsoft Graph)
  if (microsoftService.isConfigured() && user?.microsoftRefreshToken && user.email) {
    return {
      mode: 'outlook',
      from: user.name ? `"${user.name}" <${user.email}>` : user.email,
      graphApi: true,
    };
  }

  // 3) User's own mail credentials from Settings (Gmail App Password or SMTP)
  if (user?.mailUser && user.mailPassword) {
    const fromName = user.mailFromName || user.name;
    const from = fromName ? `"${fromName}" <${user.mailUser}>` : user.mailUser;
    const pass = decryptSecret(user.mailPassword);
    const transporter = user.mailHost
      ? nodemailer.createTransport({ host: user.mailHost, port: user.mailPort || 587, secure: (user.mailPort || 587) === 465, auth: { user: user.mailUser, pass } })
      : nodemailer.createTransport({ service: 'gmail', auth: { user: user.mailUser, pass } });
    return { mode: user.mailHost ? 'smtp' : 'gmail', from, transporter };
  }

  // 4) Ethereal test fallback (no real delivery)
  return ethereal();
}

// System transport for app emails (password reset, etc.) — uses env creds, else Ethereal.
async function systemTransport() {
  if (env.gmailUser && env.gmailAppPassword) {
    return { mode: 'gmail', from: env.mailFrom || env.gmailUser, transporter: nodemailer.createTransport({ service: 'gmail', auth: { user: env.gmailUser, pass: env.gmailAppPassword } }) };
  }
  if (env.smtpHost && env.smtpUser && env.smtpPass) {
    return { mode: 'smtp', from: env.mailFrom || env.smtpUser, transporter: nodemailer.createTransport({ host: env.smtpHost, port: env.smtpPort, secure: env.smtpPort === 465, auth: { user: env.smtpUser, pass: env.smtpPass } }) };
  }
  return ethereal();
}

export const mailer = {
  // How will this user's mail be sent?
  async modeFor(user) {
    return (await resolveTransport(user)).mode;
  },

  // Send an app/system email (not a campaign) — used for password reset.
  async sendSystem({ to, subject, html }) {
    const { mode, from, transporter } = await systemTransport();
    const info = await transporter.sendMail({ from: `"Beacon AI" <${from}>`, to, subject, html });
    const previewUrl = mode === 'ethereal' ? nodemailer.getTestMessageUrl(info) : null;
    if (previewUrl) { console.log(`   ↳ password-reset preview (${to}): ${previewUrl}`); } // eslint-disable-line no-console
    return { previewUrl, mode };
  },

  async send({ user, to, subject, html, text, attachments }) {
    const { mode, from, transporter, gmailApi, graphApi } = await resolveTransport(user);
    if (gmailApi) {
      const info = await sendViaGmailApi(user, { from, to, subject, html, text, attachments });
      return { messageId: info.messageId, previewUrl: null, mode };
    }
    if (graphApi) {
      const info = await graphService.sendMail(user, { to, subject, html, text, attachments });
      return { messageId: info.messageId, previewUrl: null, mode };
    }
    const info = await transporter.sendMail({ from, to, subject, html, text, attachments });
    const previewUrl = mode === 'ethereal' ? nodemailer.getTestMessageUrl(info) : null;
    if (previewUrl) {
      // eslint-disable-next-line no-console
      console.log(`   ↳ preview (${to}): ${previewUrl}`);
    }
    return { messageId: info.messageId, previewUrl, mode };
  },
};
