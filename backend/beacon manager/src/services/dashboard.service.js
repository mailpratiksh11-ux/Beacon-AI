import { Campaign } from '../models/campaign.model.js';
import { Email } from '../models/email.model.js';
import { Contact } from '../models/contact.model.js';
import { redis } from '../config/redis.js';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const SENT_STATUSES = ['delivered', 'opened'];

export const dashboardService = {
  async getStats(userId) {
    // Serve from Redis when warm (busted on every send); recompute + cache otherwise.
    const cacheKey = `stats:${userId}`;
    const cached = await redis.cacheGet(cacheKey);
    if (cached) return cached;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [sentToday, pending, failed, totalContacts, activeCampaigns] = await Promise.all([
      Email.countDocuments({ userId, status: { $in: SENT_STATUSES }, sentAt: { $gte: startOfDay } }),
      Email.countDocuments({ userId, status: 'pending' }),
      Email.countDocuments({ userId, status: { $in: ['failed', 'bounced'] } }),
      Contact.countDocuments({ userId }),
      Campaign.countDocuments({ userId, status: { $in: ['sending', 'scheduled'] } }),
    ]);

    const stats = { sentToday, pending, failed, totalContacts, activeCampaigns, gmailConnected: true };
    await redis.cacheSet(cacheKey, stats, 30); // 30s TTL
    return stats;
  },

  async recentCampaigns(userId, limit = 6) {
    return Campaign.find({ userId }).sort({ createdAt: -1 }).limit(limit);
  },

  async analytics(userId) {
    const now = new Date();
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - 6); weekStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [byStatus, weeklyAgg, monthlyAgg, topCampaigns, totalSent] = await Promise.all([
      Email.aggregate([{ $match: { userId } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Email.aggregate([
        { $match: { userId, sentAt: { $gte: weekStart } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$sentAt' } }, count: { $sum: 1 } } },
      ]),
      Email.aggregate([
        { $match: { userId, sentAt: { $gte: monthStart } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$sentAt' } },
            sent: { $sum: { $cond: [{ $in: ['$status', SENT_STATUSES] }, 1, 0] } },
            opened: { $sum: { $cond: [{ $eq: ['$status', 'opened'] }, 1, 0] } },
          },
        },
      ]),
      Campaign.find({ userId, openRate: { $gt: 0 } }).sort({ openRate: -1 }).limit(4),
      Email.countDocuments({ userId }),
    ]);

    const total = totalSent || 1;
    const get = (s) => byStatus.find((x) => x._id === s)?.count || 0;

    const weeklyMap = Object.fromEntries(weeklyAgg.map((d) => [d._id, d.count]));
    const weekly = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart); d.setDate(weekStart.getDate() + i);
      weekly.push({ label: WEEKDAYS[d.getDay()], value: weeklyMap[d.toISOString().slice(0, 10)] || 0 });
    }

    const monthlyMap = Object.fromEntries(monthlyAgg.map((m) => [m._id, m]));
    const monthly = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const entry = monthlyMap[key];
      monthly.push({ label: MONTHS[d.getMonth()], sent: entry?.sent || 0, opened: entry?.opened || 0 });
    }

    return {
      totalSent: total,
      deliveryRate: Math.round(((get('delivered') + get('opened')) / total) * 1000) / 10,
      failureRate: Math.round(((get('failed') + get('bounced')) / total) * 1000) / 10,
      openRate: Math.round((get('opened') / total) * 1000) / 10,
      breakdown: byStatus.map((s) => ({ status: s._id, count: s.count })),
      weekly,
      monthly,
      topCampaigns: topCampaigns.map((c) => ({ name: c.name, rate: c.openRate })),
    };
  },
};
