import { Template } from '../models/template.model.js';
import { ApiError } from '../utils/ApiError.js';

export const templateService = {
  async list(userId, { category, search } = {}) {
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
