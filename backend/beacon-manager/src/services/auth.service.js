import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { User } from '../models/user.model.js';
import { userService } from './user.service.js';
import { organizationService } from './organization.service.js';
import { googleService } from './google.service.js';
import { microsoftService } from './microsoft.service.js';
import { mailer } from './mailer.service.js';
import { signToken } from '../utils/token.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

const deriveName = (email) => {
  const local = (email || '').split('@')[0] || 'user';
  return local.split(/[._-]+/).filter(Boolean).map((s) => s[0].toUpperCase() + s.slice(1)).join(' ') || 'User';
};

export const authService = {
  // Create a new account with email + password
  async register(email, password, name) {
    const addr = String(email).toLowerCase();
    const existing = await User.findOne({ email: addr });
    if (existing) throw ApiError.conflict('An account with this email already exists');
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email: addr, name: name?.trim() || deriveName(addr), passwordHash });
    await organizationService.ensureFor(user);
    return { token: signToken(user.id), user };
  },

  // Log in with email + password
  async login(email, password) {
    const addr = String(email).toLowerCase();
    const user = await User.findOne({ email: addr }).select('+passwordHash');
    if (!user || !user.passwordHash) throw new ApiError(401, 'Invalid email or password');
    const okPw = await bcrypt.compare(password, user.passwordHash);
    if (!okPw) throw new ApiError(401, 'Invalid email or password');
    return { token: signToken(user.id), user };
  },

  // Request a password reset — emails a reset link. Always resolves (don't leak which emails exist).
  async requestReset(email) {
    const addr = String(email).toLowerCase();
    const user = await User.findOne({ email: addr });
    if (!user) return { sent: false };

    const token = crypto.randomBytes(32).toString('hex');
    user.resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');
    user.resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    const link = `${env.frontendUrl.replace(/\/$/, '')}/reset-password?token=${token}`;
    const html = `
      <div style="font-family:sans-serif;max-width:480px">
        <h2>Reset your Beacon AI password</h2>
        <p>Click the button below to choose a new password. This link expires in 1 hour.</p>
        <p><a href="${link}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Reset password</a></p>
        <p style="color:#64748b;font-size:12px">If you didn't request this, you can ignore this email.</p>
      </div>`;
    const { previewUrl } = await mailer.sendSystem({ to: addr, subject: 'Reset your Beacon AI password', html });
    return { sent: true, previewUrl };
  },

  // Set a new password using a valid reset token
  async resetPassword(token, newPassword) {
    const hash = crypto.createHash('sha256').update(String(token)).digest('hex');
    const user = await User.findOne({ resetTokenHash: hash, resetTokenExpiry: { $gt: new Date() } }).select('+resetTokenHash');
    if (!user) throw ApiError.badRequest('This reset link is invalid or has expired');
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.resetTokenHash = '';
    user.resetTokenExpiry = undefined;
    await user.save();
    return { token: signToken(user.id), user };
  },

  // Google sign-in — unchanged (no password)
  async loginWithGoogleCode(code) {
    const info = await googleService.exchangeCode(code);
    const user = await userService.upsertByGoogle({
      googleId: info.googleId || info.email,
      email: info.email,
      name: info.name,
      avatarUrl: info.picture,
      refreshToken: info.refreshToken,
    });
    return { token: signToken(user.id), user };
  },

  // Microsoft sign-in — identifies the user and connects their Outlook mailbox (no password)
  async loginWithMicrosoftCode(code) {
    const info = await microsoftService.exchangeCode(code);
    if (!info.email) throw ApiError.badRequest('Microsoft did not return an email for this account');
    const user = await userService.upsertByMicrosoft({
      microsoftId: info.microsoftId || info.email,
      email: info.email,
      name: info.name,
      refreshToken: info.refreshToken,
    });
    return { token: signToken(user.id), user };
  },
};
