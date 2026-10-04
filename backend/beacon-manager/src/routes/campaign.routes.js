import { Router } from 'express';
import { campaignController } from '../controllers/campaign.controller.js';

const router = Router();

router.route('/').get(campaignController.list).post(campaignController.create);
router.post('/:id/duplicate', campaignController.duplicate);
router.get('/:id/pending', campaignController.pending);
router
  .route('/:id')
  .get(campaignController.get)
  .patch(campaignController.update)
  .put(campaignController.update)
  .delete(campaignController.remove);

export default router;
