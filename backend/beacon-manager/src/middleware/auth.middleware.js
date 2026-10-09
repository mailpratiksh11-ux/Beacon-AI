import { verifyToken } from '../utils/token.js';
import { ApiError } from '../utils/ApiError.js';
import { User } from '../models/user.model.js';
import { organizationService } from '../services/organization.service.js';

/**
 * Requires a valid Bearer token; sets req.userId, req.orgId and req.orgRole.
 *
 * orgId is resolved from the database rather than carried in the JWT on
 * purpose: a token issued before someone joined or left an organization would
 * otherwise keep showing them the wrong workspace until it expired. Membership
 * changes need to take effect on the next request, not the next login.
 *
 * The cost is one indexed findOne per authenticated request. That is fine at
 * current scale and is the obvious thing to put behind the Redis cache if it
 * ever stops being fine.
 */
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  // Prefer the Authorization header; fall back to ?token= for browser downloads (<a href>).
  const token = header.startsWith('Bearer ') ? header.slice(7) : req.query.token || null;
  if (!token) return next(new ApiError(401, 'Authentication required'));

  let uid;
  try {
    uid = verifyToken(token).uid;
  } catch {
    return next(new ApiError(401, 'Invalid or expired session'));
  }

  try {
    // email is selected because it is `required` on the schema, and ensureFor
    // below saves the document — a partially loaded doc would fail validation.
    const user = await User.findOne({ id: uid }).select('id email name orgId orgRole maxPerDay plan');
    if (!user) return next(new ApiError(401, 'Invalid or expired session'));

    req.userId = user.id;
    req.orgRole = user.orgRole || 'owner';
    // Safety net. After backfill-orgs.js has run this never fires, but an
    // account created by a path that forgot to call ensureFor would otherwise
    // land in the app with no org and see none of its own data.
    req.orgId = user.orgId || (await organizationService.ensureFor(user));

    return next();
  } catch (err) {
    return next(err);
  }
}
