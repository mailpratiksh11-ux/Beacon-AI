import { Router } from 'express';
import { applicationController } from '../controllers/application.controller.js';

const router = Router();

router.get('/statuses', applicationController.statuses);
router.get('/stats', applicationController.stats);
router.get('/', applicationController.list);
router.get('/:id', applicationController.get);
router.patch('/:id', applicationController.patch);
router.delete('/:id', applicationController.remove);

export default router;
