import { emailService } from '../services/email.service.js';
import { sendService } from '../services/send.service.js';
import { mailboxFor } from '../services/mailbox.service.js';
import { userService } from '../services/user.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok, created, paginated } from '../utils/ApiResponse.js';

export const emailController = {
  list: asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '8', 10);
    const { items, total } = await emailService.list(req.userId, { status: req.query.status, search: req.query.search, page, limit });
    return paginated(res, items, { page, limit, total });
  }),

  get: asyncHandler(async (req, res) => ok(res, await emailService.getById(req.userId, req.params.id))),

  create: asyncHandler(async (req, res) => created(res, await emailService.create(req.userId, req.body), 'Email logged')),

  remove: asyncHandler(async (req, res) => {
    await emailService.remove(req.userId, req.params.id);
    return ok(res, null, 'Email deleted');
  }),

  // Re-send a previously sent/failed email (logs a new history entry).
  resend: asyncHandler(async (req, res) => {
    const email = await emailService.getById(req.userId, req.params.id);
    const result = await sendService.sendOne(req.userId, {
      to: email.recipient,
      name: email.name || '',
      subject: email.subject,
      html: email.html || '',
      campaign: email.campaign || 'Resend',
      campaignId: email.campaignId || undefined,
    });
    return ok(res, result, result.status === 'delivered' ? 'Resent' : 'Resend failed');
  }),

  // Which recipients were sent to / failed — for filtering contacts on Compose.
  recipientStatuses: asyncHandler(async (req, res) => ok(res, await emailService.recipientStatuses(req.userId))),

  // Read the connected mailbox's bounce notices and flip matching history rows to "bounced".
  syncBounces: asyncHandler(async (req, res) => {
    const user = await userService.getByIdWithSecrets(req.userId);
    const bounces = await mailboxFor(user).listBounces(user);
    const updated = await emailService.markBounced(req.userId, bounces.map((b) => b.email));
    return ok(res, { checked: bounces.length, updated }, updated ? `Marked ${updated} as bounced` : 'No new bounces found');
  }),
};
