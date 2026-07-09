import { Campaign } from '../models/campaign.model.js';
import { Email } from '../models/email.model.js';
import { ApiError } from '../utils/ApiError.js';

export const campaignService = {
  async list(userId, { status, search, page = 1, limit = 20 }) {
    const filter = { userId };
    if (status && status !== 'all') filter.status = status;
    if (search) filter.name = { $regex: search, $options: 'i' };

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Campaign.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Campaign.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  },

  async getById(userId, id) {
    const campaign = await Campaign.findOne({ id, userId });
    if (!campaign) throw ApiError.notFound('Campaign not found');
    return campaign;
  },

  async create(userId, payload) {
    const recipients = Array.isArray(payload.recipients) ? payload.recipients : [];
    const total = recipients.length || payload.total || 0;
    return Campaign.create({ ...payload, userId, total });
  },

  async update(userId, id, payload) {
    const patch = { ...payload };
    if (Array.isArray(payload.recipients)) patch.total = payload.recipients.length;
    const campaign = await Campaign.findOneAndUpdate({ id, userId }, patch, { new: true, runValidators: true });
    if (!campaign) throw ApiError.notFound('Campaign not found');
    return campaign;
  },

  // Recipients not yet delivered for this campaign (used to send / resume)
  async getPending(userId, id) {
    const campaign = await this.getById(userId, id);
    const done = await Email.find({ userId, campaignId: id, status: { $in: ['delivered', 'opened'] } }).distinct('recipient');
    const doneSet = new Set(done.map((e) => String(e).toLowerCase()));
    const pending = (campaign.recipients || []).filter((r) => !doneSet.has(String(r.email || '').toLowerCase()));
    return { campaign, pending, sentCount: doneSet.size, total: (campaign.recipients || []).length };
  },

  // Bump the delivered counter and status after a send
  async recordSend(userId, id, delivered) {
    const campaign = await Campaign.findOne({ id, userId });
    if (!campaign) return;
    if (delivered) campaign.sent = Math.min((campaign.sent || 0) + 1, campaign.total || 999999);
    campaign.status = campaign.sent >= (campaign.total || 0) && campaign.total > 0 ? 'sent' : 'sending';
    await campaign.save();
  },

  async remove(userId, id) {
    const campaign = await Campaign.findOneAndDelete({ id, userId });
    if (!campaign) throw ApiError.notFound('Campaign not found');
    return campaign;
  },

  async duplicate(userId, id) {
    const original = await this.getById(userId, id);
    const clone = original.toObject();
    delete clone._id; delete clone.id; delete clone.createdAt; delete clone.updatedAt;
    clone.name = `${clone.name} (Copy)`;
    clone.status = 'draft';
    clone.sent = 0;
    return Campaign.create({ ...clone, userId });
  },
};
