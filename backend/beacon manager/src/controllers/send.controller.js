import { sendService } from '../services/send.service.js';
import { mailer } from '../services/mailer.service.js';
import { userService } from '../services/user.service.js';
import { emailQueue } from '../queue/email.queue.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok, created } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const sendController = {
  // How will THIS user's mail be sent?
  status: asyncHandler(async (req, res) => {
    const user = await userService.getByIdWithSecrets(req.userId);
    const mode = await mailer.modeFor(user);
    const { cap, usedToday, remaining } = await sendService.remainingToday(req.userId);
    return ok(res, {
      maxPerDay: cap,
      usedToday,
      remainingToday: remaining,
      realDelivery: mode !== 'ethereal',
      mode, // 'gmail-oauth' | 'gmail' | 'smtp' | 'ethereal'
      account: user.mailUser || user.email || null,
      queue: emailQueue.isAvailable(), // can we background bulk sends?
    });
  }),

  // Enqueue a bulk send — the worker processes it in the background and streams progress via socket.
  // Pass `scheduleAt` (ISO datetime, up to 30 days out) to hold the batch until that time.
  bulk: asyncHandler(async (req, res) => {
    if (!emailQueue.isAvailable()) throw ApiError.badRequest('Background queue unavailable (Redis not running)');
    const { subject, html, campaign, campaignId, attachmentIds, recipients, delaySeconds, scheduleAt } = req.body;
    if (!subject) throw ApiError.badRequest('A subject is required');
    if (!Array.isArray(recipients) || recipients.length === 0) throw ApiError.badRequest('recipients[] is required');
    const clean = recipients.filter((r) => r && EMAIL_RE.test(r.email || ''));
    if (clean.length === 0) throw ApiError.badRequest('No valid recipient emails');

    // Fail fast rather than queueing a batch that would immediately pause itself.
    const budget = await sendService.remainingToday(req.userId);
    if (budget.remaining <= 0) {
      throw ApiError.badRequest(`Daily limit of ${budget.cap} already reached (${budget.usedToday} sent today). Raise the limit in Compose, or try tomorrow.`);
    }

    let scheduleDelayMs = 0;
    let scheduledFor = '';
    if (scheduleAt) {
      const at = new Date(scheduleAt);
      if (Number.isNaN(at.getTime())) throw ApiError.badRequest('Invalid schedule time');
      scheduleDelayMs = at.getTime() - Date.now();
      if (scheduleDelayMs < 60 * 1000) throw ApiError.badRequest('Schedule time must be at least a minute in the future');
      if (scheduleDelayMs > 30 * 24 * 60 * 60 * 1000) throw ApiError.badRequest('Schedule time can be at most 30 days out');
      scheduledFor = at.toISOString();
    }

    const result = await emailQueue.enqueue(req.userId, {
      subject, html: html || '', campaign: campaign || 'Campaign', campaignId: campaignId || undefined,
      attachmentIds: Array.isArray(attachmentIds) ? attachmentIds : undefined,
      recipients: clean,
      delayMs: Math.max(0, parseInt(delaySeconds || '0', 10)) * 1000,
    }, { scheduleDelayMs, scheduledFor });
    const status = scheduledFor ? 'scheduled' : 'running';
    return created(res, { ...result, status }, scheduledFor ? 'Campaign scheduled' : 'Campaign queued');
  }),

  batch: asyncHandler(async (req, res) => {
    const meta = await emailQueue.getBatch(req.params.id);
    if (!meta || meta.userId !== req.userId) throw ApiError.notFound('Batch not found');
    return ok(res, meta);
  }),

  control: asyncHandler(async (req, res) => {
    const state = req.params.action; // pause | resume | cancel
    const map = { pause: 'paused', resume: 'running', cancel: 'cancelled' };
    if (!map[state]) throw ApiError.badRequest('Invalid action');
    const meta = await emailQueue.setControl(req.userId, req.params.id, map[state]);
    if (!meta) throw ApiError.notFound('Batch not found');
    return ok(res, meta, `Campaign ${state}d`);
  }),

  send: asyncHandler(async (req, res) => {
    const { to, name, subject, html, campaign, campaignId, attachmentIds } = req.body;
    if (!to || !EMAIL_RE.test(to)) throw ApiError.badRequest('A valid recipient "to" is required');
    if (!subject) throw ApiError.badRequest('A subject is required');
    const budget = await sendService.remainingToday(req.userId);
    if (budget.remaining <= 0) {
      throw ApiError.badRequest(`Daily limit of ${budget.cap} already reached (${budget.usedToday} sent today).`);
    }
    const result = await sendService.sendOne(req.userId, { to, name, subject, html, campaign, campaignId, attachmentIds });
    return ok(res, result, result.status === 'delivered' ? 'Sent' : 'Send failed');
  }),
};
