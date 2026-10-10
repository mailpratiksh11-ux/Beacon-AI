import { organizationService } from '../services/organization.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok, created } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Only owners and admins may change the workspace or its membership.
 *
 * req.orgRole comes from the Membership row that requireAuth just verified,
 * not from the token, so a member cannot award themselves a role by editing
 * their own profile or forging a claim.
 */
function requireManager(req) {
  if (req.orgRole !== 'owner' && req.orgRole !== 'admin') {
    throw new ApiError(403, 'Only the workspace owner or an admin can do that');
  }
}

export const orgController = {
  get: asyncHandler(async (req, res) => {
    const [org, members] = await Promise.all([
      organizationService.byId(req.orgId),
      organizationService.listMembers(req.orgId),
    ]);
    if (!org) throw ApiError.notFound('Organization not found');
    return ok(res, {
      id: org.id,
      name: org.name,
      slug: org.slug,
      personal: org.personal,
      plan: org.plan,
      maxPerDay: org.maxPerDay,
      seatLimit: org.seatLimit,
      seatsUsed: members.length,
      yourRole: req.orgRole,
      members,
    });
  }),

  update: asyncHandler(async (req, res) => {
    requireManager(req);
    const org = await organizationService.updateOrg(req.orgId, req.body || {});
    return ok(res, { id: org.id, name: org.name, slug: org.slug, maxPerDay: org.maxPerDay }, 'Workspace updated');
  }),

  listMembers: asyncHandler(async (req, res) => ok(res, await organizationService.listMembers(req.orgId))),

  addMember: asyncHandler(async (req, res) => {
    requireManager(req);
    const result = await organizationService.addMember(req.orgId, {
      email: req.body?.email,
      role: req.body?.role || 'member',
    });
    // `link` goes back to the caller on purpose: system email is not configured
    // on every deployment, and an invite that silently goes nowhere is worse
    // than one the owner pastes into Slack themselves.
    return created(res, result, result.emailed ? 'Invitation sent' : 'Member added — share the link with them');
  }),

  removeMember: asyncHandler(async (req, res) => {
    requireManager(req);
    if (req.params.userId === req.userId) throw ApiError.badRequest('You cannot remove yourself');
    return ok(res, await organizationService.removeMember(req.orgId, req.params.userId), 'Member removed');
  }),

  /** The workspaces this user can sign in to — for a switcher. */
  mine: asyncHandler(async (req, res) => ok(res, await organizationService.listForUser(req.userId))),
};
