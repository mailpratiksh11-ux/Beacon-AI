import { Injectable, inject, signal, computed } from '@angular/core';
import { RealtimeService } from './realtime.service';

export interface AppNotification {
  id: string;
  title: string;
  ts: number; // epoch ms
  kind: 'success' | 'error' | 'info';
  read: boolean;
}

const KEY = 'cm-notifications';
const MAX = 30;

// Real notifications, built from live Socket.IO events (campaign finished, send failed, …).
// Persisted to localStorage so they survive a refresh.
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private realtime = inject(RealtimeService);

  readonly items = signal<AppNotification[]>(this.restore());
  readonly unread = computed(() => this.items().filter((n) => !n.read).length);

  constructor() {
    // A finished background campaign
    this.realtime.sendComplete.subscribe((e) => {
      if (e.status === 'cancelled') {
        this.add('info', `Campaign “${e.campaign}” stopped, ${e.sent} sent`);
      } else {
        this.add('success', `Campaign “${e.campaign}” finished, ${e.sent} sent${e.failed ? `, ${e.failed} failed` : ''}`);
      }
    });
    // A bounced / failed delivery
    this.realtime.emailSent.subscribe((e) => {
      if (e.status !== 'delivered') this.add('error', `Email to ${e.to} ${e.status === 'bounced' ? 'bounced' : 'failed'}`);
    });
  }

  add(kind: AppNotification['kind'], title: string) {
    const n: AppNotification = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, title, ts: Date.now(), kind, read: false };
    this.items.update((list) => [n, ...list].slice(0, MAX));
    this.persist();
  }

  markAllRead() {
    this.items.update((list) => list.map((n) => ({ ...n, read: true })));
    this.persist();
  }

  clear() { this.items.set([]); this.persist(); }

  dotClass(kind: AppNotification['kind']) {
    return kind === 'success' ? 'bg-success-500' : kind === 'error' ? 'bg-red-500' : 'bg-brand-500';
  }

  // "just now", "5 min ago", "2 h ago", "3 d ago"
  ago(ts: number) {
    const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)} min ago`;
    if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
    return `${Math.floor(s / 86400)} d ago`;
  }

  private restore(): AppNotification[] {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
  }
  private persist() {
    try { localStorage.setItem(KEY, JSON.stringify(this.items())); } catch { /* ignore */ }
  }
}
