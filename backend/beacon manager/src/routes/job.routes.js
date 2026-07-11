import { Router } from 'express';
import { jobController } from '../controllers/job.controller.js';
import { applicationController } from '../controllers/application.controller.js';

const router = Router();

router.get('/sources', jobController.sources);
router.get('/search', jobController.search);
router.post('/sync', jobController.sync);
router.post('/import', jobController.importManual);

// Move a job into the application tracker (spec: POST /jobs/apply).
router.post('/apply', applicationController.apply);

router.get('/saved', jobController.listSaved);
router.post('/:id/save', jobController.save);
router.delete('/:id/save', jobController.unsave);

router.get('/:id', jobController.get);

export default router;
