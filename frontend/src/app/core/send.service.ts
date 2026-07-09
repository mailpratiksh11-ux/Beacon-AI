import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';
import { RealtimeService, SendProgressEvent } from './realtime.service';
import { ToastService } from './toast.service';

export interface ActiveBatch {
  batchId: string;
  campaign: string;
  total: number;
  sent: number;
  failed: number;
  status: 'running' | 'paused' | 'complete' | 'cancelled';
  lastTo?: string;
}

type BulkPayload = {
  subject: string; html: string; campaign?: string; campaignId?: string; attachmentIds?: string[];
  delaySeconds?: number;
  recipients: { email: string; name?: string; firstName?: string; lastName?: string; company?: string; position?: string }[];
};

// Tracks the one in-flight background campaign for this user. Progress is pushed by the
// server over Socket.IO, so it keeps updating no matter which page the user is on.
@Injectable({ providedIn: 'root' })
export class SendService {
  private api = inject(ApiService);
  private realtime = inject(RealtimeService);
  private toast = inject(ToastService);

  readonly active = signal<ActiveBatch | null>(null);
  private readonly KEY = 'cm-active-batch';

  constructor() {
    this.realtime.sendProgress.subscribe((e) => this.apply(e));
    this.realtime.sendComplete.subscribe((e) => this.apply(e));
  }

  private apply(e: SendProgressEvent) {
    const a = this.active();
    if (!a || a.batchId !== e.batchId) return;
    this.active.set({ ...a, sent: e.sent, failed: e.failed, total: e.total, status: e.status, campaign: e.campaign, lastTo: e.lastTo ?? a.lastTo });
    if (e.status === 'complete') {
      this.toast.success('Campaign sent', `${e.sent} delivered, ${e.failed} failed.`);
      this.clearPersist();
    } else if (e.status === 'cancelled') {
      this.clearPersist();
    }
  }

  async startBulk(payload: BulkPayload) {
    const res = await firstValueFrom(this.api.sendBulk(payload));
    this.active.set({ batchId: res.batchId, campaign: payload.campaign || 'Campaign', total: res.total, sent: 0, failed: 0, status: 'running' });
    this.persist(res.batchId);
    return res;
  }

  pause() { const a = this.active(); if (!a) return; this.active.set({ ...a, status: 'paused' }); this.api.controlSendBatch(a.batchId, 'pause').subscribe(); }
  resume() { const a = this.active(); if (!a) return; this.active.set({ ...a, status: 'running' }); this.api.controlSendBatch(a.batchId, 'resume').subscribe(); }
  cancel() { const a = this.active(); if (!a) return; this.active.set({ ...a, status: 'cancelled' }); this.api.controlSendBatch(a.batchId, 'cancel').subscribe(); this.clearPersist(); }
  dismiss() { this.active.set(null); this.clearPersist(); }

  // On app load / refresh, re-attach to a campaign that's still running server-side.
  restore() {
    let id: string | null = null;
    try { id = localStorage.getItem(this.KEY); } catch { id = null; }
    if (!id) return;
    this.api.getSendBatch(id).subscribe({
      next: (b) => {
        if (b.status === 'running' || b.status === 'paused') {
          this.active.set({ batchId: b.batchId, campaign: b.campaign, total: b.total, sent: b.sent, failed: b.failed, status: b.status as ActiveBatch['status'] });
        } else { this.clearPersist(); }
      },
      error: () => this.clearPersist(),
    });
  }

  private persist(id: string) { try { localStorage.setItem(this.KEY, id); } catch { /* ignore */ } }
  private clearPersist() { try { localStorage.removeItem(this.KEY); } catch { /* ignore */ } }
}
