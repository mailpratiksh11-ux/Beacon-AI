import { Component, inject, computed } from '@angular/core';
import { LucideAngularModule, Send, Pause, Play, X, CheckCircle2, Loader2 } from 'lucide-angular';
import { SendService } from '../core/send.service';

// Floating, always-visible campaign progress. Lives in the Layout so it persists
// across page navigation while the background worker sends.
@Component({
  selector: 'app-send-progress-widget',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    @if (batch(); as b) {
      <div class="fixed bottom-4 right-4 z-[60] w-[320px] card p-4 shadow-pop animate-slide-up">
        <div class="flex items-center gap-2.5">
          <div class="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
               [class]="b.status === 'complete' ? 'bg-success-500/15' : 'bg-brand-500/15'">
            @if (b.status === 'complete') { <lucide-icon [img]="Done" [size]="18" class="text-success-500" /> }
            @else if (b.status === 'paused') { <lucide-icon [img]="PauseIcon" [size]="18" class="text-amber-500" /> }
            @else if (b.status === 'cancelled') { <lucide-icon [img]="XIcon" [size]="18" class="text-red-500" /> }
            @else { <lucide-icon [img]="Spinner" [size]="18" class="text-brand-500 animate-spin" /> }
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold text-slate-900 dark:text-white truncate">{{ b.campaign }}</p>
            <p class="text-xs text-slate-400">{{ statusLabel() }}</p>
          </div>
          @if (b.status === 'complete' || b.status === 'cancelled') {
            <button class="btn-icon h-8 w-8" (click)="send.dismiss()" title="Dismiss"><lucide-icon [img]="XIcon" [size]="15" /></button>
          }
        </div>

        <!-- Progress bar -->
        <div class="mt-3">
          <div class="h-2 rounded-full bg-slate-100 dark:bg-white/[0.06] overflow-hidden">
            <div class="h-full rounded-full transition-all duration-300"
                 [class]="b.status === 'complete' ? 'bg-success-500' : b.status === 'cancelled' ? 'bg-red-500' : 'bg-brand-500'"
                 [style.width.%]="pct()"></div>
          </div>
          <div class="flex items-center justify-between mt-1.5 text-xs tabular-nums">
            <span class="text-slate-500 dark:text-slate-400">{{ b.sent + b.failed }} / {{ b.total }}</span>
            <span class="text-slate-400">
              <span class="text-success-500">{{ b.sent }} sent</span>
              @if (b.failed) { · <span class="text-red-500">{{ b.failed }} failed</span> }
            </span>
          </div>
        </div>

        <!-- Controls (while sending) -->
        @if (b.status === 'running' || b.status === 'paused') {
          <div class="flex items-center gap-2 mt-3">
            @if (b.status === 'running') {
              <button class="btn-secondary flex-1 py-1.5 text-sm" (click)="send.pause()"><lucide-icon [img]="PauseIcon" [size]="14" /> Pause</button>
            } @else {
              <button class="btn-primary flex-1 py-1.5 text-sm" (click)="send.resume()"><lucide-icon [img]="PlayIcon" [size]="14" /> Resume</button>
            }
            <button class="btn-secondary py-1.5 px-3 text-sm hover:text-red-500" (click)="send.cancel()">Stop</button>
          </div>
        }
      </div>
    }
  `,
})
export class SendProgressWidget {
  send = inject(SendService);
  batch = this.send.active;

  pct = computed(() => {
    const b = this.batch();
    if (!b || !b.total) return 0;
    return Math.min(100, Math.round(((b.sent + b.failed) / b.total) * 100));
  });

  statusLabel = computed(() => {
    const b = this.batch();
    if (!b) return '';
    if (b.status === 'complete') return 'Completed';
    if (b.status === 'cancelled') return 'Stopped';
    if (b.status === 'paused') return 'Paused';
    return b.lastTo ? `Sending… ${b.lastTo}` : 'Sending…';
  });

  readonly Done = CheckCircle2; readonly Spinner = Loader2; readonly PauseIcon = Pause;
  readonly PlayIcon = Play; readonly XIcon = X; readonly SendIcon = Send;
}
