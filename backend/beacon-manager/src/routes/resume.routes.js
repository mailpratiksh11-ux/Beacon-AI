import { Router } from 'express';
import multer from 'multer';
import { resumeController } from '../controllers/resume.controller.js';
import { ApiError } from '../utils/ApiError.js';

const ALLOWED = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    if (ALLOWED.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Only PDF or Word documents are allowed'));
  },
});

// Convert multer/file-filter errors into clean 400s
const uploadSingle = (req, res, next) =>
  upload.single('file')(req, res, (err) => (err ? next(ApiError.badRequest(err.message)) : next()));

const router = Router();

router.get('/', resumeController.list);
router.post('/', uploadSingle, resumeController.upload);
router.get('/:id/download', resumeController.download);
router.delete('/:id', resumeController.remove);

export default router;
