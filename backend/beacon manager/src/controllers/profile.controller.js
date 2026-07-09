import { userService } from '../services/user.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/ApiResponse.js';

// Strip secrets; expose a mailConfigured boolean instead of the password.
function sanitize(user) {
  const o = user.toJSON();
  const configured = Boolean(o.mailUser && user.mailPassword);
  const googleConnected = Boolean(user.googleRefreshToken); // can we use the Gmail API for them?
  const aiCustomConfigured = Boolean(user.aiCustomApiKey);
  delete o.mailPassword;
  delete o.googleRefreshToken;
  delete o.aiCustomApiKey;
  return { ...o, mailConfigured: configured, googleConnected, aiCustomConfigured };
}

export const profileController = {
  get: asyncHandler(async (req, res) => {
    const user = await userService.getByIdWithSecrets(req.userId);
    return ok(res, sanitize(user));
  }),

  update: asyncHandler(async (req, res) => {
    await userService.update(req.userId, req.body);
    const user = await userService.getByIdWithSecrets(req.userId);
    return ok(res, sanitize(user), 'Profile updated');
  }),
};
