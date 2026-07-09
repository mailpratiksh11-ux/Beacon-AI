import { dashboardService } from '../services/dashboard.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/ApiResponse.js';

export const dashboardController = {
  stats: asyncHandler(async (req, res) => ok(res, await dashboardService.getStats(req.userId))),

  recentCampaigns: asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit || '6', 10);
    return ok(res, await dashboardService.recentCampaigns(req.userId, limit));
  }),

  analytics: asyncHandler(async (req, res) => ok(res, await dashboardService.analytics(req.userId))),
};
