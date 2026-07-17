import { contactService } from '../services/contact.service.js';
import { emailService } from '../services/email.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok, created, paginated } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Turn a `delivery` filter into the email lists the contact query needs.
 * Send outcome lives on email history, not on the contact, so it has to be
 * resolved per request:
 *   failed → bounced or failed at least once, and never delivered
 *   sent   → delivered / opened / pending
 *   never  → no send history at all
 */
async function deliveryFilter(userId, delivery) {
  if (!delivery || delivery === 'all') return {};
  const { sent, failed } = await emailService.recipientStatuses(userId);
  if (delivery === 'failed') return { emails: failed };
  if (delivery === 'sent') return { emails: sent };
  if (delivery === 'never') return { excludeEmails: [...sent, ...failed] };
  throw ApiError.badRequest('Unknown delivery filter');
}

// The filters a request may narrow contacts by, normalized for both list and bulk delete.
async function filtersFrom(userId, src = {}) {
  return {
    status: src.status,
    search: src.search,
    favorite: src.favorite,
    group: src.group,
    ...(await deliveryFilter(userId, src.delivery)),
  };
}

export const contactController = {
  list: asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '50', 10);
    const filters = await filtersFrom(req.userId, req.query);
    const { items, total } = await contactService.list(req.userId, { ...filters, page, limit });
    return paginated(res, items, { page, limit, total });
  }),

  bulkRemove: asyncHandler(async (req, res) => {
    const { contactIds, all } = req.body;
    const filters = all ? await filtersFrom(req.userId, req.body.filters || {}) : undefined;
    const { deleted } = await contactService.bulkRemove(req.userId, { contactIds, all: !!all, filters });
    return ok(res, { deleted }, `Deleted ${deleted} contact${deleted === 1 ? '' : 's'}`);
  }),

  groups: asyncHandler(async (req, res) => ok(res, await contactService.listGroups(req.userId))),

  bulkGroup: asyncHandler(async (req, res) => {
    const { contactIds, group, action } = req.body;
    const result = await contactService.bulkGroup(req.userId, contactIds, group, action);
    return ok(res, result, action === 'remove' ? `Removed from “${result.group}”` : `Added to “${result.group}”`);
  }),

  get: asyncHandler(async (req, res) => ok(res, await contactService.getById(req.userId, req.params.id))),

  create: asyncHandler(async (req, res) => created(res, await contactService.create(req.userId, req.body), 'Contact created')),

  bulkImport: asyncHandler(async (req, res) => {
    const rows = req.body.contacts;
    if (!Array.isArray(rows) || rows.length === 0) throw ApiError.badRequest('Provide a non-empty "contacts" array');
    const result = await contactService.bulkCreate(req.userId, rows, req.body.groups);
    const n = result.inserted + result.updated;
    const into = result.groups.length ? ` into “${result.groups.join('”, “')}”` : '';
    return created(res, result, `Imported ${n} contact${n === 1 ? '' : 's'}${into}`);
  }),

  update: asyncHandler(async (req, res) => ok(res, await contactService.update(req.userId, req.params.id, req.body), 'Contact updated')),

  remove: asyncHandler(async (req, res) => {
    await contactService.remove(req.userId, req.params.id);
    return ok(res, null, 'Contact deleted');
  }),
};
