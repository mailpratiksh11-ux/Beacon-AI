import { Contact } from '../models/contact.model.js';
import { ApiError } from '../utils/ApiError.js';

// Build the mongo query for a set of contact filters. Shared by list and
// bulkRemove so "delete all matching" can never target a wider set than the
// rows the same filters just showed.
// `emails` / `excludeEmails` are resolved from send history by the controller.
function buildFilter(userId, { status, search, favorite, group, emails, excludeEmails } = {}) {
  const filter = { userId };
  if (status && status !== 'all') filter.status = status;
  if (favorite === 'true' || favorite === true) filter.favorite = true;
  if (group && group !== 'all') filter.groups = group;
  // An empty `emails` list means "no contact qualifies", not "no filter".
  if (Array.isArray(emails)) filter.email = { $in: emails };
  else if (Array.isArray(excludeEmails) && excludeEmails.length) filter.email = { $nin: excludeEmails };
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { company: { $regex: search, $options: 'i' } },
    ];
  }
  return filter;
}

export const contactService = {
  async list(userId, { page = 1, limit = 50, ...filters }) {
    const filter = buildFilter(userId, filters);
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

  // Import contacts, optionally tagging every one of them with `groups`.
  // Re-importing an existing contact refreshes its details but only ever adds
  // group tags — the groups it already belongs to are never dropped.
  async bulkCreate(userId, rows, groups = []) {
    const tags = [...new Set((Array.isArray(groups) ? groups : [groups]).map((g) => String(g || '').trim()).filter(Boolean))];
    const ops = rows.map((r) => {
      // `groups` is owned by $addToSet below; letting it through $set too would
      // both clobber existing tags and conflict on the same path.
      const { groups: _ignored, userId: _uid, id: _id, ...fields } = r;
      const update = { $set: { ...fields, userId } };
      if (tags.length) update.$addToSet = { groups: { $each: tags } };
      return {
        updateOne: {
          filter: { userId, email: String(r.email).toLowerCase() },
          update,
          upsert: true,
        },
      };
    });
    const result = await Contact.bulkWrite(ops, { ordered: false });
    return { inserted: result.upsertedCount, updated: result.modifiedCount, groups: tags };
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

  // Delete many contacts: either an explicit list of ids, or every contact
  // matching `filters` (what the caller currently has on screen).
  // `all` must be passed deliberately — it is the only way to delete by filter.
  async bulkRemove(userId, { contactIds, all = false, filters } = {}) {
    let query;
    if (all) {
      query = buildFilter(userId, filters);
    } else {
      if (!Array.isArray(contactIds) || contactIds.length === 0) throw ApiError.badRequest('Select at least one contact');
      query = { userId, id: { $in: contactIds } };
    }
    const res = await Contact.deleteMany(query);
    return { deleted: res.deletedCount || 0 };
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
