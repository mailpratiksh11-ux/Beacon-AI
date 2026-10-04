import { Router } from 'express';
import { templateController } from '../controllers/template.controller.js';

const router = Router();

router.route('/').get(templateController.list).post(templateController.create);
router.post('/:id/duplicate', templateController.duplicate);
router
  .route('/:id')
  .get(templateController.get)
  .patch(templateController.update)
  .put(templateController.update)
  .delete(templateController.remove);

export default router;
