import { applicationService } from '../services/application.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok, created } from '../utils/ApiResponse.js';

export const applicationController = {
  statuses: asyncHandler(async (req, res) => ok(res, applicationService.statuses())),

  // POST /jobs/apply — move a job into the tracker.
  apply: asyncHandler(async (req, res) => created(res, await applicationService.apply(req.userId, req.body), 'Added to tracker')),

  // GET /applications — grouped by pipeline stage.
  list: asyncHandler(async (req, res) => ok(res, await applicationService.list(req.userId, req.query))),

  get: asyncHandler(async (req, res) => ok(res, await applicationService.getById(req.userId, req.params.id))),

  // PATCH /applications/:id — change status (appends timeline) or edit notes.
  patch: asyncHandler(async (req, res) => ok(res, await applicationService.patch(req.userId, req.params.id, req.body), 'Updated')),

  remove: asyncHandler(async (req, res) => ok(res, await applicationService.remove(req.userId, req.params.id), 'Removed')),

  stats: asyncHandler(async (req, res) => ok(res, await applicationService.stats(req.userId))),
};
