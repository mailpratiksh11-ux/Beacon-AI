import { Worker } from 'bullmq';
import { emailQueue } from './email.queue.js';
import { sendService } from '../services/send.service.js';
import { emitToUser } from '../realtime/socket.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Same {{token}} substitution the Compose editor uses, applied per recipient server-side.
function personalize(text, r) {
  return String(text || '')
    .replace(/\{\{firstName\}\}/g, r.firstName || '')
    .replace(/\{\{lastName\}\}/g, r.lastName || '')
    .replace(/\{\{company\}\}/g, r.company || '')
    .replace(/\{\{position\}\}/g, r.position || '')
    .replace(/\{\{name\}\}/g, r.name || '')
    .replace(/\{\{email\}\}/g, r.email || '');
}

let worker = null;

export function startEmailWorker() {
  if (!emailQueue.isAvailable() || worker) return worker;
  const connection = emailQueue.connection();

  worker = new Worker(
    emailQueue.name,
    async (job) => {
      const { userId, batchId, subject, html, campaign, campaignId, attachmentIds, recipients, delayMs } = job.data;
      const total = recipients.length;
      const meta = (await emailQueue.getBatch(batchId)) || { sent: 0, failed: 0, cursor: 0 };
      let sent = meta.sent;
      let failed = meta.failed;

      const emit = (status, extra = {}) =>
        emitToUser(userId, status === 'complete' || status === 'cancelled' ? 'send:complete' : 'send:progress',
          { batchId, sent, failed, total, status, campaign, ...extra });

      // A scheduled batch has just reached its send time — mark it live before the first send.
      if (meta.status === 'scheduled') {
        await emailQueue.setProgress(batchId, { status: 'running' });
        emit('running');
      }

      for (let i = meta.cursor; i < total; i++) {
        // Respect pause / cancel control flag between every send.
        let ctl = await emailQueue.getControl(batchId);
        let waited = 0;
        while (ctl === 'paused' && waited < 30 * 60 * 1000) {
          emit('paused');
          await sleep(1000);
          waited += 1000;
          ctl = await emailQueue.getControl(batchId);
        }
        if (ctl === 'cancelled') { await emailQueue.setProgress(batchId, { status: 'cancelled' }); emit('cancelled'); return; }

        const r = recipients[i];
        const res = await sendService.sendOne(userId, {
          to: r.email,
          name: r.name || '',
          subject: personalize(subject, r) || '(no subject)',
          html: personalize(html, r),
          campaign,
          campaignId,
          attachmentIds,
        });
        if (res.status === 'delivered') sent++; else failed++;

        await emailQueue.setProgress(batchId, { sent, failed, cursor: i + 1, status: 'running' });
        await job.updateProgress(Math.round(((i + 1) / total) * 100));
        emit('running', { lastTo: r.email });

        if (i < total - 1 && delayMs > 0) await sleep(delayMs);
      }

      await emailQueue.setProgress(batchId, { status: 'complete' });
      emit('complete');
    },
    { connection, concurrency: 3 }
  );

  worker.on('failed', (job, err) => console.error('send job failed:', job?.id, err?.message));
  console.log('✔ BullMQ email worker started');
  return worker;
}
