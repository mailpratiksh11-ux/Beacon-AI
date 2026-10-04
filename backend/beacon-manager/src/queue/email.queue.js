import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { randomUUID } from 'crypto';
import { env } from '../config/env.js';

// BullMQ-backed bulk email queue. Requires Redis; degrades to "unavailable"
// (the client then falls back to an inline send) when Redis isn't reachable.
const QUEUE_NAME = 'email-send';
const DAY = 60 * 60 * 24;

let connection = null;
let queue = null;
let available = false;

const batchKey = (id) => `send:batch:${id}`;
const ctlKey = (id) => `send:ctl:${id}`;

export const emailQueue = {
  async init() {
    if (!env.redisUrl) { console.log('· BullMQ disabled (no REDIS_URL)'); return false; }
    try {
      connection = new IORedis(env.redisUrl, {
        maxRetriesPerRequest: null,
        enableReadyCheck: true,
        lazyConnect: true,
        retryStrategy: (t) => (t > 3 ? null : 500),
      });
      await connection.connect();
      await connection.ping();
      queue = new Queue(QUEUE_NAME, { connection });
      available = true;
      console.log('✔ BullMQ email queue ready');
    } catch (e) {
      available = false;
      console.warn(`⚠ BullMQ unavailable (${e.message}) — bulk sends will run inline`);
    }
    return available;
  },

  name: QUEUE_NAME,
  isAvailable: () => available,
  connection: () => connection,

  // Enqueue a batch. `data` = { subject, html, campaign, campaignId, attachmentIds, recipients[], delayMs }
  // `scheduleDelayMs` > 0 holds the whole batch as a BullMQ delayed job until its send time.
  async enqueue(userId, data, { scheduleDelayMs = 0, scheduledFor = '' } = {}) {
    if (!available) throw new Error('Queue unavailable');
    const batchId = randomUUID();
    const total = data.recipients.length;
    const scheduled = scheduleDelayMs > 0;
    // Keep batch meta alive for the whole wait plus a day of history afterwards.
    const ttl = DAY + Math.ceil(scheduleDelayMs / 1000);
    await connection.hset(batchKey(batchId), {
      userId, total, sent: 0, failed: 0, cursor: 0,
      status: scheduled ? 'scheduled' : 'running',
      campaign: data.campaign || 'Campaign',
      scheduledFor: scheduled ? scheduledFor : '',
    });
    await connection.expire(batchKey(batchId), ttl);
    await connection.set(ctlKey(batchId), 'running', 'EX', ttl);
    await queue.add('batch', { userId, batchId, ...data }, {
      jobId: batchId,
      delay: scheduled ? scheduleDelayMs : undefined,
      removeOnComplete: true,
      removeOnFail: 50,
    });
    return { batchId, total, scheduledFor: scheduled ? scheduledFor : undefined };
  },

  /**
   * Re-arm a batch that stopped early (daily cap) for a later time.
   *
   * Uses a fresh jobId rather than the original: the current job is still active
   * inside the processor at this point, so re-adding its own id would collide.
   * Batch meta — including `cursor` — lives in Redis under batchId, so the new
   * job resumes exactly where this one stopped.
   */
  async resumeAt(batchId, data, delayMs) {
    if (!available) return false;
    const ttl = DAY + Math.ceil(delayMs / 1000);
    await connection.expire(batchKey(batchId), ttl);
    await connection.expire(ctlKey(batchId), ttl);
    await queue.add('batch', { ...data, batchId }, {
      jobId: `${batchId}:${Date.now()}`,
      delay: delayMs,
      removeOnComplete: true,
      removeOnFail: 50,
    });
    return true;
  },

  async setControl(userId, batchId, state) {
    const meta = await this.getBatch(batchId);
    if (!meta || meta.userId !== userId) return null; // ownership check
    await connection.set(ctlKey(batchId), state, 'EX', DAY);
    const status = state === 'cancelled' ? 'cancelled' : state === 'paused' ? 'paused' : 'running';
    await connection.hset(batchKey(batchId), 'status', status);
    // Cancelling a scheduled batch that hasn't fired yet: remove the delayed job outright
    // so nothing runs at send time (the control flag alone would only abort it on wake).
    if (state === 'cancelled') {
      try {
        const job = await queue.getJob(batchId);
        if (job && (await job.getState()) === 'delayed') await job.remove();
      } catch { /* job may already be active/gone — the control flag covers that */ }
    }
    return this.getBatch(batchId);
  },

  async getControl(batchId) {
    if (!connection) return 'cancelled';
    return (await connection.get(ctlKey(batchId))) || 'cancelled';
  },

  async getBatch(batchId) {
    if (!connection) return null;
    const h = await connection.hgetall(batchKey(batchId));
    if (!h || !h.total) return null;
    return {
      batchId, userId: h.userId, total: +h.total, sent: +h.sent, failed: +h.failed,
      cursor: +h.cursor, status: h.status, campaign: h.campaign,
      scheduledFor: h.scheduledFor || undefined,
    };
  },

  async setProgress(batchId, fields) {
    if (!connection) return;
    await connection.hset(batchKey(batchId), fields);
  },
};
