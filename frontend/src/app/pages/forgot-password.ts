import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { AuthShell } from '../shared/auth-shell';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [FormsModule, RouterLink, AuthShell],
  template: `
    <app-auth-shell
      [title]="sent() ? 'Check your email' : 'Forgot password?'"
      [subtitle]="sent() ? '' : 'Enter your email and we’ll send you a reset link.'"
      backLink="/login" backLabel="Back to login">

      @if (!sent()) {
        <form (ngSubmit)="submit()">
          <div class="auth-field">
            <label for="fp-email">Email address</label>
            <div class="auth-inp" [class.bad]="error()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="3"/><path d="m3 6 9 7 9-7"/></svg>
              <input id="fp-email" type="email" name="email" placeholder="you@company.com"
                     [(ngModel)]="email" (input)="error.set('')" [disabled]="busy()" autocomplete="email" />
            </div>
          </div>
          @if (error()) {
            <div class="auth-err" role="alert">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
              {{ error() }}
            </div>
          }
          <button type="submit" class="auth-btn" [disabled]="busy()">
            @if (busy()) { <span class="auth-spin"></span> }
            @else { Send reset link }
          </button>
        </form>
      } @else {
        <div class="auth-ok">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
          <span>If an account exists for <b>{{ email }}</b>, a reset link is on its way.</span>
        </div>

        @if (previewUrl()) {
          <div class="auth-note">
            Test mode &mdash; open your reset link here:
            <a [href]="previewUrl()" target="_blank" rel="noopener">View reset email</a>
          </div>
        }

        <a routerLink="/login" class="auth-gbtn" style="margin-top:14px">Back to login</a>
      }

      <ng-container footer>
        Remembered it? <a routerLink="/login">Log in</a>
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

}
