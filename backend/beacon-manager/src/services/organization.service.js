import crypto from 'crypto';
import { Organization } from '../models/organization.model.js';
import { Membership } from '../models/membership.model.js';
import { User } from '../models/user.model.js';
import { mailer } from './mailer.service.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function deriveName(email) {
  const local = (email || '').split('@')[0] || 'there';
  return local.split(/[._-]+/).filter(Boolean).map((s) => s[0].toUpperCase() + s.slice(1)).join(' ') || 'There';
}

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

  /**
   * Make sure a membership row exists, without failing if it already does.
   *
   * Upsert rather than create: the unique index on (userId, orgId) turns a
   * duplicate into a thrown error, and both accepting an invitation twice and
   * repairing an old account are ordinary things to do.
   */
  async ensureMembership(userId, orgId, role = 'member') {
    await Membership.updateOne(
      { userId, orgId },
      { $setOnInsert: { userId, orgId, role } },
      { upsert: true }
    );
    return Membership.findOne({ userId, orgId });
  },

  /**
   * Repair a missing membership — but only for the organization's own owner.
   *
   * Scoped that tightly on purpose. user.orgId is not revoked when someone is
   * removed from a team, so healing on that alone would hand access straight
   * back to the person who was just removed. An owner cannot be removed from
   * their own org, which makes them the one case where a missing row can only
   * mean data from the window before memberships existed.
   */
  async healOwnerMembership(userId, orgId) {
    const org = await Organization.findOne({ id: orgId });
    if (!org || org.ownerId !== userId) return null;
    return this.ensureMembership(userId, orgId, 'owner');
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

  // ---- Members -------------------------------------------------------------

  /** Everyone in this org, owner first. */
  async listMembers(orgId) {
    const [org, rows] = await Promise.all([
      Organization.findOne({ id: orgId }),
      Membership.find({ orgId }).sort({ createdAt: 1 }),
    ]);
    if (!org) throw ApiError.notFound('Organization not found');

    const users = await User.find({ id: { $in: rows.map((r) => r.userId) } }).select('id email name avatarUrl passwordHash');
    const byId = new Map(users.map((u) => [u.id, u]));

    return rows
      .map((r) => {
        const u = byId.get(r.userId);
        if (!u) return null;
        return {
          userId: u.id,
          email: u.email,
          name: u.name || '',
          avatarUrl: u.avatarUrl || '',
          role: r.role,
          isOwner: org.ownerId === u.id,
          // No password hash and never signed in with a provider means they
          // were added here and have not used their invite link yet.
          pending: !u.passwordHash,
          joinedAt: r.createdAt,
        };
      })
      .filter(Boolean)
      .sort((a, b) => Number(b.isOwner) - Number(a.isOwner));
  },

  /**
   * Add someone to the organization by email.
   *
   * Creates the account if it does not exist, so an owner can add a teammate
   * who has never heard of Beacon. Either way the person gets a link that sets
   * a password and signs them straight in, reusing the password-reset flow
   * that already exists rather than inventing a parallel one.
   *
   * The link is also returned to the caller. System email is not configured on
   * every deployment, and an invite that silently goes nowhere is worse than
   * one the owner has to paste into Slack themselves.
   */
  async addMember(orgId, { email, role = 'member' }) {
    const addr = String(email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr)) throw ApiError.badRequest('A valid email address is required');
    if (!['admin', 'member'].includes(role)) throw ApiError.badRequest('Role must be admin or member');

    const org = await Organization.findOne({ id: orgId });
    if (!org) throw ApiError.notFound('Organization not found');

    const seatsUsed = await Membership.countDocuments({ orgId });
    if (seatsUsed >= org.seatLimit) {
      throw ApiError.badRequest(`This workspace is limited to ${org.seatLimit} seats. Remove someone first, or upgrade.`);
    }

    let user = await User.findOne({ email: addr }).select('+passwordHash');
    const isNew = !user;
    if (!user) user = await User.create({ email: addr, name: deriveName(addr) });

    if (await Membership.findOne({ userId: user.id, orgId })) {
      throw ApiError.conflict('That person is already in this workspace');
    }
    await Membership.create({ userId: user.id, orgId, role });

    // Land them in this workspace on their next sign-in. Only meaningful for a
    // brand new account — an existing user keeps whatever they were last using.
    if (!user.orgId) {
      user.orgId = orgId;
      user.orgRole = role;
    }

    // A set-password link, valid for a week rather than the hour a reset gets.
    // Someone being added to a team may not check their mail until Monday.
    const token = crypto.randomBytes(32).toString('hex');
    user.resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');
    user.resetTokenExpiry = new Date(Date.now() + INVITE_TTL_MS);
    await user.save();

    const link = `${env.frontendUrl.replace(/\/$/, '')}/reset-password?token=${token}`;

    let emailed = false;
    try {
      const { mode } = await mailer.sendSystem({
        to: addr,
        subject: `You've been added to ${org.name} on Beacon AI`,
        html: `
          <div style="font-family:sans-serif;max-width:480px">
            <h2 style="margin:0 0 12px">You've been added to ${org.name}</h2>
            <p>Beacon AI is the tool ${org.name} uses to send outreach email. Set a password to get in &mdash; this link works for 7 days.</p>
            <p><a href="${link}" style="display:inline-block;background:#c2621b;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Set your password</a></p>
            <p style="color:#64748b;font-size:12px">To sign in later, use <strong>${org.slug}</strong> as the organization.</p>
            <p style="color:#64748b;font-size:12px">Not expecting this? You can ignore the email and nothing happens.</p>
          </div>`,
      });
      // ethereal is the fallback test inbox — the mail went nowhere real.
      emailed = mode !== 'ethereal';
    } catch {
      emailed = false;
    }

    return { link, emailed, isNew, seatsUsed: seatsUsed + 1, seatLimit: org.seatLimit };
  },

  /** Remove someone. The owner cannot be removed — they would orphan the org. */
  async removeMember(orgId, userId) {
    const org = await Organization.findOne({ id: orgId });
    if (!org) throw ApiError.notFound('Organization not found');
    if (org.ownerId === userId) throw ApiError.badRequest('The workspace owner cannot be removed');

    const { deletedCount } = await Membership.deleteOne({ orgId, userId });
    if (!deletedCount) throw ApiError.notFound('That person is not in this workspace');

    // Clear their last-used pointer if it named this org, so their next login
    // falls back to a workspace they can still reach rather than being refused.
    await User.updateOne({ id: userId, orgId }, { $set: { orgId: '' } });
    return { removed: true };
  },

  async updateOrg(orgId, patch) {
    const org = await Organization.findOne({ id: orgId });
    if (!org) throw ApiError.notFound('Organization not found');

    if (patch.name !== undefined) {
      const name = String(patch.name).trim();
      if (!name) throw ApiError.badRequest('Workspace name cannot be empty');
      org.name = name.slice(0, 120);
      // Naming it means it is no longer just a personal account.
      org.personal = false;
    }
    if (patch.maxPerDay !== undefined) {
      const n = Number(patch.maxPerDay);
      if (!Number.isFinite(n) || n < 1 || n > 5000) throw ApiError.badRequest('Daily limit must be between 1 and 5000');
      org.maxPerDay = Math.round(n);
    }

    await org.save();
    return org;
  },
};
