import { authService } from '../services/auth.service.js';
import { googleService } from '../services/google.service.js';
import { microsoftService } from '../services/microsoft.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok, created } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function safeReturn(url) {
  const base = url && /^https?:\/\/localhost(:\d+)?$/.test(url) ? url : env.frontendUrl;
  return base.replace(/\/$/, '');
}

export const authController = {
  register: asyncHandler(async (req, res) => {
    const { email, password, name } = req.body;
    if (!email || !EMAIL_RE.test(email)) throw ApiError.badRequest('A valid email is required');
    if (!password || password.length < 6) throw ApiError.badRequest('Password must be at least 6 characters');
    const result = await authService.register(email, password, name);
    return created(res, result, 'Account created');
  }),

  login: asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) throw ApiError.badRequest('Email and password are required');
    const result = await authService.login(email, password);
    return ok(res, result, 'Signed in');
  }),

  forgotPassword: asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email || !EMAIL_RE.test(email)) throw ApiError.badRequest('A valid email is required');
    const result = await authService.requestReset(email);
    // Don't reveal whether the email exists; include previewUrl in dev (Ethereal test mode)
    return ok(res, { previewUrl: result.previewUrl || null }, 'If that email exists, a reset link has been sent.');
  }),

  resetPassword: asyncHandler(async (req, res) => {
    const { token, password } = req.body;
    if (!token) throw ApiError.badRequest('Reset token is required');
    if (!password || password.length < 6) throw ApiError.badRequest('Password must be at least 6 characters');
    const result = await authService.resetPassword(token, password);
    return ok(res, result, 'Password updated');
  }),

  // ---- Google OAuth (unchanged) ----
  googleStatus: asyncHandler(async (req, res) => ok(res, { configured: googleService.isConfigured() })),

  googleStart: asyncHandler(async (req, res) => {
    const ret = safeReturn(req.query.return);
    if (!googleService.isConfigured()) return res.redirect(`${ret}/login?error=google_not_configured`);
    const state = Buffer.from(JSON.stringify({ ret })).toString('base64url');
    return res.redirect(googleService.getAuthUrl(state));
  }),

  googleCallback: asyncHandler(async (req, res) => {
    let ret = env.frontendUrl;
    try { if (req.query.state) ret = safeReturn(JSON.parse(Buffer.from(req.query.state, 'base64url').toString()).ret); } catch {}
    if (req.query.error || !req.query.code) return res.redirect(`${ret}/login?error=google_denied`);
    try {
      const { token } = await authService.loginWithGoogleCode(req.query.code);
      return res.redirect(`${ret}/auth/callback?token=${encodeURIComponent(token)}`);
    } catch (e) {
      console.error('Google callback error:', e.message); // eslint-disable-line no-console
      return res.redirect(`${ret}/login?error=google_failed`);
    }
  }),

  // ---- Microsoft OAuth (mirrors Google) ----
  microsoftStatus: asyncHandler(async (req, res) => ok(res, { configured: microsoftService.isConfigured() })),

  microsoftStart: asyncHandler(async (req, res) => {
    const ret = safeReturn(req.query.return);
    if (!microsoftService.isConfigured()) return res.redirect(`${ret}/login?error=microsoft_not_configured`);
    const state = Buffer.from(JSON.stringify({ ret })).toString('base64url');
    return res.redirect(microsoftService.getAuthUrl(state));
  }),

  microsoftCallback: asyncHandler(async (req, res) => {
    let ret = env.frontendUrl;
    try { if (req.query.state) ret = safeReturn(JSON.parse(Buffer.from(req.query.state, 'base64url').toString()).ret); } catch {}
    if (req.query.error || !req.query.code) return res.redirect(`${ret}/login?error=microsoft_denied`);
    try {
      const { token } = await authService.loginWithMicrosoftCode(req.query.code);
      return res.redirect(`${ret}/auth/callback?token=${encodeURIComponent(token)}`);
    } catch (e) {
      console.error('Microsoft callback error:', e.message); // eslint-disable-line no-console
      return res.redirect(`${ret}/login?error=microsoft_failed`);
    }
  }),
};
