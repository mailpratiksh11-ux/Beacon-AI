import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

/**
 * `org` records which workspace this session was opened against, since a user
 * may belong to several and the choice is made at login.
 *
 * It is a statement of intent, not a grant. requireAuth still checks for a
 * live Membership on every request, so a token minted before someone was
 * removed from a team stops working immediately rather than at expiry.
 */
export function signToken(userId, orgId) {
  const payload = { uid: String(userId) };
  if (orgId) payload.org = String(orgId);
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

export function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret); // throws if invalid/expired
}
