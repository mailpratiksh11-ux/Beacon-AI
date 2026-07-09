import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller.js';

const router = Router();

router.get('/stats', dashboardController.stats);
router.get('/recent-campaigns', dashboardController.recentCampaigns);
router.get('/analytics', dashboardController.analytics);

export default router;
