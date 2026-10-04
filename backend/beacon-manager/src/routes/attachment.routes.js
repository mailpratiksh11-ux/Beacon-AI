import { Router } from 'express';
import multer from 'multer';
import { attachmentController } from '../controllers/attachment.controller.js';
import { ApiError } from '../utils/ApiError.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024, files: 8 }, // 15 MB each, up to 8 files
});

// Accept multiple files under the "files" field; convert multer errors into clean 400s.
const uploadMany = (req, res, next) =>
  upload.array('files', 8)(req, res, (err) => (err ? next(ApiError.badRequest(err.message)) : next()));

const router = Router();

router.post('/', uploadMany, attachmentController.upload);
router.delete('/:id', attachmentController.remove);

export default router;
