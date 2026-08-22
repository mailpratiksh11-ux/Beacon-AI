import { Component, Input } from '@angular/core';
import { LucideAngularModule, Inbox } from 'lucide-angular';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <div class="flex flex-col items-center justify-center text-center py-16 px-6 animate-fade-in">
      <div class="mb-6">
        <div class="h-16 w-16 rounded-2xl flex items-center justify-center
                    bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/10">
          <lucide-icon [img]="Icon" [size]="26" [strokeWidth]="1.75" class="text-brand-500" />
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
