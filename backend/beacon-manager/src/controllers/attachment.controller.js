import { attachmentService } from '../services/attachment.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok, created } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';

export const attachmentController = {
  // Upload one or more files → returns lightweight refs (no bytes) to reference on send.
  upload: asyncHandler(async (req, res) => {
    const files = req.files || [];
    if (files.length === 0) throw ApiError.badRequest('No files uploaded (expected form field "files")');
    const saved = [];
    for (const f of files) {
      saved.push(await attachmentService.create(req.userId, {
        filename: f.originalname,
        mimeType: f.mimetype,
        size: f.size,
        data: f.buffer,
      }));
    }
    return created(res, saved, `Uploaded ${saved.length} attachment${saved.length === 1 ? '' : 's'}`);
  }),

  remove: asyncHandler(async (req, res) => {
    await attachmentService.remove(req.userId, req.params.id);
    return ok(res, null, 'Attachment removed');
  }),
};
