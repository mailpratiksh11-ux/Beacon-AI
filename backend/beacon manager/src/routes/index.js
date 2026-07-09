import { Router } from 'express';
import campaignRoutes from './campaign.routes.js';
import emailRoutes from './email.routes.js';
import templateRoutes from './template.routes.js';
import contactRoutes from './contact.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import profileRoutes from './profile.routes.js';
import authRoutes from './auth.routes.js';
import sendRoutes from './send.routes.js';
import resumeRoutes from './resume.routes.js';
import attachmentRoutes from './attachment.routes.js';
import inboxRoutes from './inbox.routes.js';
import aiRoutes from './ai.routes.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', (req, res) => {
  res.json({
    success: true,
    name: 'Beacon AI API',
    version: '0.1.0',
    endpoints: ['/api/auth', '/api/send', '/api/resumes', '/api/profile', '/api/dashboard', '/api/campaigns', '/api/emails', '/api/templates', '/api/contacts'],
  });
});

// Public
router.use('/auth', authRoutes);

// Protected — every route below requires a valid session and is scoped to req.userId
router.use('/send', requireAuth, sendRoutes);
router.use('/resumes', requireAuth, resumeRoutes);
router.use('/attachments', requireAuth, attachmentRoutes);
router.use('/inbox', requireAuth, inboxRoutes);
router.use('/ai', requireAuth, aiRoutes);
router.use('/profile', requireAuth, profileRoutes);
router.use('/dashboard', requireAuth, dashboardRoutes);
router.use('/campaigns', requireAuth, campaignRoutes);
router.use('/emails', requireAuth, emailRoutes);
router.use('/templates', requireAuth, templateRoutes);
router.use('/contacts', requireAuth, contactRoutes);

export default router;
