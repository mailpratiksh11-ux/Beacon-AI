import { verifyToken } from '../utils/token.js';
import { ApiError } from '../utils/ApiError.js';
import { User } from '../models/user.model.js';
import { organizationService } from '../services/organization.service.js';

/**
 * Requires a valid Bearer token; sets req.userId, req.orgId and req.orgRole.
 *
 * The token names the organization the session was opened against, but it is
 * never trusted on its own — a live Membership is checked on every request.
 * That is what makes removing someone from a team take effect immediately
 * instead of whenever their token happens to expire, and it is why the org
 * cannot simply be read out of the JWT and used.
 *
 * The cost is one or two indexed lookups per authenticated request. Fine at
 * current scale, and the obvious thing to put behind the Redis cache if it
 * ever stops being fine.
 */
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  // Prefer the Authorization header; fall back to ?token= for browser downloads (<a href>).
  const token = header.startsWith('Bearer ') ? header.slice(7) : req.query.token || null;
  if (!token) return next(new ApiError(401, 'Authentication required'));

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    return next(new ApiError(401, 'Invalid or expired session'));
  }

  try {
    // email is selected because it is `required` on the schema, and ensureFor
    // below saves the document — a partially loaded doc would fail validation.
    const user = await User.findOne({ id: payload.uid }).select('id email name orgId orgRole maxPerDay plan');
    if (!user) return next(new ApiError(401, 'Invalid or expired session'));

    req.userId = user.id;

    // Tokens issued before organizations existed carry no org; fall back to
    // the user's last-used one so existing sessions are not all invalidated.
    const claimed = payload.org || user.orgId;

    if (claimed) {
      const membership = await organizationService.membership(user.id, claimed);
      if (!membership) {
        // Either the token names a workspace they have been removed from, or
        // the claim is forged. Both end the session rather than quietly
        // dropping them into a different org's data.
        return next(new ApiError(401, 'You no longer have access to this workspace'));
      }
      req.orgId = claimed;
      req.orgRole = membership.role;
      return next();
    }

    // No org anywhere: an account the backfill has not reached. Give it one
    // rather than serving an empty app.
    req.orgId = await organizationService.ensureFor(user);
    req.orgRole = 'owner';
    return next();
  } catch (err) {
    return next(err);
  }
}
