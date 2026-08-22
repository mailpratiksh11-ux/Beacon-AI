import { microsoftService } from './microsoft.service.js';
import { ApiError } from '../utils/ApiError.js';

// Microsoft Graph mail on behalf of an Outlook-connected user. Mirrors gmail.service.js's
// interface (listInbox / getThread / reply / listBounces / sendMail) so the inbox, bounce
// sync and mailer can treat Gmail and Outlook interchangeably.
const GRAPH = 'https://graph.microsoft.com/v1.0';

async function tokenFor(user) {
  if (!user?.microsoftRefreshToken) throw ApiError.badRequest('Connect your Microsoft account to use the inbox');
  try {
    return await microsoftService.accessTokenFor(user);
  } catch {
    throw ApiError.badRequest('Your Microsoft session expired — sign in with Microsoft again.');
  }
}

function graphError(status, data) {
  const msg = data?.error?.message || '';
  if (status === 403 || /scope|permission|access/i.test(msg)) {
    return ApiError.badRequest('Reconnect Microsoft to enable the inbox — sign in with Microsoft again to grant mail access.');
  }
  if (status === 401 || /token|expired|invalid_grant/i.test(msg)) {
    return ApiError.badRequest('Your Microsoft session expired — sign in with Microsoft again.');
  }
  return new ApiError(status || 500, msg || 'Microsoft Graph request failed');
}

