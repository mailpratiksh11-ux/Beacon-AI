import { templateService } from '../services/template.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok, created } from '../utils/ApiResponse.js';

export const templateController = {
  list: asyncHandler(async (req, res) => ok(res, await templateService.list(req.userId, { category: req.query.category, search: req.query.search }))),

  get: asyncHandler(async (req, res) => ok(res, await templateService.getById(req.userId, req.params.id))),

  create: asyncHandler(async (req, res) => created(res, await templateService.create(req.userId, req.body), 'Template created')),

  update: asyncHandler(async (req, res) => ok(res, await templateService.update(req.userId, req.params.id, req.body), 'Template updated')),

  remove: asyncHandler(async (req, res) => {
    await templateService.remove(req.userId, req.params.id);
    return ok(res, null, 'Template deleted');
  }),

  duplicate: asyncHandler(async (req, res) => created(res, await templateService.duplicate(req.userId, req.params.id), 'Template duplicated')),
};
