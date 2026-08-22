import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { LucideAngularModule, Mail, Lock, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-angular';
import { AuthService } from '../core/auth.service';
import { ToastService } from '../core/toast.service';
import { AuthShell } from '../shared/auth-shell';
import { OauthButtons } from '../shared/oauth-buttons';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink, LucideAngularModule, AuthShell, OauthButtons],
  template: `
    <app-auth-shell title="Welcome back" subtitle="Sign in to reach the right people." [error]="error()">
      <form (ngSubmit)="submit()" class="space-y-4">
        <div>
          <label class="label" for="login-email">Email address</label>
          <div class="relative">
            <lucide-icon [img]="MailIcon" [size]="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input id="login-email" type="email" name="email" class="input pl-10" placeholder="you@company.com"
                   [(ngModel)]="email" (input)="error.set('')" [disabled]="!!busy()" autocomplete="email" />
          </div>
        </div>

        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="label mb-0" for="login-password">Password</label>
            <a routerLink="/forgot-password" class="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline">Forgot password?</a>
          </div>
          <div class="relative">
            <lucide-icon [img]="LockIcon" [size]="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input id="login-password" [type]="showPw() ? 'text' : 'password'" name="password" class="input pl-10 pr-10"
                   placeholder="Your password" [(ngModel)]="password" (input)="error.set('')" [disabled]="!!busy()" autocomplete="current-password" />
            <button type="button" (click)="showPw.set(!showPw())"
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    [attr.aria-label]="showPw() ? 'Hide password' : 'Show password'">
              <lucide-icon [img]="showPw() ? EyeOffIcon : EyeIcon" [size]="16" />
            </button>
          </div>
        </div>

        <button type="submit" class="btn-primary w-full py-3" [disabled]="!!busy()">
          @if (busy() === 'email') { <lucide-icon [img]="Spinner" [size]="18" class="animate-spin" /> }
          @else { Log in <lucide-icon [img]="Arrow" [size]="16" /> }
        </button>
      </form>

      <app-oauth-buttons [busy]="busy()" verb="Continue" (google)="google()" (microsoft)="microsoft()" />

      <ng-container footer>
        New to Beacon? <a routerLink="/register" class="font-medium text-brand-600 dark:text-brand-400 hover:underline">Create an account</a>
      </ng-container>
    </app-auth-shell>
  `,
})
export class Login implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);

  email = '';
  password = '';
  busy = signal<'' | 'email' | 'google' | 'microsoft'>('');
  showPw = signal(false);
  error = signal('');

  ngOnInit() {
    const err = this.route.snapshot.queryParamMap.get('error');
    if (!err) return;
    const messages: Record<string, string> = {
      google_not_configured: 'Google sign-in isn’t set up on the server yet. Use email, or add Google OAuth credentials.',
      google_denied: 'Google sign-in was cancelled.',
      google_failed: 'Google sign-in failed. Please try again.',
      microsoft_not_configured: 'Microsoft sign-in isn’t set up on the server yet. Use email or Google, or add Microsoft OAuth credentials.',
      microsoft_denied: 'Microsoft sign-in was cancelled.',
      microsoft_failed: 'Microsoft sign-in failed. Please try again.',
    };
    const provider = err.startsWith('microsoft') ? 'Microsoft' : 'Google';
    const message = messages[err] || `Could not sign in with ${provider}.`;
    // Shown inline as well as toasted: the redirect back can outlive a toast.
    this.error.set(message);
    this.toast.error(`${provider} sign-in`, message);
  }

  submit() {
    const email = this.email.trim();
    this.error.set('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { this.error.set('Please enter a valid email address.'); return; }
    if (!this.password) { this.error.set('Please enter your password.'); return; }
    this.busy.set('email');
    this.auth.login(email, this.password).subscribe({
      next: () => { this.toast.success('Signed in', 'Welcome back to Beacon AI.'); this.router.navigateByUrl('/home'); },
      error: (e) => { this.busy.set(''); this.error.set(e?.error?.message || 'Incorrect email or password.'); },
    });
  }

  google() { this.busy.set('google'); this.auth.startGoogleLogin(); }
  microsoft() { this.busy.set('microsoft'); this.auth.startMicrosoftLogin(); }

  readonly MailIcon = Mail; readonly LockIcon = Lock; readonly Arrow = ArrowRight;
  readonly Spinner = Loader2; readonly EyeIcon = Eye; readonly EyeOffIcon = EyeOff;
}
