import { mailer } from './mailer.service.js';
import { emailService } from './email.service.js';
import { userService } from './user.service.js';
import { resumeService } from './resume.service.js';
import { attachmentService } from './attachment.service.js';
import { campaignService } from './campaign.service.js';
import { emitToUser } from '../realtime/socket.js';
import { redis } from '../config/redis.js';

export const sendService = {
  /**
   * How many more emails this account may send today.
   *
   * Counted from history rather than tracked per batch, so every path shares one
   * ceiling: a queued campaign, a second campaign started alongside it, and the
   * inline path used for one or two recipients all draw down the same budget.
   */
  async remainingToday(userId) {
    const user = await userService.getById(userId);
    const cap = Math.max(1, user.maxPerDay || 250);
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const usedToday = await emailService.countSince(userId, startOfDay);
    return { cap, usedToday, remaining: Math.max(0, cap - usedToday) };
  },

  // Send one personalized email as the given user, then log it to their history.
  async sendOne(userId, { to, name, subject, html, campaign, campaignId, attachmentIds }) {
    const user = await userService.getByIdWithSecrets(userId);

    // Prefer explicit attachments uploaded on Compose; otherwise fall back to the default resume.
    let attachments;
    if (Array.isArray(attachmentIds) && attachmentIds.length) {
      const files = await attachmentService.getByIds(userId, attachmentIds);
      attachments = files.map((f) => ({ filename: f.filename, content: f.data, contentType: f.mimeType }));
    } else {
      const resume = await resumeService.getLatestWithData(userId);
      attachments = resume
        ? [{ filename: resume.filename, content: resume.data, contentType: resume.mimeType }]
        : undefined;
    }

    let status = 'delivered';
    let messageId = null;
    let previewUrl = null;
    let error = null;

    try {
      const info = await mailer.send({ user, to, subject, html, attachments });
      messageId = info.messageId;
      previewUrl = info.previewUrl;
    } catch (e) {
      status = 'failed';
      error = e.message;
    }

    await emailService.create(userId, {
      recipient: to,
      name: name || '',
      subject,
      html: html || '',
      status,
      campaign: campaign || 'Compose',
      campaignId: campaignId || undefined,
      sentAt: new Date(),
    });

    if (campaignId) await campaignService.recordSend(userId, campaignId, status === 'delivered');

    // Real-time: push this send to the user's live dashboards, and bust their stats cache.
    emitToUser(userId, 'email:sent', { to, name: name || '', subject, status, campaign: campaign || 'Compose', campaignId: campaignId || null, at: new Date().toISOString() });
    await redis.cacheDel(`stats:${userId}`);

    return { to, status, messageId, previewUrl, error };
  },
};
