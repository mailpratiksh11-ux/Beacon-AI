import { Component, inject } from '@angular/core';
import { LucideAngularModule, CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-angular';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <div class="fixed bottom-5 right-5 z-[100] flex flex-col gap-3 w-[calc(100vw-2.5rem)] max-w-sm">
      @for (t of toast.toasts(); track t.id) {
        <div class="card p-4 shadow-pop flex items-start gap-3 animate-slide-in-right">
          <div class="mt-0.5 shrink-0">
            @switch (t.type) {
              @case ('success') { <lucide-icon [img]="Check" class="text-success-500" [size]="20" /> }
              @case ('error') { <lucide-icon [img]="XCircleIcon" class="text-red-500" [size]="20" /> }
              @case ('warning') { <lucide-icon [img]="Warn" class="text-amber-500" [size]="20" /> }
              @default { <lucide-icon [img]="InfoIcon" class="text-brand-500" [size]="20" /> }
            }
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-slate-900 dark:text-slate-100">{{ t.title }}</p>
            @if (t.message) { <p class="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{{ t.message }}</p> }
          </div>
          <button class="btn-icon h-7 w-7 shrink-0" (click)="toast.dismiss(t.id)" aria-label="Dismiss">
            <lucide-icon [img]="XIcon" [size]="16" />
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastContainer {
  toast = inject(ToastService);
  readonly Check = CheckCircle2;
  readonly XCircleIcon = XCircle;
  readonly InfoIcon = Info;
  readonly Warn = AlertTriangle;
  readonly XIcon = X;
}
