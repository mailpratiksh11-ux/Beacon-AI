import { campaignService } from '../services/campaign.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok, created, paginated } from '../utils/ApiResponse.js';

export const campaignController = {
  list: asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '20', 10);
    const { items, total } = await campaignService.list(req.userId, { status: req.query.status, search: req.query.search, page, limit });
    return paginated(res, items, { page, limit, total });
  }),

  get: asyncHandler(async (req, res) => ok(res, await campaignService.getById(req.userId, req.params.id))),

  pending: asyncHandler(async (req, res) => ok(res, await campaignService.getPending(req.userId, req.params.id))),

  create: asyncHandler(async (req, res) => created(res, await campaignService.create(req.userId, req.body), 'Campaign created')),

  update: asyncHandler(async (req, res) => ok(res, await campaignService.update(req.userId, req.params.id, req.body), 'Campaign updated')),

  remove: asyncHandler(async (req, res) => {
    await campaignService.remove(req.userId, req.params.id);
    return ok(res, null, 'Campaign deleted');
  }),

  duplicate: asyncHandler(async (req, res) => created(res, await campaignService.duplicate(req.userId, req.params.id), 'Campaign duplicated')),
};
