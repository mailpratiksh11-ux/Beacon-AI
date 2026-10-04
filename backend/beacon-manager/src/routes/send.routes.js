import { Router } from 'express';
import { sendController } from '../controllers/send.controller.js';

const router = Router();

router.get('/status', sendController.status);
router.post('/', sendController.send);

// Background bulk send (BullMQ)
router.post('/bulk', sendController.bulk);
router.get('/batch/:id', sendController.batch);
router.post('/batch/:id/:action', sendController.control); // action = pause | resume | cancel

export default router;
