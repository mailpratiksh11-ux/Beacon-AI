import { contactService } from '../services/contact.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok, created, paginated } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';

export const contactController = {
  list: asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '50', 10);
    const { items, total } = await contactService.list(req.userId, { status: req.query.status, search: req.query.search, favorite: req.query.favorite, group: req.query.group, page, limit });
    return paginated(res, items, { page, limit, total });
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
    const result = await contactService.bulkCreate(req.userId, rows);
    return created(res, result, `Imported ${result.inserted + result.updated} contacts`);
  }),

  update: asyncHandler(async (req, res) => ok(res, await contactService.update(req.userId, req.params.id, req.body), 'Contact updated')),

  remove: asyncHandler(async (req, res) => {
    await contactService.remove(req.userId, req.params.id);
    return ok(res, null, 'Contact deleted');
  }),
};
