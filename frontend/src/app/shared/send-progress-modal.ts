import { Component, EventEmitter, Input, Output } from '@angular/core';
import { LucideAngularModule, Pause, Play, X, CheckCircle2, Loader2, Send } from 'lucide-angular';

export interface SendProgress {
  total: number;
  sent: number;
  failed: number;
  current: string;
  paused: boolean;
  done: boolean;
  etaSeconds: number;
}

@Component({
  selector: 'app-send-progress-modal',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    @if (state) {
      <div class="fixed inset-0 z-[95] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in"></div>
        <div class="card relative w-full max-w-lg p-6 sm:p-7 animate-scale-in">
          <!-- header -->
          <div class="flex items-center gap-3">
            <div class="h-11 w-11 rounded-xl flex items-center justify-center shrink-0"
                 [class]="state.done ? 'bg-success-50 dark:bg-success-500/10' : 'bg-brand-50 dark:bg-brand-500/10'">
              @if (state.done) { <lucide-icon [img]="Check" [size]="22" class="text-success-500" /> }
              @else { <lucide-icon [img]="SendIcon" [size]="20" class="text-brand-500" /> }
            </div>
            <div class="flex-1">
              <h3 class="font-semibold text-slate-900 dark:text-white">
                {{ state.done ? 'Campaign complete' : (state.paused ? 'Campaign paused' : 'Sending campaign…') }}
              </h3>
              <p class="text-xs text-slate-400 mt-0.5">
                {{ state.done ? 'All emails have been processed.' : 'Delivering personalized emails via Gmail.' }}
              </p>
            </div>
            @if (state.done) {
              <button class="btn-icon" (click)="close.emit()" aria-label="Close"><lucide-icon [img]="XIcon" [size]="18" /></button>
            }
          </div>

          <!-- progress bar -->
          <div class="mt-6">
            <div class="flex items-center justify-between text-sm mb-2">
              <span class="font-medium text-slate-700 dark:text-slate-200">Campaign Progress</span>
              <span class="tabular-nums font-semibold text-slate-900 dark:text-white">{{ pct }}%</span>
            </div>
            <div class="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div class="h-full rounded-full transition-all duration-300 ease-out"
                   [class]="state.done ? 'bg-success-500' : 'bg-brand-500'"
                   [style.width.%]="pct"></div>
            </div>
          </div>

          <!-- stats -->
          <div class="grid grid-cols-3 gap-3 mt-5">
            <div class="rounded-xl bg-success-50 dark:bg-success-500/10 p-3 text-center">
              <p class="text-lg font-bold text-success-600 dark:text-success-400 tabular-nums">{{ state.sent }}</p>
              <p class="text-xs text-success-700/70 dark:text-success-400/70">Sent</p>
            </div>
            <div class="rounded-xl bg-red-50 dark:bg-red-500/10 p-3 text-center">
              <p class="text-lg font-bold text-red-600 dark:text-red-400 tabular-nums">{{ state.failed }}</p>
              <p class="text-xs text-red-700/70 dark:text-red-400/70">Failed</p>
            </div>
            <div class="rounded-xl bg-slate-50 dark:bg-slate-800 p-3 text-center">
              <p class="text-lg font-bold text-slate-700 dark:text-slate-200 tabular-nums">{{ remaining }}</p>
              <p class="text-xs text-slate-400">Remaining</p>
            </div>
          </div>

          <!-- current recipient / ETA -->
          @if (!state.done) {
            <div class="mt-5 flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-3">
              <div class="flex items-center gap-2.5 min-w-0">
                @if (!state.paused) { <lucide-icon [img]="Spinner" [size]="16" class="text-brand-500 animate-spin shrink-0" /> }
                <div class="min-w-0">
                  <p class="text-xs text-slate-400">Current recipient</p>
                  <p class="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{{ state.current || '—' }}</p>
                </div>
              </div>
              <div class="text-right shrink-0 ml-3">
                <p class="text-xs text-slate-400">Est. time left</p>
                <p class="text-sm font-medium text-slate-700 dark:text-slate-200 tabular-nums">{{ eta }}</p>
              </div>
            </div>
          }

          <!-- actions -->
          <div class="flex items-center justify-end gap-2 mt-6">
            @if (state.done) {
              <button class="btn-primary" (click)="close.emit()">Done</button>
            } @else {
              <button class="btn-secondary text-red-600 dark:text-red-400" (click)="cancel.emit()">
                <lucide-icon [img]="XIcon" [size]="16" /> Cancel
              </button>
              @if (state.paused) {
                <button class="btn-primary" (click)="resume.emit()"><lucide-icon [img]="PlayIcon" [size]="16" /> Resume</button>
              } @else {
                <button class="btn-secondary" (click)="pause.emit()"><lucide-icon [img]="PauseIcon" [size]="16" /> Pause</button>
              }
            }
          </div>
        </div>
      </div>
    }
  `,
})
export class SendProgressModal {
  @Input() state: SendProgress | null = null;
  @Output() pause = new EventEmitter<void>();
  @Output() resume = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();

  readonly PauseIcon = Pause; readonly PlayIcon = Play; readonly XIcon = X;
  readonly Check = CheckCircle2; readonly Spinner = Loader2; readonly SendIcon = Send;

  get pct() {
    if (!this.state) return 0;
    return Math.round(((this.state.sent + this.state.failed) / this.state.total) * 100);
  }
  get remaining() {
    if (!this.state) return 0;
    return this.state.total - this.state.sent - this.state.failed;
  }
  get eta() {
    if (!this.state) return '—';
    const s = this.state.etaSeconds;
    if (s <= 0) return 'Almost done';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  }
}
