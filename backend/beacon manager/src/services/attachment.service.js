import { Attachment } from '../models/attachment.model.js';

export const attachmentService = {
  async create(userId, { filename, mimeType, size, data }) {
    const doc = await Attachment.create({ userId, filename, mimeType, size, data });
    return { id: doc.id, filename: doc.filename, mimeType: doc.mimeType, size: doc.size };
  },

  // Load attachments (with bytes) for a send — scoped to the owner.
  async getByIds(userId, ids) {
    if (!Array.isArray(ids) || ids.length === 0) return [];
    return Attachment.find({ userId, id: { $in: ids } }).select('+data');
  },

  async remove(userId, id) {
    await Attachment.findOneAndDelete({ id, userId });
    return true;
  },
};
