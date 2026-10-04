import { Template } from '../models/template.model.js';
import { DEFAULT_TEMPLATES, DEFAULT_KEYS } from '../config/default-templates.js';
import { ApiError } from '../utils/ApiError.js';

export const templateService = {
  // Ensure the built-in default templates exist for this user. Idempotent via
  // $setOnInsert keyed on defaultKey — created once, and the user's own edits are
  // never overwritten on later calls. Keeps defaults "visible to all" users.
  async ensureDefaults(userId) {
    await Promise.all(
      DEFAULT_TEMPLATES.map((t) =>
        Template.updateOne(
          { userId, defaultKey: t.defaultKey },
          { $setOnInsert: { ...t, userId } },
          { upsert: true }
        )
      )
    );

    // Retire built-ins we no longer ship, so changing the starter set actually
    // changes what an existing user sees instead of only affecting new signups.
    //
    // Scoped tightly on purpose. defaultKey is '' for anything the user made,
    // so $nin spares those, and uses: 0 spares any built-in they have actually
    // sent with — at that point it is their template, not ours, and deleting it
    // would destroy work. A retired built-in they edited but never sent is the
    // one case this gets wrong, and it is the acceptable side of the trade.
    await Template.deleteMany({
      userId,
      defaultKey: { $nin: ['', ...DEFAULT_KEYS] },
      uses: 0,
    });
  },

  async list(userId, { category, search } = {}) {
    await this.ensureDefaults(userId);
    const filter = { userId };
    if (category && category !== 'all') filter.category = category;
    if (search) filter.name = { $regex: search, $options: 'i' };
    return Template.find(filter).sort({ updatedAt: -1 });
  },

  async getById(userId, id) {
    const template = await Template.findOne({ id, userId });
    if (!template) throw ApiError.notFound('Template not found');
    return template;
  },

  async create(userId, payload) {
    return Template.create({ ...payload, userId });
  },

  async update(userId, id, payload) {
    const template = await Template.findOneAndUpdate({ id, userId }, payload, { new: true, runValidators: true });
    if (!template) throw ApiError.notFound('Template not found');
    return template;
  },

  async remove(userId, id) {
    const template = await Template.findOneAndDelete({ id, userId });
    if (!template) throw ApiError.notFound('Template not found');
    return template;
  },

  async duplicate(userId, id) {
    const original = await this.getById(userId, id);
    const clone = original.toObject();
    delete clone._id; delete clone.id; delete clone.createdAt; delete clone.updatedAt;
    clone.name = `${clone.name} (Copy)`;
    clone.uses = 0;
    return Template.create({ ...clone, userId });
  },
};
