import { Organization } from '../models/organization.model.js';

function nameFor(user) {
  const who = (user.name || '').trim() || (user.email || '').split('@')[0] || 'My';
  return `${who}'s workspace`;
}

export const organizationService = {
  /**
   * Give this user an organization if they do not have one, and return its id.
   *
   * Must be called from EVERY path that creates a user — password signup,
   * upsertByEmail, upsertByGoogle and upsertByMicrosoft. Google and Microsoft
   * create the account on first sign-in, so missing those two would leave
   * OAuth users with no org and, once queries scope on orgId, an app that
   * shows them nothing at all.
   *
   * Idempotent: a user who already has an orgId keeps it, so this is safe to
   * call on every sign-in rather than only on the first.
   *
   * Deliberately does NOT copy mail credentials onto the org. A brand new user
   * has none, and an existing user's are handled by backfill-orgs.js, which
   * reads the raw document — mailPassword is `select: false`, so a user loaded
   * through mongoose here would silently carry an empty password across.
   */
  async ensureFor(user, { name } = {}) {
    if (user.orgId) return user.orgId;

    // A name given at signup means the user is setting up a real workspace they
    // intend to invite people into, so it is not marked personal — that flag is
    // what keeps team UI out of the way for someone who just wants an account.
    const named = String(name || '').trim();

    const org = await Organization.create({
      name: named || nameFor(user),
      ownerId: user.id,
      personal: !named,
      maxPerDay: user.maxPerDay || 250,
      plan: user.plan || 'free',
    });

    user.orgId = org.id;
    user.orgRole = 'owner';
    await user.save();

    return org.id;
  },

  async byId(orgId) {
    return Organization.findOne({ id: orgId });
  },

  /** Loaded with secrets, for the sending path only. */
  async byIdWithSecrets(orgId) {
    return Organization.findOne({ id: orgId }).select('+mailPassword');
  },
};
