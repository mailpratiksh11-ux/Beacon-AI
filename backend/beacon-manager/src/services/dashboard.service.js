import { Campaign } from '../models/campaign.model.js';
import { Email } from '../models/email.model.js';
import { Contact } from '../models/contact.model.js';
import { redis } from '../config/redis.js';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// 'opened' is kept here only because legacy rows carry it and an opened email
// was certainly delivered. There is no open tracking, so it is never reported
// as a metric of its own.
const SENT_STATUSES = ['delivered', 'opened'];

export const RANGES = ['today', 'yesterday', '7d', '30d', '90d', 'all'];
const RANGE_LABELS = {
  today: 'Today',
  yesterday: 'Yesterday',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  all: 'All time',
};

/*
 * Everything below works in UTC on both sides of the query: Mongo's
 * $dateToString defaults to UTC, so bucket keys are built with UTC getters to
 * match. That does mean "today" is the UTC day, not the viewer's — the same
 * caveat as the daily send cap, and worth moving to a per-user timezone if
 * accounts ever span regions.
 */
const startOfUtcDay = (d) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
const p2 = (n) => String(n).padStart(2, '0');
const keyHour = (d) => `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}T${p2(d.getUTCHours())}`;
const keyDay = (d) => `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}`;
const keyMonth = (d) => `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}`;

/** Window + bucket granularity for a range key. */
function windowFor(range) {
  const now = new Date();
  const today = startOfUtcDay(now);
  switch (range) {
    case 'today':
      return { from: today, to: null, gran: 'hour' };
    case 'yesterday': {
      const y = new Date(today); y.setUTCDate(y.getUTCDate() - 1);
      return { from: y, to: today, gran: 'hour' };
    }
    case '7d': {
      const f = new Date(today); f.setUTCDate(f.getUTCDate() - 6);
      return { from: f, to: null, gran: 'day' };
    }
    case '30d': {
      const f = new Date(today); f.setUTCDate(f.getUTCDate() - 29);
      return { from: f, to: null, gran: 'day' };
    }
    case '90d': {
      const f = new Date(today); f.setUTCDate(f.getUTCDate() - 89);
      return { from: f, to: null, gran: 'week' };
    }
    default:
      return { from: null, to: null, gran: 'month' };
  }
}

const MONGO_FORMAT = { hour: '%Y-%m-%dT%H', day: '%Y-%m-%d', week: '%Y-%m-%d', month: '%Y-%m' };

/** The x-axis for a window: ordered, gap-filled buckets. */
function bucketsFor({ from, to, gran }, earliest) {
  const now = new Date();
  const end = to ? new Date(to.getTime() - 1) : now;
  const out = [];

  if (gran === 'hour') {
    for (let i = 0; i < 24; i++) {
      const d = new Date(from); d.setUTCHours(from.getUTCHours() + i);
      if (d > end) break;
      out.push({ keys: [keyHour(d)], label: `${p2(d.getUTCHours())}:00` });
    }
    return out;
  }

  if (gran === 'day') {
    const days = Math.round((startOfUtcDay(end) - startOfUtcDay(from)) / 86400000) + 1;
    for (let i = 0; i < days; i++) {
      const d = new Date(from); d.setUTCDate(from.getUTCDate() + i);
      // A week reads better by weekday; a month needs the date.
      const label = days <= 7 ? WEEKDAYS[d.getUTCDay()] : `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
      out.push({ keys: [keyDay(d)], label });
    }
    return out;
  }

  if (gran === 'week') {
    for (let i = 0; i < 14; i++) {
      const s = new Date(from); s.setUTCDate(from.getUTCDate() + i * 7);
      if (s > end) break;
      const keys = [];
      for (let j = 0; j < 7; j++) { const d = new Date(s); d.setUTCDate(s.getUTCDate() + j); keys.push(keyDay(d)); }
      out.push({ keys, label: `${s.getUTCDate()} ${MONTHS[s.getUTCMonth()]}` });
    }
    return out;
  }

  // month — from the first send, capped at the most recent 24 months
  const thisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const cap = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 23, 1));
  let cursor = earliest ? new Date(Date.UTC(earliest.getUTCFullYear(), earliest.getUTCMonth(), 1)) : thisMonth;
  if (cursor < cap) cursor = cap;
  while (cursor <= thisMonth) {
    out.push({ keys: [keyMonth(cursor)], label: MONTHS[cursor.getUTCMonth()] });
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
  }
  return out;
}

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

  /**
   * Analytics for one time window. `range` is one of RANGES; anything else falls
   * back to all time. Rates, breakdown and series all use the same window, so
   * the page can never show a filtered chart beside unfiltered totals.
   */
  async analytics(userId, range = 'all') {
    const key = RANGES.includes(range) ? range : 'all';
    const win = windowFor(key);

    const match = { userId };
    if (win.from || win.to) {
      match.sentAt = {};
      if (win.from) match.sentAt.$gte = win.from;
      if (win.to) match.sentAt.$lt = win.to;
    }

    const [byStatus, seriesAgg, totalSent, earliestDoc] = await Promise.all([
      Email.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Email.aggregate([
        { $match: match },
        {
          $group: {
            _id: { $dateToString: { format: MONGO_FORMAT[win.gran], date: '$sentAt' } },
            sent: { $sum: { $cond: [{ $in: ['$status', SENT_STATUSES] }, 1, 0] } },
          },
        },
      ]),
      Email.countDocuments(match),
      // Only needed to know where the "all time" axis should start.
      key === 'all' ? Email.findOne({ userId }).sort({ sentAt: 1 }).select('sentAt').lean() : null,
    ]);

    const get = (s) => byStatus.find((x) => x._id === s)?.count || 0;
    // Guard the division only. Previously this fallback leaked into the reported
    // figure, so an account that had sent nothing was shown "1 email sent".
    const denom = totalSent || 1;

    const bySlot = Object.fromEntries(seriesAgg.map((d) => [d._id, d.sent]));
    const series = bucketsFor(win, earliestDoc?.sentAt ? new Date(earliestDoc.sentAt) : null)
      .map((b) => ({ label: b.label, value: b.keys.reduce((sum, k) => sum + (bySlot[k] || 0), 0) }));

    return {
      range: key,
      rangeLabel: RANGE_LABELS[key],
      granularity: win.gran,
      totalSent,
      deliveryRate: Math.round(((get('delivered') + get('opened')) / denom) * 1000) / 10,
      failureRate: Math.round(((get('failed') + get('bounced')) / denom) * 1000) / 10,
      breakdown: byStatus.map((s) => ({ status: s._id, count: s.count })),
      series,
    };
  },
};
