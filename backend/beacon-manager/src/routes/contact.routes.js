import { Router } from 'express';
import { contactController } from '../controllers/contact.controller.js';

const router = Router();

router.route('/').get(contactController.list).post(contactController.create);
router.post('/import', contactController.bulkImport);
router.post('/bulk-delete', contactController.bulkRemove);
router.get('/groups', contactController.groups);
// Must stay above '/:id' or "export" is read as a contact id.
router.get('/export', contactController.export);
router.post('/group', contactController.bulkGroup);
router
  .route('/:id')
  .get(contactController.get)
  .patch(contactController.update)
  .put(contactController.update)
  .delete(contactController.remove);

export default router;
