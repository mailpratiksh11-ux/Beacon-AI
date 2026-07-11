import { jobService } from '../services/job.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok, created, paginated } from '../utils/ApiResponse.js';

export const jobController = {
  // Available connectors + which are enabled (for the sources panel).
  sources: asyncHandler(async (req, res) => ok(res, jobService.sources())),

  // Search this user's job pool with all filters, paginated.
  search: asyncHandler(async (req, res) => {
    const { items, total, page, limit } = await jobService.search(req.userId, req.query);
    return paginated(res, items, { page, limit, total });
  }),

  get: asyncHandler(async (req, res) => ok(res, await jobService.getById(req.userId, req.params.id))),

  // Pull fresh postings from the enabled connectors into the user's pool.
  sync: asyncHandler(async (req, res) => {
    const result = await jobService.sync(req.userId, { source: req.body.source, search: req.body.search, limit: req.body.limit });
    return ok(res, result, `Imported ${result.imported} job${result.imported === 1 ? '' : 's'}`);
  }),

  // Add a job by pasting its details (any source).
  importManual: asyncHandler(async (req, res) => created(res, await jobService.importManual(req.userId, req.body), 'Job added')),

  // Save / favorite / archive / prioritize / note a job.
  save: asyncHandler(async (req, res) => ok(res, await jobService.save(req.userId, req.params.id, req.body), 'Saved')),
  unsave: asyncHandler(async (req, res) => ok(res, await jobService.unsave(req.userId, req.params.id), 'Removed from saved')),
  listSaved: asyncHandler(async (req, res) => ok(res, await jobService.listSaved(req.userId, req.query))),
};
