import { Email } from '../models/email.model.js';
import { ApiError } from '../utils/ApiError.js';

export const emailService = {
  async list(userId, { status, search, page = 1, limit = 8 }) {
    const filter = { userId };
    if (status && status !== 'all') filter.status = status;
    if (search) {
      // Escaped: the term is user input, and an unescaped "(" or "[" would make
      // Mongo reject the query outright.
      const rx = { $regex: escapeRe(search), $options: 'i' };
      filter.$or = [{ recipient: rx }, { subject: rx }, { name: rx }];
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

  // Per-recipient send outcome across all history — used to filter contacts.
  // Returns lowercase email arrays: sent (delivered/opened) vs failed (failed/bounced).
  async recipientStatuses(userId) {
    const rows = await Email.aggregate([
      { $match: { userId } },
      { $group: { _id: '$recipient', statuses: { $addToSet: '$status' } } },
    ]);
    const sent = [];
    const failed = [];
    for (const r of rows) {
      const s = r.statuses || [];
      if (s.includes('delivered') || s.includes('opened') || s.includes('pending')) sent.push(r._id);
      else if (s.includes('failed') || s.includes('bounced')) failed.push(r._id);
      else sent.push(r._id);
    }
    return { sent, failed };
  },

  // Flip delivered/pending records for these recipients to 'bounced'.
  async markBounced(userId, emails) {
    const list = [...new Set((emails || []).map((e) => String(e).toLowerCase().trim()).filter(Boolean))];
    if (!list.length) return 0;
    const res = await Email.updateMany(
      { userId, recipient: { $in: list }, status: { $in: ['delivered', 'pending', 'opened'] } },
      { $set: { status: 'bounced' } }
    );
    return res.modifiedCount || 0;
  },
};

// Same helper as job.service.js — keeps user-typed search terms literal.
function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
