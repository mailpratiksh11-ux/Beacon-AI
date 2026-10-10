import { Router } from 'express';
import { orgController } from '../controllers/org.controller.js';

const router = Router();

router.get('/mine', orgController.mine);
router.route('/').get(orgController.get).patch(orgController.update);
router.route('/members').get(orgController.listMembers).post(orgController.addMember);
router.delete('/members/:userId', orgController.removeMember);

export default router;
