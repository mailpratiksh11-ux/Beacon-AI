import { mailboxFor } from '../services/mailbox.service.js';
import { userService } from '../services/user.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';

export const inboxController = {
  list: asyncHandler(async (req, res) => {
    const user = await userService.getByIdWithSecrets(req.userId);
    // Kept at 25 a page on purpose: Gmail needs one messages.get per message,
    // so a bigger page means that many more API calls in one request. More mail
    // is reached by paging with `cursor`, not by raising `max`.
    const max = Math.min(100, Math.max(1, parseInt(req.query.max || '25', 10)));
    const cursor = String(req.query.cursor || '');
    return ok(res, await mailboxFor(user).listInbox(user, { max, folder: req.query.folder, cursor }));
  }),

  thread: asyncHandler(async (req, res) => {
    const user = await userService.getByIdWithSecrets(req.userId);
    return ok(res, await mailboxFor(user).getThread(user, req.params.id));
  }),

  reply: asyncHandler(async (req, res) => {
    const { html } = req.body;
    if (!html || !String(html).trim()) throw ApiError.badRequest('Reply body is required');
    const user = await userService.getByIdWithSecrets(req.userId);
    return ok(res, await mailboxFor(user).reply(user, req.params.id, html), 'Reply sent');
  }),
};
