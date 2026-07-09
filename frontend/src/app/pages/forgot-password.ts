import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, Mail, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-angular';
import { AuthService } from '../core/auth.service';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center px-5 py-10 bg-slate-50 dark:bg-slate-950">
      <div class="w-full max-w-sm animate-slide-up">
        <a routerLink="/login" class="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 mb-6">
          <lucide-icon [img]="Back" [size]="16" /> Back to login
        </a>

        @if (!sent()) {
          <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Forgot password?</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1.5">Enter your email and we'll send you a reset link.</p>
          <form (ngSubmit)="submit()" class="mt-7">
            <label class="label">Email address</label>
            <div class="relative">
              <lucide-icon [img]="MailIcon" [size]="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="email" class="input pl-9" placeholder="you@company.com" [(ngModel)]="email" name="email" autocomplete="email" [disabled]="busy()" required />
            </div>
            <button type="submit" class="btn-primary w-full mt-4 py-3" [disabled]="busy()">
              @if (busy()) { <lucide-icon [img]="Spinner" [size]="18" class="animate-spin" /> }
              @else { Send reset link }
            </button>
          </form>
        } @else {
          <div class="text-center">
            <div class="h-12 w-12 mx-auto rounded-full bg-success-50 dark:bg-success-500/10 flex items-center justify-center mb-4">
              <lucide-icon [img]="Check" [size]="24" class="text-success-500" />
            </div>
            <h1 class="text-xl font-bold text-slate-900 dark:text-white">Check your email</h1>
            <p class="text-sm text-slate-500 dark:text-slate-400 mt-2">If an account exists for <span class="font-medium">{{ email }}</span>, a reset link is on its way.</p>
            @if (previewUrl()) {
              <div class="mt-4 rounded-lg bg-brand-50 dark:bg-brand-500/10 border border-brand-200 dark:border-brand-500/20 px-3 py-2.5 text-xs text-brand-700 dark:text-brand-400">
                Test mode — open your reset link here:
                <a [href]="previewUrl()" target="_blank" rel="noopener" class="font-medium underline block mt-1 break-all">View reset email</a>
              </div>
            }
            <a routerLink="/login" class="btn-secondary w-full mt-5">Back to login</a>
          </div>
        }
      </div>
    </div>
  `,
})
export class ForgotPassword {
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  email = '';
  busy = signal(false);
  sent = signal(false);
  previewUrl = signal<string | null>(null);

  submit() {
    const email = this.email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { this.toast.error('Invalid email', 'Enter a valid email address.'); return; }
    this.busy.set(true);
    this.auth.forgotPassword(email).subscribe({
      next: (r) => { this.busy.set(false); this.sent.set(true); this.previewUrl.set(r.previewUrl); },
      error: (e) => { this.busy.set(false); this.toast.error('Request failed', e?.error?.message || 'Could not send reset link.'); },
    });
  }

  readonly MailIcon = Mail; readonly Back = ArrowLeft; readonly Spinner = Loader2; readonly Check = CheckCircle2;
}
