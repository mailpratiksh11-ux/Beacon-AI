import { resumeService } from '../services/resume.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok, created } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';

export const resumeController = {
  list: asyncHandler(async (req, res) => ok(res, await resumeService.list(req.userId))),

  upload: asyncHandler(async (req, res) => {
    if (!req.file) throw ApiError.badRequest('No file uploaded (expected form field "file")');
    const resume = await resumeService.create(req.userId, {
      filename: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      data: req.file.buffer,
    });
    return created(res, resume, 'Resume uploaded');
  }),

  download: asyncHandler(async (req, res) => {
    const resume = await resumeService.getWithData(req.userId, req.params.id);
    res.setHeader('Content-Type', resume.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(resume.filename)}"`);
    res.setHeader('Content-Length', resume.size);
    return res.send(resume.data);
  }),

  remove: asyncHandler(async (req, res) => {
    await resumeService.remove(req.userId, req.params.id);
    return ok(res, null, 'Resume deleted');
  }),
};
