import { verifyToken } from '../utils/token.js';
import { ApiError } from '../utils/ApiError.js';

// Requires a valid Bearer token; sets req.userId for downstream handlers.
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  // Prefer the Authorization header; fall back to ?token= for browser downloads (<a href>).
  const token = header.startsWith('Bearer ') ? header.slice(7) : req.query.token || null;
  if (!token) return next(new ApiError(401, 'Authentication required'));
  try {
    const payload = verifyToken(token);
    req.userId = payload.uid;
    return next();
  } catch {
    return next(new ApiError(401, 'Invalid or expired session'));
  }
}