async function gget(token, path) {
  const res = await fetch(`${GRAPH}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw graphError(res.status, data);
  return data;
}

async function gsend(token, method, path, body) {
  const res = await fetch(`${GRAPH}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  if (res.status === 202 || res.status === 204) return {};
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw graphError(res.status, data);
  return data;
}

// { emailAddress: { name, address } } → { name, email }
const addr = (r) => {
  const a = r?.emailAddress || {};
  const email = String(a.address || '').toLowerCase();
  return { name: a.name || email.split('@')[0] || '', email };
};

const SELECT = 'id,conversationId,subject,from,toRecipients,receivedDateTime,sentDateTime,bodyPreview,isRead';

export const graphService = {
  // Recent messages for a folder. folder: inbox | sent | unread.
  // `cursor` is a numeric $skip offset, kept as a string so both providers share
  // one opaque-cursor contract. Returns { items, nextCursor }.
  async listInbox(user, { max = 25, folder = 'inbox', cursor = '' } = {}) {
    const token = await tokenFor(user);
    const isSent = folder === 'sent';
    const mailFolder = isSent ? 'sentitems' : 'inbox';
    const orderBy = isSent ? 'sentDateTime' : 'receivedDateTime';
    const skip = Math.max(0, parseInt(cursor || '0', 10) || 0);
    let path = `/me/mailFolders/${mailFolder}/messages?$top=${max}&$skip=${skip}&$select=${SELECT}&$orderby=${orderBy}%20desc`;
    if (folder === 'unread') path += `&$filter=isRead%20eq%20false`;
    const data = await gget(token, path);
    const items = (data.value || []).map((m) => {
      const from = addr(m.from);
      const to = addr((m.toRecipients || [])[0]);
      return {
        id: m.id,
        threadId: m.conversationId,
        from: from.name,
        fromEmail: from.email,
        to: to.name,
        toEmail: to.email,
        subject: m.subject || '(no subject)',
        snippet: m.bodyPreview || '',
        date: m.receivedDateTime || m.sentDateTime,
        unread: m.isRead === false,
      };
    });
    // Graph tells us there is more via @odata.nextLink; translate that into the
    // next $skip offset rather than passing its absolute URL back to the client.
    const nextCursor = data['@odata.nextLink'] ? String(skip + items.length) : '';
    return { items, nextCursor };
  },

  // Full conversation (Graph groups by conversationId) with each message's HTML body.
  async getThread(user, conversationId) {
    const token = await tokenFor(user);
    const cid = String(conversationId).replace(/'/g, "''");
    const data = await gget(
      token,
      `/me/messages?$filter=conversationId%20eq%20'${encodeURIComponent(cid)}'&$select=id,subject,from,toRecipients,receivedDateTime,internetMessageId,body,isRead&$orderby=receivedDateTime`
    );
    const messages = (data.value || []).map((m) => {
      const from = addr(m.from);
      return {
        id: m.id,
        from: from.name,
        fromEmail: from.email,
        to: (m.toRecipients || []).map(addr).map((a) => a.email).filter(Boolean).join(', '),
        subject: m.subject,
        date: m.receivedDateTime,
        messageIdHeader: m.internetMessageId,
        html: m.body?.content || '',
        unread: m.isRead === false,
      };
    });
    return { threadId: conversationId, subject: messages[0]?.subject || '(no subject)', messages };
  },

  // Reply in-thread to the latest message: create a reply draft, set the HTML body, send it.
  async reply(user, conversationId, html) {
    const token = await tokenFor(user);
    const thread = await this.getThread(user, conversationId);
    const last = thread.messages[thread.messages.length - 1];
    if (!last) throw ApiError.notFound('Thread not found');
    const draft = await gsend(token, 'POST', `/me/messages/${last.id}/createReply`, {});
    if (!draft?.id) throw new ApiError(502, 'Could not create the reply draft');
    await gsend(token, 'PATCH', `/me/messages/${draft.id}`, { body: { contentType: 'HTML', content: html } });
    await gsend(token, 'POST', `/me/messages/${draft.id}/send`, undefined);
    let subject = last.subject || '';
    if (!/^re:/i.test(subject)) subject = `Re: ${subject}`;
    return { id: draft.id, threadId: conversationId, to: last.fromEmail, subject };
  },

  // Send a new message as the user (used by the mailer for Outlook-connected accounts).
  async sendMail(user, { to, subject, html, text, attachments }) {
    const token = await tokenFor(user);
    const message = {
      subject: subject || '',
      body: { contentType: 'HTML', content: html || (text ? `<pre style="white-space:pre-wrap;font:inherit">${text}</pre>` : '') },
      toRecipients: [{ emailAddress: { address: to } }],
    };
    if (attachments?.length) {
      message.attachments = attachments.map((a) => ({
        '@odata.type': '#microsoft.graph.fileAttachment',
        name: a.filename || 'attachment',
        contentType: a.contentType || 'application/octet-stream',
        contentBytes: Buffer.isBuffer(a.content) ? a.content.toString('base64') : Buffer.from(a.content || '').toString('base64'),
      }));
    }
    await gsend(token, 'POST', '/me/sendMail', { message, saveToSentItems: true });
    // Graph's sendMail returns 202 with no body, so there's no provider message id to surface.
    return { messageId: '' };
  },

  // Delivery-failure notices → failed recipient(s) + reason. Best-effort: scans recent
  // messages from postmaster / mailer-daemon and parses the first address out of the body.
  async listBounces(user, { max = 60 } = {}) {
    const token = await tokenFor(user);
    const data = await gget(token, `/me/messages?$top=${max}&$select=id,from,subject,bodyPreview,body,receivedDateTime&$orderby=receivedDateTime%20desc`);
    const daemon = /(postmaster|mailer-daemon|microsoftexchange)/i;
    const bounces = [];
    for (const m of data.value || []) {
      const fromEmail = String(m.from?.emailAddress?.address || '').toLowerCase();
      const subject = m.subject || '';
      const looksBounce = daemon.test(fromEmail) || /undeliverable|delivery (?:has )?failed|delivery status notification|returned mail/i.test(subject);
      if (!looksBounce) continue;
      const text = `${m.bodyPreview || ''} ${(m.body?.content || '').replace(/<[^>]+>/g, ' ')}`;
      // Grab the first address that isn't the mailbox owner's own.
      const found = [...text.matchAll(/([^\s<>"*]+@[^\s<>"*]+\.[a-z]{2,})/gi)].map((x) => x[1].toLowerCase());
      const target = found.find((e) => e !== String(user.email || '').toLowerCase() && !daemon.test(e));
      if (!target) continue;
      let reason = 'Bounced';
      if (/not found|does not exist|unknown|550 5\.1\.1|recipient.*rejected/i.test(text)) reason = 'Address not found';
      else if (/mailbox (?:is )?full|over quota|quota exceeded/i.test(text)) reason = 'Mailbox full';
      else if (/relaying denied|5\.7\.1/i.test(text)) reason = 'Relaying denied';
      bounces.push({ email: target, reason });
    }
    return bounces;
  },
};
