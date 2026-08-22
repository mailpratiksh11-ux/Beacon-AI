import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { ToastService } from '../core/toast.service';
import { AuthShell } from '../shared/auth-shell';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [FormsModule, RouterLink, AuthShell],
  template: `
    <app-auth-shell title="Set a new password" subtitle="Choose a new password for your account.">
      @if (!token) {
        <div class="auth-err" style="margin-top:0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
          <span>This reset link is missing its token. Request a new one from <a routerLink="/forgot-password">Forgot password</a>.</span>
        </div>
      } @else {
        <form (ngSubmit)="submit()">
          <div class="auth-field">
            <label for="rp-password">New password</label>
            <div class="auth-inp" [class.bad]="error()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <input id="rp-password" [type]="showPw() ? 'text' : 'password'" name="password" placeholder="At least 6 characters"
                     [(ngModel)]="password" (input)="error.set('')" [disabled]="busy()" autocomplete="new-password" />
              <button type="button" class="auth-eye" (click)="showPw.set(!showPw())" [attr.aria-label]="showPw() ? 'Hide password' : 'Show password'">
                @if (showPw()) {
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c6.5 0 10 7 10 7a13.2 13.2 0 0 1-1.67 2.68"/><path d="M6.1 6.1A13.5 13.5 0 0 0 2 12s3.5 7 10 7a9.1 9.1 0 0 0 5.9-2.1"/><path d="m2 2 20 20"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>
                } @else {
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                }
              </button>
            </div>
          </div>

          <div class="auth-field">
            <label for="rp-confirm">Confirm password</label>
            <div class="auth-inp" [class.bad]="error()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <input id="rp-confirm" [type]="showPw() ? 'text' : 'password'" name="confirm" placeholder="Re-enter password"
                     [(ngModel)]="confirm" (input)="error.set('')" [disabled]="busy()" autocomplete="new-password" />
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
            @else { Update password }
          </button>
        </form>
      }

      <ng-container footer>
        <a routerLink="/login">Back to login</a>
      </ng-container>
    </app-auth-shell>
  `,
})
export class ResetPassword implements OnInit {
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toast = inject(ToastService);

  token = '';
  password = '';
  confirm = '';
  busy = signal(false);
  showPw = signal(false);
  error = signal('');

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
  }

  submit() {
    this.error.set('');
    if (this.password.length < 6) { this.error.set('Password must be at least 6 characters.'); return; }
    if (this.password !== this.confirm) { this.error.set('Those passwords don’t match.'); return; }
    this.busy.set(true);
    this.auth.resetPassword(this.token, this.password).subscribe({
      next: () => { this.toast.success('Password updated', 'You’re now signed in.'); this.router.navigateByUrl('/home'); },
      error: (e) => { this.busy.set(false); this.error.set(e?.error?.message || 'This link may have expired.'); },
    });
  }
}
