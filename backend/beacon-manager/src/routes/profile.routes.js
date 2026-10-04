import { Router } from 'express';
import { profileController } from '../controllers/profile.controller.js';

const router = Router();

router.route('/').get(profileController.get).patch(profileController.update).put(profileController.update);

export default router;
