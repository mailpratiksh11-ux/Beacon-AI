import { Email } from '../models/email.model.js';
import { ApiError } from '../utils/ApiError.js';

export const emailService = {
  async list(userId, { status, search, page = 1, limit = 8 }) {
    const filter = { userId };
    if (status && status !== 'all') filter.status = status;
    if (search) {
      filter.$or = [
        { recipient: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
      ];
    }
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Email.find(filter).sort({ sentAt: -1 }).skip(skip).limit(limit),
      Email.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  },

  async getById(userId, id) {
    const email = await Email.findOne({ id, userId });
    if (!email) throw ApiError.notFound('Email not found');
    return email;
  },

  async create(userId, payload) {
    return Email.create({ ...payload, userId });
  },

  async remove(userId, id) {
    const email = await Email.findOneAndDelete({ id, userId });
    if (!email) throw ApiError.notFound('Email not found');
    return email;
  },
};
