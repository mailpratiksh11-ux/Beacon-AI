import { Component, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { ToastService } from '../core/toast.service';
import { AuthShell } from '../shared/auth-shell';
import { OauthButtons } from '../shared/oauth-buttons';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink, AuthShell, OauthButtons],
  template: `
    <app-auth-shell
      pill="Trusted by marketers, recruiters &amp; job seekers"
      title="Welcome back"
      subtitle="Sign in to reach the right people.">

      <form (ngSubmit)="submit()">
        <div class="auth-field">
          <label for="login-org">Organization <span class="auth-opt">optional</span></label>
          <div class="auth-inp">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 21v-5h6v5"/></svg>
            <input id="login-org" type="text" name="org" placeholder="acme-recruiting"
                   [(ngModel)]="org" (input)="error.set('')" [disabled]="!!busy()" autocomplete="organization" />
          </div>
          <p class="auth-hint">Leave blank for your usual workspace.</p>
        </div>

        <div class="auth-field">
          <label for="login-email">Email address</label>
          <div class="auth-inp" [class.bad]="error()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="3"/><path d="m3 6 9 7 9-7"/></svg>
            <input id="login-email" type="email" name="email" placeholder="you@company.com"
                   [(ngModel)]="email" (input)="error.set('')" [disabled]="!!busy()" autocomplete="email" />
          </div>
        </div>

        <div class="auth-field">
          <div class="auth-rowlab">
            <label for="login-password">Password</label>
            <a routerLink="/forgot-password">Forgot password?</a>
          </div>
          <div class="auth-inp" [class.bad]="error()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <input id="login-password" [type]="showPw() ? 'text' : 'password'" name="password" placeholder="••••••••"
                   [(ngModel)]="password" (input)="error.set('')" [disabled]="!!busy()" autocomplete="current-password" />
            <button type="button" class="auth-eye" (click)="showPw.set(!showPw())" [attr.aria-label]="showPw() ? 'Hide password' : 'Show password'">
              @if (showPw()) {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c6.5 0 10 7 10 7a13.2 13.2 0 0 1-1.67 2.68"/><path d="M6.1 6.1A13.5 13.5 0 0 0 2 12s3.5 7 10 7a9.1 9.1 0 0 0 5.9-2.1"/><path d="m2 2 20 20"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>
              } @else {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
              }
            </button>
          </div>
        </div>

        @if (error()) {
          <div class="auth-err" role="alert">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
            {{ error() }}
          </div>
        }

        <button type="submit" class="auth-btn" [disabled]="!!busy()">
          @if (busy() === 'email') { <span class="auth-spin"></span> }
          @else {
            Log in
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          }
        </button>
      </form>

      <app-oauth-buttons [busy]="busy()" verb="Continue" (google)="google()" (microsoft)="microsoft()" />

      <ng-container footer>
        New to Beacon? <a routerLink="/register">Create an account</a>
      </ng-container>
    </app-auth-shell>
  `,
})
export class Login implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);
  private destroyRef = inject(DestroyRef);

  email = '';
  org = '';
  password = '';
  busy = signal<'' | 'email' | 'google' | 'microsoft'>('');
  showPw = signal(false);
  error = signal('');

  ngOnInit() {
    // Clicking a provider navigates the whole page away, so nothing here ever
    // clears busy. Returning with the browser's Back button restores this page
    // from the bfcache with busy still 'google' or 'microsoft' — the spinner
    // keeps turning and every field stays disabled, so the user is locked out
    // of a form that looks fine. A bfcache restore fires no lifecycle hook and
    // no load event; pageshow with persisted=true is the only signal for it.
    const onShow = (e: PageTransitionEvent) => { if (e.persisted) this.busy.set(''); };
    window.addEventListener('pageshow', onShow);
    this.destroyRef.onDestroy(() => window.removeEventListener('pageshow', onShow));

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
    // Inline as well as toasted: the redirect back can outlive a toast.
    this.error.set(message);
    this.toast.error(`${provider} sign-in`, message);
  }

  submit() {
    const email = this.email.trim();
    this.error.set('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { this.error.set('Please enter a valid email address.'); return; }
    if (!this.password) { this.error.set('Please enter your password.'); return; }
    this.busy.set('email');
    this.auth.login(email, this.password, this.org.trim()).subscribe({
      next: () => { this.toast.success('Signed in', 'Welcome back to Beacon AI.'); this.router.navigateByUrl('/home'); },
      error: (e) => { this.busy.set(''); this.error.set(e?.error?.message || 'Incorrect email or password.'); },
    });
  }

  google() { this.busy.set('google'); this.auth.startGoogleLogin(); }
  microsoft() { this.busy.set('microsoft'); this.auth.startMicrosoftLogin(); }
}
