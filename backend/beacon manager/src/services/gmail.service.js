import { google } from 'googleapis';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { decryptSecret } from '../utils/crypto.js';

// Gmail API access on behalf of a Google-connected user (uses their stored refresh token).
function clientFor(user) {
  if (!user?.googleRefreshToken) throw ApiError.badRequest('Connect your Google account to use the inbox');
  const auth = new google.auth.OAuth2(env.googleClientId, env.googleClientSecret, env.googleRedirectUri);
  auth.setCredentials({ refresh_token: decryptSecret(user.googleRefreshToken) });
  return google.gmail({ version: 'v1', auth });
}

// Translate raw Gmail API errors into clear, actionable messages.
async function guard(fn) {
  try {
    return await fn();
  } catch (e) {
    const msg = e?.message || '';
    if (e?.code === 403 || /insufficient|permission|scope/i.test(msg)) {
      throw ApiError.badRequest('Reconnect Google to enable the inbox — sign out and sign in with Google again to grant read access.');
    }
    if (e?.code === 401 || /invalid_grant|expired|revoked/i.test(msg)) {
      throw ApiError.badRequest('Your Google session expired — sign in with Google again.');
    }
    throw e;
  }
}

const header = (headers, name) => (headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || '');

// Parse a "Name <email>" From header into { name, email }.
function parseFrom(value) {
  const m = value.match(/^\s*"?([^"<]*)"?\s*<([^>]+)>/);
  if (m) return { name: m[1].trim(), email: m[2].trim() };
  return { name: value.split('@')[0], email: value.trim() };
}

// Walk a MIME payload and pull out the best body (prefer HTML).
function extractBody(payload) {
  let html = '';
  let text = '';
  const walk = (part) => {
    if (!part) return;
    const mt = part.mimeType || '';
    if (mt === 'text/html' && part.body?.data) html += decode(part.body.data);
    else if (mt === 'text/plain' && part.body?.data) text += decode(part.body.data);
    (part.parts || []).forEach(walk);
  };
  walk(payload);
  if (html) return { html, isHtml: true };
  return { html: text ? `<pre style="white-space:pre-wrap;font:inherit">${escapeHtml(text)}</pre>` : '', isHtml: false };
}

const decode = (b64url) => Buffer.from(b64url.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const gmailService = {
  // Recent inbox threads (metadata only — fast).
  async listInbox(user, { max = 25 } = {}) {
    const gmail = clientFor(user);
    return guard(async () => {
    const { data } = await gmail.users.messages.list({ userId: 'me', q: 'in:inbox', maxResults: max });
    const messages = data.messages || [];
    const items = await Promise.all(
      messages.map(async ({ id }) => {
        const { data: msg } = await gmail.users.messages.get({
          userId: 'me', id, format: 'metadata', metadataHeaders: ['From', 'Subject', 'Date'],
        });
        const h = msg.payload?.headers || [];
        const from = parseFrom(header(h, 'From'));
        return {
          id: msg.id,
          threadId: msg.threadId,
          from: from.name,
          fromEmail: from.email,
          subject: header(h, 'Subject') || '(no subject)',
          snippet: msg.snippet || '',
          date: header(h, 'Date'),
          unread: (msg.labelIds || []).includes('UNREAD'),
        };
      })
    );
    return items;
    });
  },

  // Full thread with each message's body.
  async getThread(user, threadId) {
    const gmail = clientFor(user);
    return guard(async () => {
    const { data } = await gmail.users.threads.get({ userId: 'me', id: threadId, format: 'full' });
    const messages = (data.messages || []).map((msg) => {
      const h = msg.payload?.headers || [];
      const from = parseFrom(header(h, 'From'));
      const body = extractBody(msg.payload);
      return {
        id: msg.id,
        from: from.name,
        fromEmail: from.email,
        to: header(h, 'To'),
        subject: header(h, 'Subject'),
        date: header(h, 'Date'),
        messageIdHeader: header(h, 'Message-ID'),
        html: body.html,
        unread: (msg.labelIds || []).includes('UNREAD'),
      };
    });
    return { threadId, subject: messages[0]?.subject || '(no subject)', messages };
    });
  },

  // Reply in-thread to the latest message.
  async reply(user, threadId, html) {
    const gmail = clientFor(user);
    return guard(async () => {
    const thread = await this.getThread(user, threadId);
    const last = thread.messages[thread.messages.length - 1];
    if (!last) throw ApiError.notFound('Thread not found');

    const from = parseFrom(last.fromEmail || '');
    const to = from.email || last.fromEmail;
    let subject = last.subject || '';
    if (!/^re:/i.test(subject)) subject = `Re: ${subject}`;

    const raw = buildRaw({
      to,
      from: user.gmailAccount || user.email,
      subject,
      html,
      inReplyTo: last.messageIdHeader,
    });
    const { data } = await gmail.users.messages.send({ userId: 'me', requestBody: { raw, threadId } });
    return { id: data.id, threadId: data.threadId, to, subject };
    });
  },
};

// Build a base64url-encoded RFC822 message with proper threading headers.
function buildRaw({ to, from, subject, html, inReplyTo }) {
  const lines = [
    `To: ${to}`,
    `From: ${from}`,
    `Subject: ${subject}`,
    inReplyTo ? `In-Reply-To: ${inReplyTo}` : '',
    inReplyTo ? `References: ${inReplyTo}` : '',
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset="UTF-8"',
    '',
    html || '',
  ].filter((l) => l !== '');
  return Buffer.from(lines.join('\r\n'), 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
