import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

/**
 * A user's membership of an organization.
 *
 * This is what makes one person able to belong to several organizations — a
 * consultant working with two agencies, say. The alternative, a single orgId
 * on the user, would force them into two accounts on two email addresses.
 *
 * User.orgId survives as "the one they used last", so a password login that
 * omits an org and an OAuth callback that cannot ask for one both have a
 * sensible default to fall back on. It is a convenience, never the authority:
 * access is decided by the presence of a Membership row and nothing else.
 */
const membershipSchema = new mongoose.Schema(
  {
    id: { type: String, default: () => randomUUID(), unique: true, index: true },
    userId: { type: String, ref: 'User', required: true, index: true },
    orgId: { type: String, ref: 'Organization', required: true, index: true },
    role: { type: String, enum: ['owner', 'admin', 'member'], default: 'member' },
  },
  { timestamps: true, collection: 'memberships', id: false, toJSON: { virtuals: true } }
);

// One row per person per org. Enforced here rather than in application code
// because accepting the same invitation twice is an ordinary thing to do, and
// a duplicate would silently double a seat against the org's limit.
membershipSchema.index({ userId: 1, orgId: 1 }, { unique: true });

export const Membership = mongoose.model('Membership', membershipSchema);
