import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, AlertCircle } from 'lucide-angular';
import { LogoMark } from './logo-mark';

/**
 * Shared frame for every auth screen (login, register, forgot, reset).
 *
 * Exists because the four pages had drifted badly apart: login was a bespoke
 * 286-line page with its own CSS, while the others were bare forms — and two of
 * them showed no logo at all. Anything common to the flow belongs here so they
 * cannot diverge again.
 */
@Component({
  selector: 'app-auth-shell',
  standalone: true,
  imports: [RouterLink, LucideAngularModule, LogoMark],
  template: `
    <div class="min-h-screen flex items-center justify-center px-5 py-10 bg-slate-50 dark:bg-slate-950">
      <div class="w-full max-w-[400px] animate-slide-up">

        @if (backLink) {
          <a [routerLink]="backLink" class="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 mb-6">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>
            {{ backLabel }}
          </a>
        }

        <!-- Brand lockup: the real mark, on every screen in the flow -->
        <a routerLink="/login" class="inline-flex items-center gap-2.5 mb-8" aria-label="Beacon AI">
          <app-logo-mark [size]="36" />
          <span class="font-display font-bold text-lg text-slate-900 dark:text-white leading-none">Beacon</span>
          <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-400 leading-none">AI</span>
        </a>

        <h1 class="text-2xl font-bold text-slate-900 dark:text-white">{{ title }}</h1>
        @if (subtitle) {
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1.5">{{ subtitle }}</p>
        }

        @if (error) {
          <div class="mt-5 flex items-start gap-2.5 rounded-xl border border-red-200 dark:border-red-500/25 bg-red-50 dark:bg-red-500/10 px-3.5 py-3 text-sm text-red-700 dark:text-red-400" role="alert">
            <lucide-icon [img]="AlertIcon" [size]="16" class="shrink-0 mt-0.5" />
            <span>{{ error }}</span>
          </div>
        }

        <div class="mt-6">
          <ng-content></ng-content>
        </div>

        <div class="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          <ng-content select="[footer]"></ng-content>
        </div>
      </div>
    </div>
  `,
})
export class AuthShell {
  @Input() title = '';
  @Input() subtitle = '';
  /** Inline validation / server error. Shown above the form so it can't be missed. */
  @Input() error = '';
  @Input() backLink = '';
  @Input() backLabel = 'Back';

  readonly AlertIcon = AlertCircle;
}
