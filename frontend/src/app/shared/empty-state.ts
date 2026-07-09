import { Component, Input } from '@angular/core';
import { LucideAngularModule, Inbox } from 'lucide-angular';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <div class="flex flex-col items-center justify-center text-center py-16 px-6 animate-fade-in">
      <div class="relative mb-6">
        <div class="absolute inset-0 blur-2xl bg-brand-500/25 rounded-full animate-glow-pulse"></div>
        <div class="relative h-24 w-24 rounded-3xl flex items-center justify-center
                    bg-gradient-to-br from-slate-50 to-slate-100 dark:from-white/[0.06] dark:to-white/[0.02]
                    border border-slate-200 dark:border-white/10 shadow-card">
          <div class="absolute inset-2 rounded-2xl border border-brand-500/20"></div>
          <lucide-icon [img]="Icon" [size]="36" [strokeWidth]="1.75" class="text-brand-500 relative" />
        </div>
      </div>
      <h3 class="text-base font-semibold text-slate-900 dark:text-white">{{ title }}</h3>
      @if (subtitle) { <p class="text-sm text-slate-500 dark:text-slate-400 mt-1.5 max-w-sm leading-relaxed">{{ subtitle }}</p> }
      <div class="mt-6 flex items-center gap-2.5 flex-wrap justify-center"><ng-content></ng-content></div>
    </div>
  `,
})
export class EmptyState {
  @Input({ required: true }) title = '';
  @Input() subtitle = '';
  @Input() icon: any = Inbox;
  get Icon() { return this.icon; }
}
