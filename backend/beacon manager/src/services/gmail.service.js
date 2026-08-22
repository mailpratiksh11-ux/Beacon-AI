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

/**
 * Gmail returns `snippet` HTML-entity-encoded, so previews rendered as text
 * showed things like "we&#39;re reviewing". Decodes the named entities Gmail
 * actually emits plus any numeric ones.
 */
function decodeEntities(str) {
  const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', mdash: '—', ndash: '–', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”' };
  return String(str || '')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&([a-z]+);/gi, (m, n) => (named[n.toLowerCase()] !== undefined ? named[n.toLowerCase()] : m))
    .replace(/\s+/g, ' ')
    .trim();
}

export const gmailService = {
  // Delivery-failure (bounce) notices → the failed recipient(s) + reason.
  // Gmail DSN messages carry the failed address in the X-Failed-Recipients header.
  async listBounces(user, { max = 80 } = {}) {
    const gmail = clientFor(user);
    return guard(async () => {
      const q = 'from:mailer-daemon newer_than:30d';
      const { data } = await gmail.users.messages.list({ userId: 'me', q, maxResults: max });
      const messages = data.messages || [];
      const bounces = [];
      for (const { id } of messages) {
        const { data: msg } = await gmail.users.messages.get({ userId: 'me', id, format: 'full' });
        const h = msg.payload?.headers || [];
        const bodyText = extractBody(msg.payload).html.replace(/<[^>]+>/g, ' ');
        const snippet = decodeEntities(msg.snippet);
        const text = `${snippet} ${bodyText}`;

        // Reliable source first, then fall back to parsing the notice body.
        let addrs = (header(h, 'X-Failed-Recipients') || '')
          .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
        if (!addrs.length) {
          const m = text.match(/deliver(?:ed)?\s+to\s+\*?([^\s<>"*]+@[^\s<>"*]+\.[a-z]{2,})/i)
            || text.match(/([^\s<>"*]+@[^\s<>"*]+\.[a-z]{2,})\s+because/i);
          if (m) addrs = [m[1].toLowerCase()];
        }
        if (!addrs.length) continue;

        let reason = 'Bounced';
        if (/address (?:not found|couldn.?t be found)|user unknown|no such user|550.*5\.1\.1|does not exist/i.test(text)) reason = 'Address not found';
        else if (/relaying denied|5\.7\.1/i.test(text)) reason = 'Relaying denied';
        else if (/mailbox (?:is )?full|over quota|quota exceeded/i.test(text)) reason = 'Mailbox full';
        else if (/misconfigured/i.test(text)) reason = 'Server misconfigured';

        for (const email of addrs) bounces.push({ email, reason });
      }
      return bounces;
    });
  },

  // Recent messages for a folder (metadata only — fast). folder: inbox | sent | unread.
  // `cursor` is Gmail's pageToken. Returns { items, nextCursor } — nextCursor is
  // '' on the last page, which is what tells the UI to stop offering "load more".
  async listInbox(user, { max = 25, folder = 'inbox', cursor = '' } = {}) {
    const gmail = clientFor(user);
    const Q = { inbox: 'in:inbox', sent: 'in:sent', unread: 'is:unread in:inbox' };
    const q = Q[folder] || Q.inbox;
    return guard(async () => {
    const { data } = await gmail.users.messages.list({
      userId: 'me', q, maxResults: max,
      ...(cursor ? { pageToken: cursor } : {}),
    });
    const messages = data.messages || [];
    const items = await Promise.all(
      messages.map(async ({ id }) => {
        const { data: msg } = await gmail.users.messages.get({
          userId: 'me', id, format: 'metadata', metadataHeaders: ['From', 'To', 'Subject', 'Date'],
        });
        const h = msg.payload?.headers || [];
        const from = parseFrom(header(h, 'From'));
        const to = parseFrom(header(h, 'To'));
        return {
          id: msg.id,
          threadId: msg.threadId,
          from: from.name,
          fromEmail: from.email,
          to: to.name,
          toEmail: to.email,
          subject: header(h, 'Subject') || '(no subject)',
          snippet: decodeEntities(msg.snippet),
          date: header(h, 'Date'),
          unread: (msg.labelIds || []).includes('UNREAD'),
        };
      })
    );
    return { items, nextCursor: data.nextPageToken || '' };
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
