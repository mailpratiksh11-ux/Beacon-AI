import { Router } from 'express';
import { aiController } from '../controllers/ai.controller.js';

const router = Router();

router.get('/status', aiController.status);
router.post('/generate', aiController.generate);

// Direct OpenRouter helpers (example routes)
router.post('/rewrite', aiController.rewrite);       // { email }   → { success, data }
router.post('/grammar', aiController.grammar);       // { text }    → { success, data }
router.post('/subject', aiController.subject);       // { subject } → { success, data }
router.post('/cold-email', aiController.coldEmail);  // { prompt }  → { success, data }

export default router;
