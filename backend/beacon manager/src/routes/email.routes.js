import { Router } from 'express';
import { emailController } from '../controllers/email.controller.js';

const router = Router();

router.route('/').get(emailController.list).post(emailController.create);
router.post('/:id/resend', emailController.resend);
router.route('/:id').get(emailController.get).delete(emailController.remove);

export default router;
