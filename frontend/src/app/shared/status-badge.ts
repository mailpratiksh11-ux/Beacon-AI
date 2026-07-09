import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  template: `<span [class]="cls">
    <span class="h-1.5 w-1.5 rounded-full" [class]="dot"></span>{{ label }}
  </span>`,
})
export class StatusBadge {
  @Input({ required: true }) status = '';

  private map: Record<string, { cls: string; dot: string; label: string }> = {
    sent: { cls: 'badge-success', dot: 'bg-success-500', label: 'Sent' },
    delivered: { cls: 'badge-success', dot: 'bg-success-500', label: 'Delivered' },
    opened: { cls: 'badge-info', dot: 'bg-brand-500', label: 'Opened' },
    active: { cls: 'badge-success', dot: 'bg-success-500', label: 'Active' },
    sending: { cls: 'badge-info', dot: 'bg-brand-500 animate-pulse', label: 'Sending' },
    scheduled: { cls: 'badge-warn', dot: 'bg-amber-500', label: 'Scheduled' },
    pending: { cls: 'badge-warn', dot: 'bg-amber-500', label: 'Pending' },
    draft: { cls: 'badge-neutral', dot: 'bg-slate-400', label: 'Draft' },
    paused: { cls: 'badge-neutral', dot: 'bg-slate-400', label: 'Paused' },
    failed: { cls: 'badge-danger', dot: 'bg-red-500', label: 'Failed' },
    bounced: { cls: 'badge-danger', dot: 'bg-red-500', label: 'Bounced' },
    unsubscribed: { cls: 'badge-neutral', dot: 'bg-slate-400', label: 'Unsubscribed' },
  };

  get entry() { return this.map[this.status] ?? { cls: 'badge-neutral', dot: 'bg-slate-400', label: this.status }; }
  get cls() { return this.entry.cls; }
  get dot() { return this.entry.dot; }
  get label() { return this.entry.label; }
}
