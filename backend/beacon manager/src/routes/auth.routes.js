import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';

const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

router.get('/google/status', authController.googleStatus);
router.get('/google', authController.googleStart);
router.get('/google/callback', authController.googleCallback);

export default router;
