import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  standalone: true,
  template: `
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{{ title }}</h1>
        @if (subtitle) { <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">{{ subtitle }}</p> }
      </div>
      <div class="flex items-center gap-2 shrink-0"><ng-content></ng-content></div>
    </div>
  `,
})
export class PageHeader {
  @Input({ required: true }) title = '';
  @Input() subtitle = '';
}
