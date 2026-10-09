import { Organization } from '../models/organization.model.js';
import { Membership } from '../models/membership.model.js';

function nameFor(user) {
  const who = (user.name || '').trim() || (user.email || '').split('@')[0] || 'My';
  return `${who}'s workspace`;
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

/**
 * A slug nobody else holds. People type these on the login page, so a
 * collision is not a cosmetic problem — it would send someone to the wrong
 * workspace. Two orgs called "Acme" become acme and acme-2.
 */
async function uniqueSlug(base) {
  const root = slugify(base) || 'workspace';
  for (let n = 1; n < 500; n++) {
    const candidate = n === 1 ? root : `${root}-${n}`;
    if (!(await Organization.exists({ slug: candidate }))) return candidate;
  }
  // 500 collisions on one name means something is wrong, but failing to create
  // the account would be worse than an ugly slug.
  return `${root}-${Date.now().toString(36)}`;
}

export const organizationService = {
  /**
   * Give this user an organization if they have none, and return its id.
   *
   * Must be called from EVERY path that creates a user — password signup,
   * upsertByEmail, upsertByGoogle and upsertByMicrosoft. Google and Microsoft
   * create the account on first sign-in, so missing those two would leave
   * OAuth users with no org and, once queries scope on orgId, an app that
   * shows them nothing at all.
   *
   * Idempotent: a user who already has an orgId keeps it, so this is safe to
   * call on every sign-in rather than only the first.
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
    const orgName = named || nameFor(user);

    const org = await Organization.create({
      name: orgName,
      slug: await uniqueSlug(named || user.email || orgName),
      ownerId: user.id,
      personal: !named,
      maxPerDay: user.maxPerDay || 250,
      plan: user.plan || 'free',
    });

    await Membership.create({ userId: user.id, orgId: org.id, role: 'owner' });

    user.orgId = org.id;
    user.orgRole = 'owner';
    await user.save();

    return org.id;
  },

  async byId(orgId) {
    return Organization.findOne({ id: orgId });
  },

  async bySlug(slug) {
    return Organization.findOne({ slug: slugify(slug) });
  },

  /** Loaded with secrets, for the sending path only. */
  async byIdWithSecrets(orgId) {
    return Organization.findOne({ id: orgId }).select('+mailPassword');
  },

  /**
   * Authority on access. Everything that scopes by org goes through this —
   * never through User.orgId, which is only a record of what was used last and
   * is not revoked when someone is removed from a team.
   */
  async membership(userId, orgId) {
    return Membership.findOne({ userId, orgId });
  },

  /** The organizations this user can sign in to, for the picker. */
  async listForUser(userId) {
    const rows = await Membership.find({ userId }).sort({ createdAt: 1 });
    if (!rows.length) return [];
    const orgs = await Organization.find({ id: { $in: rows.map((r) => r.orgId) } });
    const byId = new Map(orgs.map((o) => [o.id, o]));
    return rows
      .map((r) => {
        const org = byId.get(r.orgId);
        return org ? { id: org.id, name: org.name, slug: org.slug, personal: org.personal, role: r.role } : null;
      })
      .filter(Boolean);
  },
};
