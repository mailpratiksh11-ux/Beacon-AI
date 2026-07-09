import { gmailService } from '../services/gmail.service.js';
import { userService } from '../services/user.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';

export const inboxController = {
  list: asyncHandler(async (req, res) => {
    const user = await userService.getByIdWithSecrets(req.userId);
    const max = Math.min(50, parseInt(req.query.max || '25', 10));
    return ok(res, await gmailService.listInbox(user, { max, folder: req.query.folder }));
  }),

  thread: asyncHandler(async (req, res) => {
    const user = await userService.getByIdWithSecrets(req.userId);
    return ok(res, await gmailService.getThread(user, req.params.id));
  }),

  reply: asyncHandler(async (req, res) => {
    const { html } = req.body;
    if (!html || !String(html).trim()) throw ApiError.badRequest('Reply body is required');
    const user = await userService.getByIdWithSecrets(req.userId);
    return ok(res, await gmailService.reply(user, req.params.id, html), 'Reply sent');
  }),
};
