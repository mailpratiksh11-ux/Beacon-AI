import { Component, inject, computed, signal, HostListener } from '@angular/core';
import { LucideAngularModule, Send, Pause, Play, X, CheckCircle2, Loader2, GripVertical, Clock } from 'lucide-angular';
import { SendService } from '../core/send.service';

// Floating, always-visible campaign progress. Lives in the Layout so it persists
// across page navigation while the background worker sends. Draggable (position saved).
@Component({
  selector: 'app-send-progress-widget',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    @if (batch(); as b) {
      <div data-widget class="fixed z-[60] w-[320px] card p-4 shadow-pop animate-slide-up"
           [class.bottom-4]="!pos()" [class.right-4]="!pos()"
           [style.left.px]="pos()?.left ?? null" [style.top.px]="pos()?.top ?? null">
        <!-- Drag handle (header) -->
        <div class="flex items-center gap-2.5 cursor-grab active:cursor-grabbing select-none touch-none"
             (pointerdown)="startDrag($event)" title="Drag to move">
          <div class="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
               [class]="b.status === 'complete' ? 'bg-success-500/15' : 'bg-brand-500/15'">
            @if (b.status === 'complete') { <lucide-icon [img]="Done" [size]="18" class="text-success-500" /> }
            @else if (b.status === 'paused') { <lucide-icon [img]="PauseIcon" [size]="18" class="text-amber-500" /> }
            @else if (b.status === 'cancelled') { <lucide-icon [img]="XIcon" [size]="18" class="text-red-500" /> }
            @else if (b.status === 'scheduled') { <lucide-icon [img]="ClockIcon" [size]="18" class="text-brand-500" /> }
            @else { <lucide-icon [img]="Spinner" [size]="18" class="text-brand-500 animate-spin" /> }
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold text-slate-900 dark:text-white truncate">{{ b.campaign }}</p>
            <p class="text-xs text-slate-400 truncate">{{ statusLabel() }}</p>
          </div>
          <lucide-icon [img]="Grip" [size]="15" class="text-slate-300 dark:text-slate-600 shrink-0" />
          @if (b.status === 'complete' || b.status === 'cancelled') {
            <button class="btn-icon h-8 w-8" (pointerdown)="$event.stopPropagation()" (click)="send.dismiss()" title="Dismiss"><lucide-icon [img]="XIcon" [size]="15" /></button>
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

        <!-- Controls (while sending / scheduled) -->
        @if (b.status === 'running' || b.status === 'paused') {
          <div class="flex items-center gap-2 mt-3">
            @if (b.status === 'running') {
              <button class="btn-secondary flex-1 py-1.5 text-sm" (click)="send.pause()"><lucide-icon [img]="PauseIcon" [size]="14" /> Pause</button>
            } @else {
              <button class="btn-primary flex-1 py-1.5 text-sm" (click)="send.resume()"><lucide-icon [img]="PlayIcon" [size]="14" /> Resume</button>
            }
            <button class="btn-secondary py-1.5 px-3 text-sm hover:text-red-500" (click)="send.cancel()">Stop</button>
          </div>
        } @else if (b.status === 'scheduled') {
          <div class="flex items-center gap-2 mt-3">
            <button class="btn-secondary flex-1 py-1.5 text-sm hover:text-red-500" (click)="send.cancel()"><lucide-icon [img]="XIcon" [size]="14" /> Cancel schedule</button>
          </div>
        }
      </div>
    }
  `,
})
export class SendProgressWidget {
  send = inject(SendService);
  batch = this.send.active;

  pos = signal<{ left: number; top: number } | null>(this.restore());
  private dragging = false;
  private offX = 0;
  private offY = 0;
  private el: HTMLElement | null = null;

  startDrag(e: PointerEvent) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const card = (e.currentTarget as HTMLElement).closest('[data-widget]') as HTMLElement | null;
    if (!card) return;
    this.el = card;
    const r = card.getBoundingClientRect();
    this.offX = e.clientX - r.left;
    this.offY = e.clientY - r.top;
    this.pos.set({ left: r.left, top: r.top }); // switch from bottom/right to explicit
    this.dragging = true;
    e.preventDefault();
  }

  @HostListener('window:pointermove', ['$event'])
  onMove(e: PointerEvent) {
    if (!this.dragging || !this.el) return;
    const r = this.el.getBoundingClientRect();
    const w = r.width || 320;
    const h = r.height || 180;
    const left = Math.max(8, Math.min(e.clientX - this.offX, window.innerWidth - w - 8));
    const top = Math.max(8, Math.min(e.clientY - this.offY, window.innerHeight - h - 8));
    this.pos.set({ left, top });
  }

  @HostListener('window:pointerup')
  onUp() {
    if (!this.dragging) return;
    this.dragging = false;
    try { localStorage.setItem('cm-widget-pos', JSON.stringify(this.pos())); } catch { /* ignore */ }
  }

  private restore(): { left: number; top: number } | null {
    try {
      const v = JSON.parse(localStorage.getItem('cm-widget-pos') || 'null');
      if (!v || typeof v.left !== 'number') return null;
      // Clamp into the current viewport in case it was resized.
      return {
        left: Math.max(8, Math.min(v.left, window.innerWidth - 328)),
        top: Math.max(8, Math.min(v.top, window.innerHeight - 120)),
      };
    } catch { return null; }
  }

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
    if (b.status === 'scheduled') {
      const when = b.scheduledFor
        ? new Date(b.scheduledFor).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        : 'later';
      return `Scheduled, sends ${when}`;
    }
    return b.lastTo ? `Sending… ${b.lastTo}` : 'Sending…';
  });

  readonly Done = CheckCircle2; readonly Spinner = Loader2; readonly PauseIcon = Pause;
  readonly PlayIcon = Play; readonly XIcon = X; readonly SendIcon = Send; readonly Grip = GripVertical;
  readonly ClockIcon = Clock;
}
