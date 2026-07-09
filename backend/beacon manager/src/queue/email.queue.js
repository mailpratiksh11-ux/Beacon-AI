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
  async enqueue(userId, data) {
    if (!available) throw new Error('Queue unavailable');
    const batchId = randomUUID();
    const total = data.recipients.length;
    await connection.hset(batchKey(batchId), {
      userId, total, sent: 0, failed: 0, cursor: 0, status: 'running',
      campaign: data.campaign || 'Campaign',
    });
    await connection.expire(batchKey(batchId), DAY);
    await connection.set(ctlKey(batchId), 'running', 'EX', DAY);
    await queue.add('batch', { userId, batchId, ...data }, {
      jobId: batchId,
      removeOnComplete: true,
      removeOnFail: 50,
    });
    return { batchId, total };
  },

  async setControl(userId, batchId, state) {
    const meta = await this.getBatch(batchId);
    if (!meta || meta.userId !== userId) return null; // ownership check
    await connection.set(ctlKey(batchId), state, 'EX', DAY);
    const status = state === 'cancelled' ? 'cancelled' : state === 'paused' ? 'paused' : 'running';
    await connection.hset(batchKey(batchId), 'status', status);
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
    };
  },

  async setProgress(batchId, fields) {
    if (!connection) return;
    await connection.hset(batchKey(batchId), fields);
  },
};
