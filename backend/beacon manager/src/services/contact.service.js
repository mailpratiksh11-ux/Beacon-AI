import { Contact } from '../models/contact.model.js';
import { ApiError } from '../utils/ApiError.js';

export const contactService = {
  async list(userId, { status, search, favorite, group, page = 1, limit = 50 }) {
    const filter = { userId };
    if (status && status !== 'all') filter.status = status;
    if (favorite === 'true' || favorite === true) filter.favorite = true;
    if (group && group !== 'all') filter.groups = group;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
      ];
    }
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Contact.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Contact.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  },

  async getById(userId, id) {
    const contact = await Contact.findOne({ id, userId });
    if (!contact) throw ApiError.notFound('Contact not found');
    return contact;
  },

  async create(userId, payload) {
    return Contact.create({ ...payload, userId });
  },

  async bulkCreate(userId, rows) {
    const ops = rows.map((r) => ({
      updateOne: {
        filter: { userId, email: String(r.email).toLowerCase() },
        update: { $set: { ...r, userId } },
        upsert: true,
      },
    }));
    const result = await Contact.bulkWrite(ops, { ordered: false });
    return { inserted: result.upsertedCount, updated: result.modifiedCount };
  },

  async update(userId, id, payload) {
    const contact = await Contact.findOneAndUpdate({ id, userId }, payload, { new: true, runValidators: true });
    if (!contact) throw ApiError.notFound('Contact not found');
    return contact;
  },

  async remove(userId, id) {
    const contact = await Contact.findOneAndDelete({ id, userId });
    if (!contact) throw ApiError.notFound('Contact not found');
    return contact;
  },

  // Distinct group names for this user, with a count each
  async listGroups(userId) {
    const rows = await Contact.aggregate([
      { $match: { userId } },
      { $unwind: '$groups' },
      { $group: { _id: '$groups', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    return rows.map((r) => ({ name: r._id, count: r.count })).filter((g) => g.name);
  },

  // Add or remove a group tag on many contacts at once
  async bulkGroup(userId, contactIds, group, action = 'add') {
    const name = String(group || '').trim();
    if (!name) throw ApiError.badRequest('Group name is required');
    if (!Array.isArray(contactIds) || contactIds.length === 0) throw ApiError.badRequest('Select at least one contact');
    const update = action === 'remove' ? { $pull: { groups: name } } : { $addToSet: { groups: name } };
    const res = await Contact.updateMany({ userId, id: { $in: contactIds } }, update);
    return { matched: res.matchedCount, modified: res.modifiedCount, group: name, action };
  },
};
