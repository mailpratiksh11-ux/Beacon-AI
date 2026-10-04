import { Router } from 'express';
import { inboxController } from '../controllers/inbox.controller.js';

const router = Router();

router.get('/', inboxController.list);
router.get('/:id', inboxController.thread);
router.post('/:id/reply', inboxController.reply);

export default router;
