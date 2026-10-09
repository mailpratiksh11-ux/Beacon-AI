import { User } from '../models/user.model.js';
import { ApiError } from '../utils/ApiError.js';
import { encryptSecret } from '../utils/crypto.js';
import { organizationService } from './organization.service.js';

const deriveName = (email) => {
  const local = (email || '').split('@')[0] || 'user';
  return local.split(/[._-]+/).filter(Boolean).map((s) => s[0].toUpperCase() + s.slice(1)).join(' ') || 'User';
};

export const userService = {
  async getById(id) {
    const user = await User.findOne({ id });
    if (!user) throw ApiError.notFound('User not found');
    return user;
  },

  // Includes secrets needed for sending + AI
  async getByIdWithSecrets(id) {
    return User.findOne({ id }).select('+mailPassword +googleRefreshToken +microsoftRefreshToken +aiCustomApiKey');
  },

  async findByEmail(email) {
    return User.findOne({ email: String(email).toLowerCase() });
  },

  // Email sign-in: find or create a workspace for this email
  async upsertByEmail(email, name) {
    const addr = String(email).toLowerCase();
    let user = await User.findOne({ email: addr });
    if (!user) user = await User.create({ email: addr, name: name?.trim() || deriveName(addr) });
    await organizationService.ensureFor(user);
    return user;
  },

  // Google sign-in: find by googleId or email, store the refresh token
  async upsertByGoogle({ googleId, email, name, avatarUrl, refreshToken }) {
    const addr = String(email).toLowerCase();
    let user = (await User.findOne({ googleId })) || (await User.findOne({ email: addr }));
    if (!user) user = new User({ email: addr });
    user.googleId = googleId || user.googleId;
    user.email = addr;
    if (name) user.name = name;
    if (avatarUrl) user.avatarUrl = avatarUrl;
    user.gmailAccount = addr;
    user.gmailConnected = true;
    if (refreshToken) user.googleRefreshToken = encryptSecret(refreshToken);
    await user.save();
    // Google sign-in creates the account on first use, so the org has to be
    // created here too — not only in password registration.
    await organizationService.ensureFor(user);
    return user;
  },

  // Microsoft sign-in: find by microsoftId or email, store the refresh token.
  async upsertByMicrosoft({ microsoftId, email, name, refreshToken }) {
    const addr = String(email).toLowerCase();
    let user = (microsoftId && (await User.findOne({ microsoftId }))) || (await User.findOne({ email: addr }));
    if (!user) user = new User({ email: addr });
    user.microsoftId = microsoftId || user.microsoftId;
    user.email = addr;
    if (name) user.name = name;
    user.outlookAccount = addr;
    user.outlookConnected = true;
    // Microsoft only returns a refresh token on the first consent; keep the existing one otherwise.
    if (refreshToken) user.microsoftRefreshToken = encryptSecret(refreshToken);
    await user.save();
    await organizationService.ensureFor(user);
    return user;
  },

  async update(id, payload) {
    const user = await this.getById(id);
    const allowed = ['name', 'signature', 'role', 'mailUser', 'mailHost', 'mailPort', 'mailFromName', 'maxPerDay', 'gmailConnected', 'plan', 'aiEnabled', 'aiModel', 'aiUseCustom', 'aiCustomBaseUrl', 'aiCustomModel'];
    for (const key of allowed) if (payload[key] !== undefined) user[key] = payload[key];
    // Secrets are encrypted at rest; only updated when a non-empty value is sent.
    if (payload.mailPassword) user.mailPassword = encryptSecret(payload.mailPassword.replace(/\s+/g, ''));
    if (payload.aiCustomApiKey) user.aiCustomApiKey = encryptSecret(String(payload.aiCustomApiKey).trim());
    if (payload.mailUser !== undefined) user.gmailAccount = payload.mailUser;
    await user.save();
    return user;
  },
};
