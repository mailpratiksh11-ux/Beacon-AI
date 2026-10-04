import { Resume } from '../models/resume.model.js';
import { ApiError } from '../utils/ApiError.js';

export const resumeService = {
  async list(userId) {
    return Resume.find({ userId }).sort({ createdAt: -1 });
  },

  async create(userId, { filename, mimeType, size, data }) {
    return Resume.create({ userId, filename, mimeType, size, data });
  },

  async getWithData(userId, id) {
    const resume = await Resume.findOne({ id, userId }).select('+data');
    if (!resume) throw ApiError.notFound('Resume not found');
    return resume;
  },

  // The user's default resume = their most recent upload (with bytes), or null.
  async getLatestWithData(userId) {
    return Resume.findOne({ userId }).sort({ createdAt: -1 }).select('+data');
  },

  async remove(userId, id) {
    const resume = await Resume.findOneAndDelete({ id, userId });
    if (!resume) throw ApiError.notFound('Resume not found');
    return resume;
  },
};
