import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, Mail, Loader2, CheckCircle2 } from 'lucide-angular';
import { AuthService } from '../core/auth.service';
import { AuthShell } from '../shared/auth-shell';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, RouterLink, AuthShell],
  template: `
    <app-auth-shell
      [title]="sent() ? 'Check your email' : 'Forgot password?'"
      [subtitle]="sent() ? '' : 'Enter your email and we’ll send you a reset link.'"
      [error]="error()"
      backLink="/login" backLabel="Back to login">

      @if (!sent()) {
        <form (ngSubmit)="submit()">
          <label class="label" for="fp-email">Email address</label>
          <div class="relative">
            <lucide-icon [img]="MailIcon" [size]="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input id="fp-email" type="email" name="email" class="input pl-10" placeholder="you@company.com"
                   [(ngModel)]="email" (input)="error.set('')" [disabled]="busy()" autocomplete="email" required />
          </div>
          <button type="submit" class="btn-primary w-full mt-4 py-3" [disabled]="busy()">
            @if (busy()) { <lucide-icon [img]="Spinner" [size]="18" class="animate-spin" /> }
            @else { Send reset link }
          </button>
        </form>
      } @else {
        <div class="flex items-start gap-3 rounded-xl border border-success-500/25 bg-success-500/[0.07] px-4 py-3.5">
          <lucide-icon [img]="Check" [size]="18" class="text-success-500 shrink-0 mt-0.5" />
          <p class="text-sm text-slate-600 dark:text-slate-300">
            If an account exists for <span class="font-medium text-slate-900 dark:text-white">{{ email }}</span>, a reset link is on its way.
          </p>
        </div>

        @if (previewUrl()) {
          <div class="mt-3 rounded-xl border border-brand-200 dark:border-brand-500/25 bg-brand-50 dark:bg-brand-500/10 px-3.5 py-3 text-xs text-brand-700 dark:text-brand-400">
            Test mode — open your reset link here:
            <a [href]="previewUrl()" target="_blank" rel="noopener" class="font-medium underline block mt-1 break-all">View reset email</a>
          </div>
        }

        <a routerLink="/login" class="btn-secondary w-full mt-4 py-3">Back to login</a>
      }

      <ng-container footer>
        Remembered it? <a routerLink="/login" class="font-medium text-brand-600 dark:text-brand-400 hover:underline">Log in</a>
      </ng-container>
    </app-auth-shell>
  `,
})
export class ForgotPassword {
  private auth = inject(AuthService);

  email = '';
  busy = signal(false);
  sent = signal(false);
  error = signal('');
  previewUrl = signal<string | null>(null);

  submit() {
    const email = this.email.trim();
    this.error.set('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { this.error.set('Please enter a valid email address.'); return; }
    this.busy.set(true);
    this.auth.forgotPassword(email).subscribe({
      next: (r) => { this.busy.set(false); this.sent.set(true); this.previewUrl.set(r.previewUrl); },
      error: (e) => { this.busy.set(false); this.error.set(e?.error?.message || 'Could not send the reset link.'); },
    });
  }

  readonly MailIcon = Mail; readonly Spinner = Loader2; readonly Check = CheckCircle2;
}
